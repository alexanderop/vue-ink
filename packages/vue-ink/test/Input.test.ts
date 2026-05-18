import { describe, it, expect, vi } from "vitest";
import { Writable } from "node:stream";
import { createInputManager, type Key } from "../../renderer/src/input.ts";
import { createFakeStdin } from "./helpers.ts";

const makeStdout = (): NodeJS.WriteStream & { writes: string[] } => {
  const writes: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      writes.push(chunk.toString("utf8"));
      cb();
    },
  }) as Writable & { writes: string[]; isTTY: boolean; columns: number };
  stream.writes = writes;
  stream.isTTY = false;
  stream.columns = 80;
  return stream as unknown as NodeJS.WriteStream & { writes: string[] };
};

const mkMgr = (
  opts: { exitOnCtrlC?: boolean; isTTY?: boolean; supportsRawMode?: boolean } = {},
) => {
  const stdin = createFakeStdin({
    isTTY: opts.isTTY,
    supportsRawMode: opts.supportsRawMode,
  });
  const stdout = makeStdout();
  const onCtrlC = vi.fn();
  const mgr = createInputManager({
    stdin,
    stdout,
    exitOnCtrlC: opts.exitOnCtrlC ?? false,
    onCtrlC,
  });
  const events: Array<{ input: string; key: Key }> = [];
  const pastes: string[] = [];
  mgr.emitter.on("input", (input: string, key: Key) => events.push({ input, key }));
  mgr.emitter.on("paste", (text: string) => pastes.push(text));
  return { stdin, stdout, mgr, onCtrlC, events, pastes };
};

describe("createInputManager — raw mode support", () => {
  it("reports isRawModeSupported=false when stdin is not a TTY", () => {
    const { mgr } = mkMgr({ isTTY: false });
    expect(mgr.isRawModeSupported).toBe(false);
    mgr.destroy();
  });

  it("reports isRawModeSupported=false when setRawMode is missing", () => {
    const { mgr } = mkMgr({ isTTY: true, supportsRawMode: false });
    expect(mgr.isRawModeSupported).toBe(false);
    mgr.destroy();
  });

  it("throws when setRawMode is called on unsupported stdin", () => {
    const { mgr } = mkMgr({ isTTY: false });
    expect(() => mgr.setRawMode(true)).toThrow(/Raw mode is not supported/);
    mgr.destroy();
  });

  it("reference-counts setRawMode so concurrent users do not flap the TTY", () => {
    const { stdin, mgr } = mkMgr();
    const spy = stdin.setRawMode as unknown as ReturnType<typeof vi.fn>;

    mgr.setRawMode(true);
    mgr.setRawMode(true);
    expect(spy.mock.calls.filter((c) => c[0] === true).length).toBe(1);

    mgr.setRawMode(false);
    expect(spy.mock.calls.filter((c) => c[0] === false).length).toBe(0);

    mgr.setRawMode(false);
    expect(spy.mock.calls.filter((c) => c[0] === false).length).toBe(1);
    mgr.destroy();
  });

  it("destroy() turns off raw mode if it was on", () => {
    const { stdin, mgr } = mkMgr();
    mgr.setRawMode(true);
    mgr.destroy();
    const spy = stdin.setRawMode as unknown as ReturnType<typeof vi.fn>;
    expect(spy.mock.calls.some((c) => c[0] === false)).toBe(true);
  });
});

describe("createInputManager — key parsing from raw bytes", () => {
  it("parses printable letters", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("a");
    stdin.emitData("B");
    expect(events.map((e) => e.input)).toEqual(["a", "B"]);
    expect(events[1]!.key.shift).toBe(true);
    mgr.destroy();
  });

  it("parses arrow keys with empty input and the right Key fields", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\x1b[A");
    stdin.emitData("\x1b[B");
    stdin.emitData("\x1b[C");
    stdin.emitData("\x1b[D");
    expect(events.map((e) => e.input)).toEqual(["", "", "", ""]);
    expect(events[0]!.key.upArrow).toBe(true);
    expect(events[1]!.key.downArrow).toBe(true);
    expect(events[2]!.key.rightArrow).toBe(true);
    expect(events[3]!.key.leftArrow).toBe(true);
    mgr.destroy();
  });

  it("parses Escape+f as a single meta+f event", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\x1bf");
    expect(events).toHaveLength(1);
    expect(events[0]!.key.meta).toBe(true);
    expect(events[0]!.input).toBe("f");
    mgr.destroy();
  });

  it("parses Shift+Tab as tab+shift", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\x1b[Z");
    expect(events).toHaveLength(1);
    expect(events[0]!.key.tab).toBe(true);
    expect(events[0]!.key.shift).toBe(true);
    expect(events[0]!.input).toBe("");
    mgr.destroy();
  });

  it("parses ctrl+letter with the letter as input", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\x01");
    expect(events.at(-1)!.input).toBe("a");
    expect(events.at(-1)!.key.ctrl).toBe(true);
    mgr.destroy();
  });

  it("delivers multi-byte unicode (emoji) as a single key event", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("😀");
    expect(events).toHaveLength(1);
    expect(events[0]!.input).toBe("😀");
    mgr.destroy();
  });

  it("parses return / tab / backspace / escape / delete / home / end / pageup / pagedown", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\r");
    stdin.emitData("\t");
    stdin.emitData("\x7f");
    stdin.emitData("\x1b"); // bare escape — wait for the timer
    // Flush escape by destroying via a separate call. Instead use vi.useFakeTimers.
    mgr.destroy();
    // Re-create for the rest since we destroyed.
    const second = mkMgr();
    second.mgr.setRawMode(true);
    second.stdin.emitData("\x1b[3~"); // delete
    second.stdin.emitData("\x1b[H"); // home
    second.stdin.emitData("\x1b[F"); // end
    second.stdin.emitData("\x1b[5~"); // pageup
    second.stdin.emitData("\x1b[6~"); // pagedown

    expect(events[0]!.key.return).toBe(true);
    expect(events[1]!.key.tab).toBe(true);
    expect(events[2]!.key.backspace).toBe(true);

    expect(second.events[0]!.key.delete).toBe(true);
    expect(second.events[1]!.key.home).toBe(true);
    expect(second.events[2]!.key.end).toBe(true);
    expect(second.events[3]!.key.pageUp).toBe(true);
    expect(second.events[4]!.key.pageDown).toBe(true);
    second.mgr.destroy();
  });

  it("extends Key with kitty fields (super/hyper/capsLock/numLock/eventType)", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    // kitty CSI-u: codepoint 97 ('a'), modifiers super=8 → wire=9, eventType=3 (release)
    stdin.emitData("\x1b[97;9:3u");
    const { key } = events.at(-1)!;
    expect(key.super).toBe(true);
    expect(key.eventType).toBe("release");
    mgr.destroy();
  });

  it("kitty ctrl+letter delivers letter as input with ctrl=true", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    // Kitty CSI-u: codepoint 1 (Ctrl+A form), modifier=ctrl(4)+1=5 → wire "1;5"
    stdin.emitData("\x1b[1;5u");
    expect(events.at(-1)!.input).toBe("a");
    expect(events.at(-1)!.key.ctrl).toBe(true);
    mgr.destroy();
  });

  it("kitty non-printable key (e.g. caps lock) delivers empty input", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    // codepoint 57358 = capslock
    stdin.emitData("\x1b[57358u");
    expect(events.at(-1)!.input).toBe("");
    mgr.destroy();
  });

  it("defaults kitty fields to false on non-kitty input", () => {
    const { stdin, mgr, events } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("a");
    const { key } = events.at(-1)!;
    expect(key.super).toBe(false);
    expect(key.hyper).toBe(false);
    expect(key.capsLock).toBe(false);
    expect(key.numLock).toBe(false);
    expect(key.eventType).toBeUndefined();
    mgr.destroy();
  });
});

describe("createInputManager — bare escape flushing", () => {
  it("flushes a bare Esc keypress after the timeout", async () => {
    vi.useFakeTimers();
    try {
      const { stdin, mgr, events } = mkMgr();
      mgr.setRawMode(true);
      stdin.emitData("\x1b");
      expect(events).toEqual([]);
      vi.advanceTimersByTime(200);
      expect(events).toHaveLength(1);
      expect(events[0]!.key.escape).toBe(true);
      mgr.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does NOT flush when a full Esc sequence arrives within the window", async () => {
    vi.useFakeTimers();
    try {
      const { stdin, mgr, events } = mkMgr();
      mgr.setRawMode(true);
      stdin.emitData("\x1b");
      vi.advanceTimersByTime(50); // less than ESCAPE_TIMEOUT_MS
      stdin.emitData("[A");
      expect(events).toHaveLength(1);
      expect(events[0]!.key.upArrow).toBe(true);
      mgr.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("createInputManager — ctrl+c handling", () => {
  it("calls onCtrlC and suppresses the input event when exitOnCtrlC is true", () => {
    const { stdin, mgr, onCtrlC, events } = mkMgr({ exitOnCtrlC: true });
    mgr.setRawMode(true);
    stdin.emitData("\x03"); // Ctrl+C
    expect(onCtrlC).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);
    mgr.destroy();
  });

  it("forwards Ctrl+C as input when exitOnCtrlC is false", () => {
    const { stdin, mgr, onCtrlC, events } = mkMgr({ exitOnCtrlC: false });
    mgr.setRawMode(true);
    stdin.emitData("\x03");
    expect(onCtrlC).not.toHaveBeenCalled();
    expect(events.at(-1)!.input).toBe("c");
    expect(events.at(-1)!.key.ctrl).toBe(true);
    mgr.destroy();
  });
});

describe("createInputManager — bracketed paste", () => {
  it('emits one "paste" event for a wrapped paste, zero "input" events', () => {
    const { stdin, mgr, events, pastes } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\x1b[200~hello world\x1b[201~");
    expect(pastes).toEqual(["hello world"]);
    expect(events).toEqual([]);
    mgr.destroy();
  });

  it("handles multi-line paste content", () => {
    const { stdin, mgr, pastes } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("\x1b[200~line1\nline2\nline3\x1b[201~");
    expect(pastes).toEqual(["line1\nline2\nline3"]);
    mgr.destroy();
  });

  it("still emits input events outside the paste markers", () => {
    const { stdin, mgr, events, pastes } = mkMgr();
    mgr.setRawMode(true);
    stdin.emitData("a\x1b[200~b\x1b[201~c");
    expect(pastes).toEqual(["b"]);
    expect(events.map((e) => e.input)).toEqual(["a", "c"]);
    mgr.destroy();
  });

  it("setBracketedPasteMode(true) writes the enable escape, (false) writes the disable escape", () => {
    const { mgr, stdout } = mkMgr();
    const stdoutWrites = (stdout as unknown as { writes: string[] }).writes;
    mgr.setBracketedPasteMode(true);
    expect(stdoutWrites).toContain("\x1b[?2004h");
    mgr.setBracketedPasteMode(false);
    expect(stdoutWrites).toContain("\x1b[?2004l");
    mgr.destroy();
  });

  it("reference-counts setBracketedPasteMode", () => {
    const { mgr, stdout } = mkMgr();
    const stdoutWrites = (stdout as unknown as { writes: string[] }).writes;
    mgr.setBracketedPasteMode(true);
    mgr.setBracketedPasteMode(true);
    // Two enables → one underlying enable escape.
    expect(stdoutWrites.filter((w) => w === "\x1b[?2004h").length).toBe(1);

    mgr.setBracketedPasteMode(false);
    // Still one user — no disable yet.
    expect(stdoutWrites.filter((w) => w === "\x1b[?2004l").length).toBe(0);

    mgr.setBracketedPasteMode(false);
    expect(stdoutWrites.filter((w) => w === "\x1b[?2004l").length).toBe(1);
    mgr.destroy();
  });

  it("destroy() emits the disable escape if paste mode is active", () => {
    const { mgr, stdout } = mkMgr();
    const stdoutWrites = (stdout as unknown as { writes: string[] }).writes;
    mgr.setBracketedPasteMode(true);
    mgr.destroy();
    expect(stdoutWrites).toContain("\x1b[?2004l");
  });
});

const drainMicrotasks = (): Promise<void> =>
  new Promise((resolve) => queueMicrotask(() => resolve()));

describe("createInputManager — bufferInput", () => {
  it("queues bytes received before startListening and replays them once raw mode turns on", async () => {
    const { mgr, events } = mkMgr();
    mgr.bufferInput(Uint8Array.from(Buffer.from("a", "utf8")));
    // Nothing listening yet → no events.
    expect(events).toEqual([]);
    mgr.setRawMode(true);
    // Drain is deferred so listeners attached alongside setRawMode see it.
    await drainMicrotasks();
    expect(events.map((e) => e.input)).toEqual(["a"]);
    mgr.destroy();
  });

  it("feeds bytes straight through the parser when already listening", () => {
    const { mgr, events } = mkMgr();
    mgr.setRawMode(true);
    mgr.bufferInput(Uint8Array.from(Buffer.from("x", "utf8")));
    expect(events.map((e) => e.input)).toEqual(["x"]);
    mgr.destroy();
  });

  it("is a no-op for empty input", async () => {
    const { mgr, events } = mkMgr();
    mgr.bufferInput(new Uint8Array());
    mgr.setRawMode(true);
    await drainMicrotasks();
    expect(events).toEqual([]);
    mgr.destroy();
  });

  it("drops queued bytes on destroy() so a later listener does not get stale input", async () => {
    const stdin = createFakeStdin();
    const stdout = makeStdout();
    const mgr = createInputManager({
      stdin,
      stdout,
      exitOnCtrlC: false,
      onCtrlC: vi.fn(),
    });
    mgr.bufferInput(Uint8Array.from(Buffer.from("z", "utf8")));
    mgr.destroy();
    // Re-subscribe after destroy. The bytes buffered before destroy must
    // not be replayed.
    const seen: string[] = [];
    mgr.emitter.on("input", (input: string) => seen.push(input));
    await drainMicrotasks();
    expect(seen).toEqual([]);
  });
});

describe("input.ts: edge cases", () => {
  // what this catches: the "insert" key (\x1b[2~) is non-printable —
  // the input parser must emit an empty string rather than the raw
  // escape sequence (and must not crash).
  it('emits empty input for "insert" key (non-printable)', () => {
    const stdin = createFakeStdin();
    const events: string[] = [];
    const mgr = createInputManager({
      stdin,
      stdout: makeStdout(),
      exitOnCtrlC: false,
      onCtrlC: () => {},
    });
    mgr.setRawMode(true);
    mgr.emitter.on("input", (input: string) => events.push(input));
    stdin.emitData("\x1b[2~");
    expect(events).toEqual([""]);
    mgr.destroy();
  });
});
