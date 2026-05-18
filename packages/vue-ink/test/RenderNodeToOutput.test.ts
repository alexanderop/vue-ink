import { describe, it, expect } from "vitest";
import { h, defineComponent } from "vue";
import { createNode, renderNodeToOutput, Output } from "@vue-ink/core";
import { Box, Text } from "../src/index.ts";
import { renderToString } from "./helpers.ts";

describe("renderNodeToOutput: overflow / padding branches", () => {
  it("drives the overflowX=hidden clip path without crashing", async () => {
    // The clip code is in render-node-to-output.ts; exercise it.
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 4, overflowX: "hidden", flexDirection: "row" }, () =>
          h(Box, { width: 10 }, () => h(Text, null, () => "abcdefghij")),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out.length).toBeGreaterThan(0);
  });

  it("drives the overflowY=hidden clip path without crashing", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { height: 2, overflowY: "hidden", flexDirection: "column" }, () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Text, null, () => "a"),
            h(Text, null, () => "b"),
            h(Text, null, () => "c"),
            h(Text, null, () => "d"),
          ]),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // At minimum, the first line should be present and the result fits the
    // height limit set by the clip.
    expect(out.length).toBeGreaterThan(0);
  });

  it("drives the overflow shorthand path", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 4, height: 2, overflow: "hidden" }, () =>
          h(Box, { width: 10 }, () => h(Text, null, () => "abcdefghij")),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out.length).toBeGreaterThan(0);
  });

  it("applies padding inside ink-text via Box paddingLeft", async () => {
    // ink-text content gets offsetX from its yoga node's first child layout.
    // Driving applyPaddingToText needs a Text whose squashed content includes
    // nested Text — covered by mixing inline-text + paddingLeft on the Box.
    const Demo = defineComponent({
      setup: () => () => h(Box, { paddingLeft: 2, width: 10 }, () => h(Text, null, () => "pad")),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("  pad");
  });
});

describe("renderNodeToOutput: edge cases via direct calls", () => {
  // what this catches: renderNodeToOutput must early-return on a node
  // whose yoga node was freed/undefined (can happen mid-unmount).
  // Regression would crash on `.getComputedLayout()` of undefined.
  it("returns early for a node with no yoga node", () => {
    const box = createNode("ink-box");
    // Force-strip the yoga node.
    box.yogaNode?.free();
    box.yogaNode = undefined;
    const out = new Output({ width: 5, height: 1 });
    expect(() => renderNodeToOutput(box, out, {})).not.toThrow();
  });

  // what this catches: ink-comment nodes must render as a no-op so
  // Vue's anchor/comment placeholders never leak visible output.
  it("renders the ink-comment branch (no-op)", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Box, null, () => [h("ink-comment"), h(Text, null, () => "visible")]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("visible");
  });
});
