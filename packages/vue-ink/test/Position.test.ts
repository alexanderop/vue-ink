import { describe, it, expect } from "vitest";
import { defineComponent, h, ref } from "vue";
import { render } from "@vue-ink/testing-library";
import { Box, Text } from "../src/index.ts";
import { frame, renderToString } from "./helpers.ts";

// Ported from repos/ink/test/position.tsx.

describe("position", () => {
  it("absolute position with top and left offsets", () => {
    const output = frame(() =>
      h(Box, { width: 5, height: 3 }, () =>
        h(Box, { position: "absolute", top: 1, left: 2 }, () => h(Text, null, () => "X")),
      ),
    );
    expect(output).toBe("\n  X\n");
  });

  it("absolute position with bottom and right offsets", () => {
    const output = frame(() =>
      h(Box, { width: 6, height: 4 }, () =>
        h(Box, { position: "absolute", bottom: 1, right: 1 }, () => h(Text, null, () => "X")),
      ),
    );
    expect(output).toBe("\n\n    X\n");
  });

  it("absolute position with percentage offsets", () => {
    const output = frame(() =>
      h(Box, { width: 6, height: 4 }, () =>
        h(Box, { position: "absolute", top: "50%", left: "50%" }, () => h(Text, null, () => "X")),
      ),
    );
    expect(output).toBe("\n\n   X\n");
  });

  it("absolute position with percentage bottom and right offsets", () => {
    const output = frame(() =>
      h(Box, { width: 6, height: 4 }, () =>
        h(Box, { position: "absolute", bottom: "50%", right: "50%" }, () =>
          h(Text, null, () => "X"),
        ),
      ),
    );
    expect(output).toBe("\n  X\n\n");
  });

  it("relative position offsets visual position while keeping flow", () => {
    const output = frame(() =>
      h(Box, { width: 5 }, () => [
        h(Box, { position: "relative", left: 2 }, () => h(Text, null, () => "A")),
        h(Text, null, () => "B"),
      ]),
    );
    expect(output).toBe(" BA");
  });

  it("static position ignores offsets", () => {
    const output = frame(() =>
      h(Box, { width: 5 }, () => [
        h(Box, { position: "static", left: 2 }, () => h(Text, null, () => "A")),
        h(Text, null, () => "B"),
      ]),
    );
    expect(output).toBe("AB");
  });

  it("static position ignores percentage offsets", () => {
    const output = frame(() =>
      h(Box, { width: 5 }, () => [
        h(Box, { position: "static", left: "50%" }, () => h(Text, null, () => "A")),
        h(Text, null, () => "B"),
      ]),
    );
    expect(output).toBe("AB");
  });

  it("clears top offset on rerender", async () => {
    const top = ref<number | undefined>(1);
    const Test = defineComponent({
      setup: () => () =>
        h(Box, { width: 5, height: 3 }, () =>
          h(Box, { position: "absolute", top: top.value, left: 2 }, () => h(Text, null, () => "X")),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    expect(lastFrame()).toBe("\n  X\n");

    top.value = undefined;
    await waitUntilFlush();
    expect(lastFrame()).toBe("  X\n\n");

    unmount();
  });

  it("clears percentage top and left offsets on rerender", async () => {
    const top = ref<string | undefined>("50%");
    const left = ref<string | undefined>("50%");
    const Test = defineComponent({
      setup: () => () =>
        h(Box, { width: 6, height: 4 }, () =>
          h(Box, { position: "absolute", top: top.value, left: left.value }, () =>
            h(Text, null, () => "X"),
          ),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    expect(lastFrame()).toBe("\n\n   X\n");

    top.value = undefined;
    left.value = undefined;
    await waitUntilFlush();
    expect(lastFrame()).toBe("X\n\n\n");

    unmount();
  });

  it("clears percentage top and left offsets when props are omitted on rerender", async () => {
    const showOffsets = ref(true);
    const Test = defineComponent({
      setup: () => () =>
        h(Box, { width: 6, height: 4 }, () =>
          h(
            Box,
            {
              position: "absolute",
              ...(showOffsets.value ? { top: "50%" as const, left: "50%" as const } : {}),
            },
            () => h(Text, null, () => "X"),
          ),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    expect(lastFrame()).toBe("\n\n   X\n");

    showOffsets.value = false;
    await waitUntilFlush();
    expect(lastFrame()).toBe("X\n\n\n");

    unmount();
  });

  it("clears bottom and right offsets on rerender", async () => {
    const bottom = ref<number | undefined>(1);
    const right = ref<number | undefined>(1);
    const Test = defineComponent({
      setup: () => () =>
        h(Box, { width: 6, height: 4 }, () =>
          h(
            Box,
            {
              position: "absolute",
              bottom: bottom.value,
              right: right.value,
            },
            () => h(Text, null, () => "X"),
          ),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    expect(lastFrame()).toBe("\n\n    X\n");

    bottom.value = undefined;
    right.value = undefined;
    await waitUntilFlush();
    expect(lastFrame()).toBe("X\n\n\n");

    unmount();
  });
});

describe("position styles", () => {
  it("places an absolute child at top/left of its relative parent", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { position: "relative", width: 10, height: 4 }, () =>
          h(Box, { position: "absolute", top: 2, left: 3 }, () => h(Text, null, () => "X")),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    const lines = out.split("\n");
    expect(lines[2]).toBe("   X");
  });

  it("supports percent strings for offset values", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { position: "relative", width: 10, height: 4 }, () =>
          h(Box, { position: "absolute", top: "50%", left: "50%" }, () => h(Text, null, () => "M")),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    const lines = out.split("\n");
    expect(lines[2]).toBe("     M");
  });

  it("positions absolute via bottom/right offsets", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { position: "relative", width: 10, height: 4 }, () =>
          h(Box, { position: "absolute", bottom: 0, right: 0 }, () => h(Text, null, () => "Y")),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    const lines = out.split("\n");
    expect(lines[3]).toBe("         Y");
  });

  it("static position is accepted and renders normally in flow", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Box, { position: "static" }, () => h(Text, null, () => "a")),
          h(Box, { position: "static" }, () => h(Text, null, () => "b")),
        ]),
    });
    const out = await renderToString(Demo, { columns: 10 });
    expect(out).toBe("a\nb");
  });
});

describe("Box position/sizing edge cases", () => {
  it("absolute child overlays a flex sibling without consuming row space", async () => {
    // The flexGrow Text fills the row; the absolutely-positioned Text is
    // taken out of normal flow and pinned to top:0 left:0, so it overlays
    // the start of the flex sibling but doesn't shrink it.
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            position: "relative",
            width: 12,
            flexDirection: "row",
            justifyContent: "flex-end",
          },
          () => [
            h(Box, { position: "absolute", top: 0, left: 0 }, () => h(Text, null, () => "AB")),
            h(Text, null, () => "XY"),
          ],
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    const firstLine = out.split("\n")[0] ?? "";
    // Absolute child paints at column 0, justify-flex-end pushes 'XY' to
    // the right edge of the 12-wide parent.
    expect(firstLine.startsWith("AB")).toBe(true);
    expect(firstLine.endsWith("XY")).toBe(true);
  });

  it("percentage width/height computes against fixed-size parent", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 20, height: 6, flexDirection: "column" }, () =>
          h(
            Box,
            {
              width: "50%",
              height: "50%",
              borderStyle: "single",
            },
            () => h(Text, null, () => "x"),
          ),
        ),
    });
    const out = await renderToString(Demo, { columns: 30 });
    const lines = out.split("\n");
    // 50% of 20 = 10 wide; 50% of 6 = 3 tall → top, content, bottom
    expect(lines[0]).toBe("┌────────┐");
    expect(lines[1]).toBe("│x       │");
    expect(lines[2]).toBe("└────────┘");
  });

  it("overflow: hidden clips a child wider than its parent", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            width: 5,
            overflow: "hidden",
            flexDirection: "row",
          },
          () => h(Box, { width: 16, flexShrink: 0 }, () => h(Text, null, () => "ABCDEFGHIJ")),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // Output is clipped to the 5-column parent; nothing past column 5.
    expect(out).toBe("ABCDE");
    expect(out).not.toContain("F");
    expect(out).not.toContain("J");
  });

  it("display: none removes the subtree from output", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Box, { display: "none" }, () => h(Text, null, () => "HIDDEN")),
          h(Text, null, () => "visible"),
        ]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).not.toContain("HIDDEN");
    expect(out).toContain("visible");
  });
});
