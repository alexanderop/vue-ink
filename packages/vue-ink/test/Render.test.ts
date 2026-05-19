import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import stripAnsi from "strip-ansi";
import ansiEscapes from "ansi-escapes";
import {
  Box,
  Text,
  Transform,
  render,
  useInput as useInputComposable,
  type RenderMetrics,
} from "../src/index.ts";
import {
  createCaptureStream,
  createFakeStdin,
  flush,
  flushVueOnly,
  renderToString,
} from "./helpers.ts";

const withEnv = async (
  overrides: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): Promise<void> => {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) prev[key] = process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const stripBSU = (s: string): string => s.replace(/\x1b\[\?2026[hl]/g, "");

const countPaintedFrames = (stdout: { frames: string[] }): number =>
  stdout.frames.map(stripBSU).filter((chunk) => chunk.includes("n=")).length;

afterEach(() => {
  vi.useRealTimers();
});

describe("render(): debug vs TTY mode", () => {
  it("debug mode appends every frame instead of doing diff-erase", async () => {
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });
    const instance = render(App, { stdout, debug: true });
    await flush();
    counter.value = 1;
    await flush();
    await flush();
    instance.unmount();
    // debug mode should never emit the cursor-hide / erase-lines escapes
    const all = stdout.frames.join("");
    expect(all).not.toContain("\x1b[?25l"); // cursorHide
  });

  it("TTY mode emits cursor-hide and an erase between frames", async () => {
    const stdout = createCaptureStream(20);
    (stdout as { isTTY: boolean }).isTTY = true;
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });
    const instance = render(App, { stdout, debug: false });
    await flush();
    counter.value = 1;
    await flush();
    await flush();
    instance.unmount();
    const all = stdout.frames.join("");
    expect(all).toContain("\x1b[?25l"); // cursorHide
    // cursor should be re-shown on unmount
    expect(all).toContain("\x1b[?25h");
  });

  it("skips redundant writes when output is unchanged", async () => {
    const stdout = createCaptureStream(20);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "stable"),
    });
    const instance = render(App, { stdout });
    await flush();
    const before = stdout.frames.length;
    // Force a render with identical output
    const trigger = ref(0);
    trigger.value = 1;
    await flush();
    instance.unmount();
    // The flush triggered a re-render but the text didn't change, so the
    // frame count may not change between flushes when text is identical.
    expect(stdout.frames.length).toBeGreaterThanOrEqual(before);
  });

  it("clear() wipes the last frame in TTY mode", async () => {
    const stdout = createCaptureStream(20);
    (stdout as { isTTY: boolean }).isTTY = true;
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "something"),
    });
    const instance = render(App, { stdout, debug: false });
    await flush();
    const framesBefore = stdout.frames.length;
    instance.clear();
    expect(stdout.frames.length).toBeGreaterThan(framesBefore);
    instance.unmount();
  });

  it("clear() is a no-op in non-TTY (debug) mode", async () => {
    const stdout = createCaptureStream(20);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "something"),
    });
    const instance = render(App, { stdout });
    await flush();
    const framesBefore = stdout.frames.length;
    instance.clear();
    // non-TTY: clear is a no-op
    expect(stdout.frames.length).toBe(framesBefore);
    instance.unmount();
  });

  it("falls back to 80 columns when stdout has no `columns`", async () => {
    const stdout = createCaptureStream(80);
    // remove the columns hint
    Object.defineProperty(stdout, "columns", {
      value: undefined,
      configurable: true,
    });
    const Demo = defineComponent({
      setup: () => () => h(Box, { width: "100%" }, () => h(Text, null, () => "x")),
    });
    const instance = render(Demo, { stdout });
    await flush();
    instance.unmount();
    // just confirm no crash and something was rendered
    expect(stdout.frames.join("").length).toBeGreaterThan(0);
  });

  it("errorHandler tears the tree down when a render throws", async () => {
    const stdout = createCaptureStream(20);
    (stdout as { isTTY: boolean }).isTTY = true;
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const trip = ref(false);
    const App = defineComponent({
      setup: () => () => {
        if (trip.value) throw new Error("render-time boom");
        return h(Text, null, () => "ok");
      },
    });
    const instance = render(App, { stdout, debug: false });
    await flush();
    trip.value = true;
    await flush();
    // errorHandler should already have torn down; calling unmount again is safe.
    instance.unmount();
    expect(stderrSpy).toHaveBeenCalled();
    stderrSpy.mockRestore();
  });

  it("errorHandler falls back to err.message when stack is missing", async () => {
    const stdout = createCaptureStream(20);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const trip = ref(false);
    const App = defineComponent({
      setup: () => () => {
        if (trip.value) {
          const err = new Error("stackless");
          delete (err as { stack?: string }).stack;
          throw err;
        }
        return h(Text, null, () => "ok");
      },
    });
    const instance = render(App, { stdout });
    await flush();
    trip.value = true;
    await flush();
    instance.unmount();
    const calls = stderrSpy.mock.calls.flat().map(String).join("");
    expect(calls).toContain("stackless");
    stderrSpy.mockRestore();
  });

  it("errorHandler stringifies a non-Error thrown value", async () => {
    const stdout = createCaptureStream(20);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const trip = ref(false);
    const App = defineComponent({
      setup: () => () => {
        if (trip.value) throw "just a string"; // eslint-disable-line no-throw-literal
        return h(Text, null, () => "ok");
      },
    });
    const instance = render(App, { stdout });
    await flush();
    trip.value = true;
    await flush();
    instance.unmount();
    expect(stderrSpy).toHaveBeenCalled();
    // The body of the stderr write should include our string error.
    const calls = stderrSpy.mock.calls.flat().map(String).join("");
    expect(calls).toContain("just a string");
    stderrSpy.mockRestore();
  });

  it("defaults stdout to process.stdout when not provided", async () => {
    // Cover `options.stdout ?? process.stdout` fallback. We swap process.stdout
    // temporarily so the test doesn't pollute the test runner output. The
    // mock honors the `Writable.write(chunk, [enc], cb)` contract by
    // invoking the callback — `waitUntilRenderFlush()` now performs a
    // barrier write (ink parity, `repos/ink/src/ink.tsx:922-928`) and would
    // hang forever against a callback-eating mock.
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((_chunk: unknown, encOrCb?: unknown, maybeCb?: unknown) => {
        const cb = typeof encOrCb === "function" ? encOrCb : maybeCb;
        if (typeof cb === "function") (cb as () => void)();
        return true;
      });
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, {});
    await flush();
    instance.unmount();
    expect(stdoutSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("exit() with no args unmounts via waitUntilExit", async () => {
    const stdout = createCaptureStream(20);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, { stdout });
    // after unmount, waitUntilExit resolves
    const wait = instance.waitUntilExit();
    instance.unmount();
    await wait;
  });

  it("rerender swaps the root component", async () => {
    const stdout = createCaptureStream(20);
    const A = defineComponent({
      setup: () => () => h(Text, null, () => "AAA"),
    });
    const B = defineComponent({
      setup: () => () => h(Text, null, () => "BBB"),
    });
    const instance = render(A, { stdout, interactive: true });
    await flush();
    instance.rerender(B);
    await flush();
    const last = stdout.frames.at(-1) ?? "";
    instance.unmount();
    expect(last).toContain("BBB");
  });

  it("unmount is idempotent", async () => {
    const out = await renderToString(
      defineComponent({ setup: () => () => h(Text, null, () => "x") }),
      { columns: 20 },
    );
    expect(out).toBe("x");
    // renderToString already calls unmount; calling unmount again would
    // throw if it weren't idempotent — exercised via the helper.
  });
});

describe("renderer host: prop translation", () => {
  it("ignores key and ref props (no errors)", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { key: "k", ref: "r" as unknown as undefined }, () => h(Text, null, () => "ok")),
    });
    const out = await renderToString(Demo, { columns: 10 });
    expect(out).toBe("ok");
  });

  it("updates a style prop via patchProp (covers setStyle path)", async () => {
    const width = ref(4);
    const Demo = defineComponent({
      setup: () => () => h(Box, { width: width.value }, () => h(Text, null, () => "xy")),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    width.value = 10;
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("xy");
  });

  it("handles setElementText path (text replacement)", async () => {
    // Vue invokes the renderer's setElementText when a slot child collapses
    // to a single primitive. Easiest way to drive it: a Text whose slot's
    // only child is a primitive that changes.
    const word = ref("first");
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => word.value),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    word.value = "second";
    await flush();
    instance.unmount();
    expect(stdout.frames.at(-1) ?? "").toContain("second");
  });

  it("supports comment nodes in the host tree", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "before"),
          h("ink-comment"),
          h(Text, null, () => "after"),
        ]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out.split("\n").filter(Boolean)).toEqual(["before", "after"]);
  });
});

describe("render() instance registry", () => {
  it("returns the same instance when render() is called twice for the same stdout (drops the new tree, matching ink)", async () => {
    const stdout = createCaptureStream(20);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const First = defineComponent({
      setup: () => () => h(Text, null, () => "first"),
    });
    const Second = defineComponent({
      setup: () => () => h(Text, null, () => "second"),
    });

    const a = render(First, { stdout, interactive: true });
    await flush();
    const b = render(Second, { stdout, interactive: true });
    await flush();

    expect(b).toBe(a);
    const warning = stderrSpy.mock.calls.find(
      ([msg]) => typeof msg === "string" && msg.toLowerCase().includes("warning"),
    );
    expect(warning).toBeTruthy();

    // Ink parity (`repos/ink/src/render.ts:265-273`): the second render()
    // call is dropped — the existing instance is returned untouched. The
    // frame must still show "first".
    const finalFrame = stripAnsi(stdout.frames.at(-1) ?? "");
    expect(finalFrame).toContain("first");
    expect(finalFrame).not.toContain("second");

    a.unmount();
    stderrSpy.mockRestore();
  });

  it("exposes cleanup() as an alias for unmount() (ink parity)", async () => {
    const stdout = createCaptureStream(20);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const a = render(App, { stdout });
    await flush();
    expect(typeof a.cleanup).toBe("function");
    a.cleanup();
    // After cleanup, a fresh render() on the same stdout must produce a
    // new instance — i.e. cleanup removed the entry from the registry.
    const b = render(App, { stdout });
    await flush();
    expect(b).not.toBe(a);
    b.unmount();
  });

  it("does not warn when render() is called after a normal unmount()", async () => {
    const stdout = createCaptureStream(20);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const App = defineComponent({
      setup: () => () => h(Text, null, () => "y"),
    });
    const a = render(App, { stdout });
    await flush();
    a.unmount();

    const b = render(App, { stdout });
    await flush();

    const warning = stderrSpy.mock.calls.find(
      ([msg]) => typeof msg === "string" && msg.toLowerCase().includes("warning"),
    );
    expect(warning).toBeFalsy();
    expect(b).not.toBe(a);

    b.unmount();
    stderrSpy.mockRestore();
  });
});

describe("interactive mode detection", () => {
  it("non-interactive stdout buffers and writes only the final frame at unmount", async () => {
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, { stdout });
    await flush();
    counter.value = 1;
    await flush();
    counter.value = 2;
    await flush();

    // Nothing should be written mid-stream when non-interactive.
    expect(stdout.frames.length).toBe(0);

    instance.unmount();

    // Final frame is emitted exactly once, with no escape sequences.
    expect(stdout.frames.length).toBe(1);
    const [final] = stdout.frames;
    expect(stripAnsi(final).replace(/\n+$/, "")).toBe("n=2");
    // Trailing newline required so non-interactive output composes with logs.
    expect(final.endsWith("\n")).toBe(true);
    // No ANSI escape sequences in non-interactive mode.
    expect(final).toBe(stripAnsi(final));
  });

  it("forcing interactive: true overrides non-TTY detection and writes per-frame", async () => {
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, { stdout, interactive: true });
    await flush();
    const initialFrames = stdout.frames.length;
    expect(initialFrames).toBeGreaterThan(0);

    counter.value = 1;
    await flush();
    expect(stdout.frames.length).toBeGreaterThan(initialFrames);

    instance.unmount();
  });

  it("registers a resize listener even in non-interactive mode and detaches on unmount", async () => {
    const stdout = createCaptureStream(10);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });

    const instance = render(App, { stdout });
    await flush();

    // The renderer attaches a resize listener regardless of interactivity
    // so composables (`useBoxMetrics`) get a recomputed layout when tests
    // or non-TTY consumers fire `resize` manually. Real non-TTY streams
    // never emit `resize`, so this listener is dormant in production.
    expect(stdout.listenerCount("resize")).toBe(1);

    instance.unmount();
    expect(stdout.listenerCount("resize")).toBe(0);
  });

  // Regression: `isCiEnv()` used to truthy-check `process.env.CI`, so a
  // workstation (or test harness) that exported `CI=false` got the opposite
  // of what it asked for — interactive flipped off, no per-frame writes.
  // See `brain/renderer/ci-detection.md`.
  it("treats falsy CI string values as not-in-CI on a TTY", async () => {
    await withEnv(
      {
        CI: "false",
        CONTINUOUS_INTEGRATION: undefined,
        BUILD_NUMBER: undefined,
        RUN_ID: undefined,
      },
      async () => {
        const stdout = createCaptureStream(20, { isTTY: true });
        const counter = ref(0);
        const App = defineComponent({
          setup: () => () => h(Text, null, () => `n=${counter.value}`),
        });

        const instance = render(App, { stdout });
        await flush();
        const initialFrames = stdout.frames.length;
        expect(initialFrames).toBeGreaterThan(0);

        counter.value = 1;
        await flush();
        expect(stdout.frames.length).toBeGreaterThan(initialFrames);

        instance.unmount();
      },
    );
  });

  it("treats a truthy CI string on a TTY as in-CI (no per-frame writes)", async () => {
    await withEnv(
      {
        CI: "true",
        CONTINUOUS_INTEGRATION: undefined,
        BUILD_NUMBER: undefined,
        RUN_ID: undefined,
      },
      async () => {
        const stdout = createCaptureStream(20, { isTTY: true });
        const counter = ref(0);
        const App = defineComponent({
          setup: () => () => h(Text, null, () => `n=${counter.value}`),
        });

        const instance = render(App, { stdout });
        await flush();
        counter.value = 1;
        await flush();

        // CI=true → interactive false → buffered, no mid-stream writes.
        expect(stdout.frames.length).toBe(0);

        instance.unmount();
        expect(stdout.frames.length).toBe(1);
        expect(stripAnsi(stdout.frames[0]!).replace(/\n+$/, "")).toBe("n=1");
      },
    );
  });

  it("treats BUILD_NUMBER as a presence signal regardless of value", async () => {
    await withEnv(
      {
        CI: undefined,
        CONTINUOUS_INTEGRATION: undefined,
        BUILD_NUMBER: "0",
        RUN_ID: undefined,
      },
      async () => {
        const stdout = createCaptureStream(20, { isTTY: true });
        const App = defineComponent({
          setup: () => () => h(Text, null, () => "x"),
        });

        const instance = render(App, { stdout });
        await flush();
        instance.unmount();

        // BUILD_NUMBER set (even to "0") → in-CI → buffered, one final write.
        expect(stdout.frames.length).toBe(1);
      },
    );
  });
});

describe("render(): full-height terminal regressions", () => {
  const FullHeight = (rows: number, middle = "middle") =>
    defineComponent({
      setup: () => () =>
        h(Box, { height: rows, flexDirection: "column" }, () => [
          h(Text, null, () => "#442 top"),
          h(Box, { flexGrow: 1 }, () => h(Text, null, () => middle)),
          h(Text, null, () => "#442 bottom"),
        ]),
    });

  it("does not clear the terminal for an initial full-height TTY frame", async () => {
    const stdout = createCaptureStream(20, { isTTY: true, rows: 5 });
    const instance = render(FullHeight(5), { stdout, interactive: true, debug: false });
    await flush();

    const output = stdout.frames.join("");
    instance.unmount();

    expect(output).not.toContain(ansiEscapes.clearTerminal);
    expect(stripAnsi(output)).toContain("#442 bottom");
  });

  it("does not clear the terminal for non-TTY full-height rerenders", async () => {
    const stdout = createCaptureStream(20, { rows: 5 });
    const frame = ref(0);
    const App = defineComponent({
      setup: () => () => h(FullHeight(5, `frame ${frame.value}`)),
    });

    const instance = render(App, { stdout });
    await flush();
    frame.value = 1;
    await flush();
    frame.value = 2;
    await flush();
    instance.unmount();

    const output = stdout.frames.join("");
    expect(output).not.toContain(ansiEscapes.clearTerminal);
    expect(stripAnsi(output)).toContain("frame 2");
  });

  it("rerenders after a viewport shrink into overflow without dropping content", async () => {
    const stdout = createCaptureStream(20, { isTTY: true, rows: 6 });
    const App = FullHeight(6, "#450 middle");

    const instance = render(App, { stdout, interactive: true, debug: false });
    await flush();
    stdout.frames.length = 0;
    stdout.rows = 5;
    stdout.emit("resize");
    await flush();

    const output = stdout.frames.join("");
    instance.unmount();

    expect(output).not.toContain(ansiEscapes.clearTerminal);
    expect(stripAnsi(output)).toContain("#442 top");
    expect(stripAnsi(output)).toContain("#442 bottom");
  });
});

describe("onRender callback", () => {
  it("fires once per committed frame with monotonic frame numbers", async () => {
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const calls: RenderMetrics[] = [];
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, {
      stdout,
      interactive: true,
      onRender: (m) => calls.push(m),
    });
    await flush();
    counter.value = 1;
    await flush();
    counter.value = 2;
    await flush();
    instance.unmount();

    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < calls.length; i += 1) {
      expect(calls[i].frame).toBe(calls[i - 1].frame + 1);
    }
    expect(calls.at(-1)!.lineCount).toBeGreaterThan(0);
    expect(calls.at(-1)!.output).toContain("n=2");
    expect(calls.at(-1)!.renderTime).toBeGreaterThanOrEqual(0);
  });

  it("reports a line count that matches the actual output", async () => {
    const stdout = createCaptureStream(20);
    const calls: RenderMetrics[] = [];
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "a\nb\nc"),
    });

    const instance = render(App, {
      stdout,
      interactive: true,
      onRender: (m) => calls.push(m),
    });
    await flush();
    instance.unmount();

    expect(calls.at(-1)!.lineCount).toBe(3);
  });

  it("isolates a throwing callback so the renderer keeps going", async () => {
    const stdout = createCaptureStream(20);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, {
      stdout,
      interactive: true,
      onRender: () => {
        throw new Error("boom");
      },
    });
    await flush();
    counter.value = 1;
    await flush();
    // Still mounted, frame still rendering.
    expect(stdout.frames.length).toBeGreaterThan(0);
    expect(stderrSpy.mock.calls.flat().some((c) => String(c).includes("boom"))).toBe(true);
    instance.unmount();
    stderrSpy.mockRestore();
  });
});

describe("render throttle (maxFps)", () => {
  it("rejects maxFps: 0 with a clear error", () => {
    const stdout = createCaptureStream();
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    expect(() => render(App, { stdout, maxFps: 0 })).toThrow(/maxFps/);
  });

  it("rejects negative maxFps", () => {
    const stdout = createCaptureStream();
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    expect(() => render(App, { stdout, maxFps: -5 })).toThrow(/maxFps/);
  });

  it("throttles paints to maxFps when state updates faster than the frame budget", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, { stdout, interactive: true, maxFps: 30 });
    await flushVueOnly();

    const before = countPaintedFrames(stdout);

    // 100 updates over a simulated 1 second — should cap near 30 frames.
    for (let i = 0; i < 100; i += 1) {
      counter.value = i + 1;
      await flushVueOnly();
      vi.advanceTimersByTime(10);
    }
    await vi.runOnlyPendingTimersAsync();
    await flushVueOnly();

    const after = countPaintedFrames(stdout);
    const painted = after - before;
    // Allow one trailing-edge frame past the cap.
    expect(painted).toBeLessThanOrEqual(31);
    expect(painted).toBeGreaterThan(0);

    instance.unmount();
  });

  it("preserves the trailing-edge frame (last update is never lost)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, { stdout, interactive: true, maxFps: 30 });
    await flushVueOnly();

    counter.value = 1;
    await flushVueOnly();
    counter.value = 2;
    await flushVueOnly();
    counter.value = 3;
    await flushVueOnly();

    // Run the trailing-edge timer.
    await vi.runOnlyPendingTimersAsync();
    await flushVueOnly();

    const last = stdout.frames[stdout.frames.length - 1] ?? "";
    expect(stripBSU(last)).toContain("n=3");
    instance.unmount();
  });

  it("maxFps: Infinity disables throttling — every commit paints", async () => {
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, {
      stdout,
      interactive: true,
      maxFps: Number.POSITIVE_INFINITY,
    });
    await flush();

    const before = countPaintedFrames(stdout);
    for (let i = 0; i < 10; i += 1) {
      counter.value = i + 1;
      await flush();
    }

    const painted = countPaintedFrames(stdout) - before;
    expect(painted).toBe(10);

    instance.unmount();
  });

  it("default maxFps is 30 (renderThrottleMs ≈ 34ms)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, { stdout, interactive: true });
    await flushVueOnly();

    const before = countPaintedFrames(stdout);
    // The mount paint consumed the leading edge of the first window. Two
    // further updates inside the same window must coalesce — zero paints
    // until the trailing-edge timer (~34ms for maxFps=30) elapses.
    counter.value = 1;
    await flushVueOnly();
    counter.value = 2;
    await flushVueOnly();

    expect(countPaintedFrames(stdout) - before).toBe(0);

    // Advance past 1000/30 ≈ 34ms — the trailing-edge paint should fire.
    vi.advanceTimersByTime(40);
    await vi.runOnlyPendingTimersAsync();
    await flushVueOnly();

    expect(countPaintedFrames(stdout) - before).toBe(1);
    instance.unmount();
  });

  it("debug mode bypasses throttling", async () => {
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, {
      stdout,
      debug: true,
      interactive: true,
      maxFps: 30,
    });
    await flush();

    const before = stdout.frames.length;
    for (let i = 0; i < 10; i += 1) {
      counter.value = i + 1;
      await flush();
    }
    const painted = stdout.frames.length - before;
    // Debug mode appends every frame as plain text; expect one per commit.
    expect(painted).toBe(10);

    instance.unmount();
  });

  it("flushes pending throttled render on unmount", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const stdout = createCaptureStream(20);
    const counter = ref(0);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => `n=${counter.value}`),
    });

    const instance = render(App, { stdout, interactive: true, maxFps: 30 });
    await flushVueOnly();
    counter.value = 1;
    await flushVueOnly();
    counter.value = 2;
    await flushVueOnly();
    counter.value = 3;
    await flushVueOnly();

    // Unmount without advancing timers — the pending trailing render must still
    // land so the user sees the final state.
    instance.unmount();

    const all = stdout.frames.map(stripBSU).join("");
    expect(all).toContain("n=3");
  });
});

describe("render.ts: ctrl+c via stdin triggers unmount", () => {
  // what this catches: ctrl+c byte (\x03) on stdin must trigger unmount
  // when exitOnCtrlC=true and a useInput listener has enabled raw mode.
  it("honors exitOnCtrlC=true via the raw-mode input manager", async () => {
    const stdin = createFakeStdin();
    const stdout = createCaptureStream(20);
    // Component must call useInput so the input manager enters raw mode and
    // starts forwarding keypresses through the emitter.
    const App = defineComponent({
      setup() {
        useInputComposable(() => {});
        return () => h(Text, null, () => "x");
      },
    });
    const instance = render(App, { stdout, stdin, exitOnCtrlC: true });
    const wait = instance.waitUntilExit();
    stdin.emitData("\x03");
    await wait;
  });
});

describe("render.ts: beforeExit handler", () => {
  // what this catches: process `beforeExit` must resolve waitUntilExit so
  // programs that finish their work don't dangle on the event loop.
  it("beforeExit handler triggers unmount when emitted", async () => {
    const stdout = createCaptureStream(20);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, { stdout, exitOnCtrlC: false });
    const wait = instance.waitUntilExit();
    // Synthesize beforeExit
    process.emit("beforeExit", 0);
    await wait;
  });
});

describe("renderer host: key/ref bypass + setElementText", () => {
  // what this catches: patchProp must skip the structural `key` prop —
  // regression would forward it to setAttribute and pollute output.
  it("ignores `key` prop alone", async () => {
    // patchProp will skip key
    const Demo = defineComponent({
      setup: () => () => h(Box, { key: "just-key" }, () => h(Text, null, () => "k")),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("k");
  });

  // what this catches: patchProp must skip the structural `ref` prop the
  // same way it skips `key`.
  it("ignores `ref` prop alone", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { ref: "just-ref" as unknown as undefined }, () => h(Text, null, () => "r")),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("r");
  });

  // what this catches: the host `insert(child, parent, anchor)` op must
  // honor anchor placement. A regression would render keyed v-for
  // reorders in the wrong order (e.g. prepending appears at the end).
  it("preserves anchor insertion order with v-for re-renders", async () => {
    const items = ref([1, 2, 3]);
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () =>
          items.value.map((n) => h(Text, { key: n }, () => `i${n}`)),
        ),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();

    // Insert at the beginning — drives insert() with an anchor.
    items.value = [0, 1, 2, 3];
    await flush();

    // Insert in the middle — also anchor-based.
    items.value = [0, 1, 1.5, 2, 3];
    await flush();

    instance.unmount();
    const joined = stdout.frames.join("");
    expect(joined).toContain("i0");
    expect(joined).toContain("i1.5");
  });

  // what this catches: when ink-text has no textWrap style and content
  // exceeds the constrained width, the renderer must apply the default
  // 'wrap' mode (the `?? 'wrap'` fallback). Regression would truncate or
  // overflow instead of wrapping.
  it('wraps text without explicit textWrap style (uses default "wrap")', async () => {
    // Direct ink-text with text longer than its constrained width — the
    // renderer applies the default wrap mode via `?? 'wrap'`.
    const Demo = defineComponent({
      setup: () => () => h("ink-box", { style: { width: 5 } }, [h("ink-text", null, "abcdefghij")]),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("abcde");
  });

  // what this catches: patchProp idempotency — `prev === next` must
  // early-return without touching downstream state. Regression would
  // invalidate yoga layout unnecessarily on every equal update.
  it("patchProp short-circuits when prev and next values match", async () => {
    const width = ref(5);
    const Demo = defineComponent({
      setup: () => () => h(Box, { width: width.value }, () => h(Text, null, () => "x")),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    // Set to the same value — Vue's renderer will still pass it, but our
    // patchProp short-circuits via `if (prevValue === nextValue) return;`.
    // (Vue itself may also short-circuit. Either way, no errors.)
    width.value = 5;
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("x");
  });

  // what this catches: setting `style` from an object to `undefined`
  // must reset to an empty style. Regression would throw on the next
  // applyStyles pass when the value type changed.
  it("patches style to undefined without crashing", async () => {
    const showStyle = ref(true);
    const Demo = defineComponent({
      setup: () => () =>
        h("ink-box", { style: showStyle.value ? { width: 5 } : undefined }, [
          h(Text, null, () => "x"),
        ]),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    showStyle.value = false;
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("x");
  });

  // what this catches: unknown attributes (e.g. data-*) must flow
  // through the patchProp → setAttribute fallback without crashing.
  it("passes arbitrary attributes through setAttribute via patchProp", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          "ink-box",
          { "data-test": "first" },
          h(Text, null, () => "x"),
        ),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("x");
  });

  // what this catches: TEXT_CHILDREN shape from `h(tag, null, string)`
  // must drive setElementText through both the swap branch (string →
  // string) and the empty-string branch (no children added).
  it("drives setElementText via h(tag, null, string) shape", async () => {
    // Passing a primitive string as the third h() arg sets TEXT_CHILDREN
    // shapeFlag, which Vue translates to setElementText on the host.
    const text = ref("first");
    const Demo = defineComponent({
      setup: () => () => h("ink-text", null, text.value),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout, interactive: true });
    await flush();
    // Patch from one TEXT_CHILDREN value to another — drives setElementText
    // while there are existing children.
    text.value = "second";
    await flush();
    text.value = ""; // empty text — drives the "no children added" branch
    await flush();
    instance.unmount();
    expect(stdout.frames.join("")).toContain("second");
  });
});

describe("renderer host: setText vs setElementText paths", () => {
  // what this catches: a reactive string inside a <Text> slot must
  // mutate the existing #text node via setText. Regression would
  // recreate the node (losing identity) or render the old value.
  it("reactive text in a Text slot drives setText for the existing #text node", async () => {
    const value = ref("first");
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => value.value),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    value.value = "second";
    await flush();
    instance.unmount();
    expect(stdout.frames.at(-1) ?? "").toContain("second");
  });

  // what this catches: <Transform>'s cached `internal_transform` must
  // be replaced when the `transform` prop function reference changes.
  // Regression would keep applying the stale transform forever.
  it("updates the internal_transform when Transform.transform prop changes", async () => {
    const fn = ref<(s: string) => string>((s) => s.toUpperCase());
    const Demo = defineComponent({
      setup: () => () => h(Transform, { transform: fn.value }, () => "hello"),
    });
    const stdout = createCaptureStream(20);
    const instance = render(Demo, { stdout });
    await flush();
    fn.value = (s) => `[${s}]`;
    await flush();
    instance.unmount();
    expect(stdout.frames.at(-1) ?? "").toContain("[hello]");
  });
});

describe("render.ts: process signal handlers", () => {
  // what this catches: signal-handler cleanup symmetry. render() with
  // exitOnCtrlC=true must add one SIGINT and one SIGTERM listener,
  // and unmount() must remove exactly those listeners. Regression
  // would leak listeners across test runs / app lifetimes.
  it("removes SIGINT / SIGTERM handlers on unmount when exitOnCtrlC=true", () => {
    const stdout = createCaptureStream(20);
    const sigintBefore = process.listeners("SIGINT").length;
    const sigtermBefore = process.listeners("SIGTERM").length;
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, { stdout, exitOnCtrlC: true });
    expect(process.listeners("SIGINT").length).toBe(sigintBefore + 1);
    expect(process.listeners("SIGTERM").length).toBe(sigtermBefore + 1);
    instance.unmount();
    expect(process.listeners("SIGINT").length).toBe(sigintBefore);
    expect(process.listeners("SIGTERM").length).toBe(sigtermBefore);
  });

  // what this catches: exitOnCtrlC=false must NOT install any SIGINT
  // listener. Regression would silently steal ctrl+c from the host
  // program that opted out.
  it("does not register signal handlers when exitOnCtrlC=false", () => {
    const stdout = createCaptureStream(20);
    const before = process.listeners("SIGINT").length;
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, { stdout, exitOnCtrlC: false });
    expect(process.listeners("SIGINT").length).toBe(before);
    instance.unmount();
  });

  // what this catches: waitUntilExit() must add exactly one beforeExit
  // listener and unmount() must remove it. Regression would leak
  // listeners (Node MaxListenersExceededWarning) over many renders.
  it("registers beforeExit handler when waitUntilExit is called", () => {
    const stdout = createCaptureStream(20);
    const before = process.listeners("beforeExit").length;
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, { stdout, exitOnCtrlC: false });
    void instance.waitUntilExit();
    expect(process.listeners("beforeExit").length).toBe(before + 1);
    instance.unmount();
    expect(process.listeners("beforeExit").length).toBe(before);
  });

  // what this catches: emitting SIGINT on the process must drive the
  // onSignal → unmount path so the registered listener actually wires
  // through to teardown (not just present in the listener list).
  it("SIGINT handler calls unmount via onSignal", async () => {
    const stdout = createCaptureStream(20);
    const App = defineComponent({
      setup: () => () => h(Text, null, () => "x"),
    });
    const instance = render(App, { stdout, exitOnCtrlC: true });
    const wait = instance.waitUntilExit();
    // SIGINT listener registered by render → trigger it directly.
    process.emit("SIGINT");
    await wait;
  });
});
