import { describe, it, expect } from "vitest";
import { defineComponent, h } from "vue";
import { Box, Text, render } from "../src/index.ts";
import { createCaptureStream, createFakeStdin, flush } from "./helpers.ts";

// See brain/renderer/resize-reflow-erase.md for background.

const ESC = String.fromCharCode(0x1b);
const cursorUp = (n: number): string => (n > 0 ? `${ESC}[${n}A` : "");
const eraseLine = `${ESC}[2K`;
const cursorToColumn = `${ESC}[G`;

const eraseLinesSequence = (n: number): string => {
  if (n === 0) return "";
  let out = "";
  for (let i = 0; i < n; i += 1) {
    out += eraseLine;
    if (i < n - 1) out += cursorUp(1);
  }
  out += cursorToColumn;
  return out;
};

describe("resize reflow erase", () => {
  it("erases the previous frame accounting for reflow when width shrinks", async () => {
    // Three 5-char lines; shrinking 10 → 2 reflows each line to
    // ceil(5/2)=3 visual rows (9 rows total + trailing slot = 10).
    const Component = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "ABCDE"),
          h(Text, null, () => "FGHIJ"),
          h(Text, null, () => "KLMNO"),
        ]),
    });

    const stdout = createCaptureStream(10, { isTTY: true });
    const stdin = createFakeStdin();
    const instance = render(Component, {
      stdout,
      stdin,
      interactive: true,
      exitOnCtrlC: false,
      patchConsole: false,
    });
    await flush();

    const framesBeforeResize = stdout.frames.length;
    expect(framesBeforeResize).toBeGreaterThan(0);

    stdout.columns = 2;
    stdout.emit("resize");
    await flush();

    const resizeWrites = stdout.frames.slice(framesBeforeResize).join("");
    expect(resizeWrites).toContain(eraseLinesSequence(10));

    instance.unmount();
  });

  it("does not erase when width grows", async () => {
    const Component = defineComponent({
      setup: () => () => h(Text, null, () => "A"),
    });

    const stdout = createCaptureStream(10, { isTTY: true });
    const stdin = createFakeStdin();
    const instance = render(Component, {
      stdout,
      stdin,
      interactive: true,
      exitOnCtrlC: false,
      patchConsole: false,
    });
    await flush();

    const framesBeforeResize = stdout.frames.length;
    stdout.columns = 40;
    stdout.emit("resize");
    await flush();

    // Widening can't reflow content into more rows; the wrap-aware
    // erase must not fire.
    const resizeWrites = stdout.frames.slice(framesBeforeResize).join("");
    expect(resizeWrites).not.toContain(eraseLinesSequence(2));

    instance.unmount();
  });
});
