import { describe, it, expect } from "vitest";
import { createInputParser, type InputEvent } from "../../renderer/src/input-parser.ts";

const parseChunks = (chunks: string[]): InputEvent[] => {
  const parser = createInputParser();
  const events: InputEvent[] = [];
  for (const chunk of chunks) {
    events.push(...parser.push(chunk));
  }
  return events;
};

describe("createInputParser — plain text and escape boundaries", () => {
  it("passes through plain text chunks", () => {
    expect(parseChunks(["hello", " ", "world"])).toEqual(["hello", " ", "world"]);
  });

  it("keeps plain text and control sequences separate", () => {
    expect(parseChunks(["a\x1b[Ab"])).toEqual(["a", "\x1b[A", "b"]);
  });

  it("parses multiple standard CSI keys in one chunk", () => {
    expect(parseChunks(["\x1b[A\x1b[B\x1b[C\x1b[D"])).toEqual([
      "\x1b[A",
      "\x1b[B",
      "\x1b[C",
      "\x1b[D",
    ]);
  });

  it("parses CSI sequences with parameters", () => {
    expect(parseChunks(["\x1b[1;5A\x1b[5~\x1b[6~"])).toEqual(["\x1b[1;5A", "\x1b[5~", "\x1b[6~"]);
  });

  it("parses kitty protocol sequence as one key event", () => {
    expect(parseChunks(["\x1b[97;5u"])).toEqual(["\x1b[97;5u"]);
  });

  it("parses SS3 sequences as one key event", () => {
    expect(parseChunks(["\x1bOA\x1bOB\x1bOC\x1bOD"])).toEqual([
      "\x1bOA",
      "\x1bOB",
      "\x1bOC",
      "\x1bOD",
    ]);
  });

  it("parses meta+CSI sequence with double escape", () => {
    expect(parseChunks(["\x1b\x1b[A"])).toEqual(["\x1b\x1b[A"]);
  });

  it("parses escaped printable code points", () => {
    expect(parseChunks(["\x1bx\x1b1"])).toEqual(["\x1bx", "\x1b1"]);
  });

  it("parses escaped supplementary code points", () => {
    expect(parseChunks(["\x1b😀"])).toEqual(["\x1b😀"]);
  });

  it("preserves legacy ESC[[... sequences", () => {
    expect(parseChunks(["\x1b[[A\x1b[[5~"])).toEqual(["\x1b[[A", "\x1b[[5~"]);
  });

  it("preserves legacy ESC[[... sequences across chunks", () => {
    expect(parseChunks(["\x1b[[", "A\x1b[[5~"])).toEqual(["\x1b[[A", "\x1b[[5~"]);
  });

  it("parses legacy and standard CSI sequences mixed together", () => {
    expect(parseChunks(["\x1b[[A\x1b[B\x1b[[6~\x1b[1;5D"])).toEqual([
      "\x1b[[A",
      "\x1b[B",
      "\x1b[[6~",
      "\x1b[1;5D",
    ]);
  });

  it("does not consume a following escape as SS3 final byte", () => {
    expect(parseChunks(["\x1bO\x1b[A"])).toEqual(["\x1bO", "\x1b[A"]);
  });

  it("parses meta+SS3 sequence with double escape", () => {
    expect(parseChunks(["\x1b\x1bOA"])).toEqual(["\x1b\x1bOA"]);
  });

  it("emits double escape as single event for non-control character", () => {
    expect(parseChunks(["\x1b\x1bx"])).toEqual(["\x1b\x1b", "x"]);
  });

  it("treats invalid CSI continuation as escaped code point plus plain text", () => {
    expect(parseChunks(["\x1b[\n"])).toEqual(["\x1b[", "\n"]);
  });

  it("parses mixed text and many key events in one read", () => {
    expect(parseChunks(["start\x1b[A mid \x1bOH end\x1b[[5~"])).toEqual([
      "start",
      "\x1b[A",
      " mid ",
      "\x1bOH",
      " end",
      "\x1b[[5~",
    ]);
  });
});

describe("createInputParser — partial sequences", () => {
  it("holds incomplete CSI sequence until final byte arrives", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(true);
    expect(parser.push("1;5")).toEqual([]);
    expect(parser.push("A")).toEqual(["\x1b[1;5A"]);
  });

  it("holds incomplete SS3 sequence until final byte arrives", () => {
    const parser = createInputParser();
    expect(parser.push("\x1bO")).toEqual([]);
    expect(parser.push("A")).toEqual(["\x1bOA"]);
  });

  it("keeps pending plain escape and can flush it", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(true);
    expect(parser.flushPendingEscape()).toBe("\x1b");
    expect(parser.hasPendingEscape()).toBe(false);
  });

  it("flushes pending CSI prefix as literal input", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[")).toEqual([]);
    expect(parser.flushPendingEscape()).toBe("\x1b[");
    expect(parser.push("A")).toEqual(["A"]);
  });

  it("reset clears pending state", () => {
    const parser = createInputParser();
    parser.push("\x1b[");
    parser.reset();
    expect(parser.push("A")).toEqual(["A"]);
  });

  it("assembles CSI sequence from single-byte chunks", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b")).toEqual([]);
    expect(parser.push("[")).toEqual([]);
    expect(parser.push("1")).toEqual([]);
    expect(parser.push(";")).toEqual([]);
    expect(parser.push("5")).toEqual([]);
    expect(parser.push("A")).toEqual(["\x1b[1;5A"]);
  });

  it("plain text followed by incomplete escape holds escape as pending", () => {
    const parser = createInputParser();
    expect(parser.push("hello\x1b")).toEqual(["hello"]);
    expect(parser.hasPendingEscape()).toBe(true);
  });

  it("holds incomplete legacy ESC[[... sequence until final byte arrives", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[[")).toEqual([]);
    expect(parser.push("5")).toEqual([]);
    expect(parser.push("~")).toEqual(["\x1b[[5~"]);
  });

  it("holds incomplete double-escape CSI sequence until final byte arrives", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b\x1b[")).toEqual([]);
    expect(parser.push("A")).toEqual(["\x1b\x1b[A"]);
  });

  it("holds incomplete double-escape SS3 sequence until final byte arrives", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b\x1bO")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(true);
    expect(parser.push("A")).toEqual(["\x1b\x1bOA"]);
  });

  it("flushes pending SS3 prefix as literal input", () => {
    const parser = createInputParser();
    expect(parser.push("\x1bO")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(true);
    expect(parser.flushPendingEscape()).toBe("\x1bO");
    expect(parser.push("x")).toEqual(["x"]);
  });

  it("flushes pending legacy CSI prefix as literal input", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[[")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(true);
    expect(parser.flushPendingEscape()).toBe("\x1b[[");
    expect(parser.push("x")).toEqual(["x"]);
  });

  it("empty chunk produces no events", () => {
    expect(parseChunks([""])).toEqual([]);
  });

  it("empty chunk does not disturb pending state", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[")).toEqual([]);
    expect(parser.push("")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(true);
    expect(parser.push("A")).toEqual(["\x1b[A"]);
  });
});

describe("createInputParser — backspace splitting", () => {
  it("splits batched 0x7F backspace characters into individual events", () => {
    expect(parseChunks(["\x7f\x7f\x7f"])).toEqual(["\x7f", "\x7f", "\x7f"]);
  });

  it("splits batched 0x08 backspace characters into individual events", () => {
    expect(parseChunks(["\x08\x08\x08"])).toEqual(["\x08", "\x08", "\x08"]);
  });

  it("splits mixed printable text and 0x7F backspace characters", () => {
    expect(parseChunks(["abc\x7f\x7f\x7f"])).toEqual(["abc", "\x7f", "\x7f", "\x7f"]);
  });

  it("does not split pasted carriage return from text", () => {
    expect(parseChunks(["\rtest"])).toEqual(["\rtest"]);
  });

  it("does not split pasted tab from text", () => {
    expect(parseChunks(["\ttest"])).toEqual(["\ttest"]);
  });

  it("splits mixed 0x7F and 0x08 backspace characters", () => {
    expect(parseChunks(["\x7f\x08\x7f"])).toEqual(["\x7f", "\x08", "\x7f"]);
  });

  it("single 0x7F backspace character is preserved as individual event", () => {
    expect(parseChunks(["\x7f"])).toEqual(["\x7f"]);
  });

  it("single 0x08 backspace character is preserved as individual event", () => {
    expect(parseChunks(["\x08"])).toEqual(["\x08"]);
  });

  it("splits trailing 0x7F backspace from text", () => {
    expect(parseChunks(["abc\x7f"])).toEqual(["abc", "\x7f"]);
  });

  it("splits 0x7F backspace characters before escape sequences", () => {
    expect(parseChunks(["\x7f\x7f\x1b[A"])).toEqual(["\x7f", "\x7f", "\x1b[A"]);
  });

  it("splits 0x7F backspace characters after escape sequences", () => {
    expect(parseChunks(["\x1b[A\x7f\x7f"])).toEqual(["\x1b[A", "\x7f", "\x7f"]);
  });

  it("splits 0x7F backspace characters between escape sequences", () => {
    expect(parseChunks(["\x1b[A\x7f\x1b[B"])).toEqual(["\x1b[A", "\x7f", "\x1b[B"]);
  });

  it("splits 0x08 backspace characters around escape sequences", () => {
    expect(parseChunks(["\x08\x1b[A\x08"])).toEqual(["\x08", "\x1b[A", "\x08"]);
  });

  it("splits interleaved text and 0x7F backspace characters", () => {
    expect(parseChunks(["ab\x7fcd"])).toEqual(["ab", "\x7f", "cd"]);
  });
});

describe("createInputParser — bracketed paste", () => {
  it("emits paste event for bracketed paste sequence", () => {
    expect(parseChunks(["\x1b[200~hello world\x1b[201~"])).toEqual([{ paste: "hello world" }]);
  });

  it("emits paste event for multiline bracketed paste", () => {
    expect(parseChunks(["\x1b[200~line1\nline2\x1b[201~"])).toEqual([{ paste: "line1\nline2" }]);
  });

  it("paste content with escape sequences delivered verbatim", () => {
    expect(parseChunks(["\x1b[200~hello\x1b[Aworld\x1b[201~"])).toEqual([
      { paste: "hello\x1b[Aworld" },
    ]);
  });

  it("emits normal events before and after bracketed paste", () => {
    expect(parseChunks(["before\x1b[200~pasted\x1b[201~after"])).toEqual([
      "before",
      { paste: "pasted" },
      "after",
    ]);
  });

  it("holds incomplete bracketed paste as pending", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[200~hello")).toEqual([]);
    expect(parser.hasPendingEscape()).toBe(false);
    expect(parser.push(" world\x1b[201~")).toEqual([{ paste: "hello world" }]);
  });

  it("emits empty paste for adjacent paste markers", () => {
    expect(parseChunks(["\x1b[200~\x1b[201~"])).toEqual([{ paste: "" }]);
  });

  it("paste delivers backspace chars verbatim without splitting", () => {
    expect(parseChunks(["\x1b[200~\x7f\x08\x7f\x1b[201~"])).toEqual([{ paste: "\x7f\x08\x7f" }]);
  });

  it("hasPendingEscape returns true for length-3 pasteStart prefix", () => {
    const parser = createInputParser();
    parser.push("\x1b[2");
    expect(parser.hasPendingEscape()).toBe(true);
  });

  it("handles pasteStart split before the tilde (no false flush)", () => {
    const parser = createInputParser();
    parser.push("\x1b[200");
    expect(parser.hasPendingEscape()).toBe(false);
    expect(parser.push("~hello\x1b[201~")).toEqual([{ paste: "hello" }]);
  });

  it("emits multiple paste events in one chunk", () => {
    expect(parseChunks(["\x1b[200~first\x1b[201~mid\x1b[200~second\x1b[201~"])).toEqual([
      { paste: "first" },
      "mid",
      { paste: "second" },
    ]);
  });

  it("assembles bracketed paste from chunk-by-chunk delivery", () => {
    const parser = createInputParser();
    expect(parser.push("\x1b[200~")).toEqual([]);
    expect(parser.push("hello")).toEqual([]);
    expect(parser.push("\x1b[201~")).toEqual([{ paste: "hello" }]);
  });

  it("hasPendingEscape returns true for length-4 pasteStart prefix (\\x1b[20)", () => {
    const parser = createInputParser();
    parser.push("\x1b[20");
    expect(parser.hasPendingEscape()).toBe(true);
  });
});
