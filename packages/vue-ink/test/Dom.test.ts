import { describe, it, expect } from "vitest";
import { h, defineComponent, ref } from "vue";
import {
  createNode,
  createTextNode,
  appendChildNode,
  freeYogaSubtree,
  insertBeforeNode,
  removeChildNode,
  setAttribute,
  setStyle,
  setTextNodeValue,
} from "@vue-ink/core";
import { render, Box, Text } from "../src/index.ts";
import { renderToString, renderReusable } from "./helpers.ts";

describe("createNode", () => {
  it("creates ink-box with a yoga node", () => {
    const node = createNode("ink-box");
    expect(node.nodeName).toBe("ink-box");
    expect(node.yogaNode).toBeDefined();
  });

  it("creates ink-virtual-text without a yoga node", () => {
    const node = createNode("ink-virtual-text");
    expect(node.nodeName).toBe("ink-virtual-text");
    expect(node.yogaNode).toBeUndefined();
  });

  it("creates ink-comment without a yoga node", () => {
    const node = createNode("ink-comment");
    expect(node.nodeName).toBe("ink-comment");
    expect(node.yogaNode).toBeUndefined();
  });

  it("creates ink-text with a measure function attached", () => {
    const node = createNode("ink-text");
    expect(node.nodeName).toBe("ink-text");
    expect(node.yogaNode).toBeDefined();
  });
});

describe("createTextNode", () => {
  it("stores the text and has no yoga node", () => {
    const node = createTextNode("hi");
    expect(node.nodeValue).toBe("hi");
    expect(node.yogaNode).toBeUndefined();
    expect(node.nodeName).toBe("#text");
  });

  it("coerces a non-string value to a string", () => {
    // Vue's reactive renderer can pass non-strings here when children are
    // numbers/refs/booleans. The DOM layer must stringify before storing.
    const node = createTextNode("initial");
    setTextNodeValue(node, 123 as unknown as string);
    expect(node.nodeValue).toBe("123");
  });
});

describe("appendChildNode", () => {
  it("re-parents a node that already has a parent", () => {
    const a = createNode("ink-box");
    const b = createNode("ink-box");
    const child = createNode("ink-text");
    appendChildNode(a, child);
    expect(a.childNodes).toContain(child);
    appendChildNode(b, child);
    expect(b.childNodes).toContain(child);
    expect(a.childNodes).not.toContain(child);
  });

  it("marks ink-text dirty when a text node is appended", () => {
    const text = createNode("ink-text");
    const child = createTextNode("hi");
    appendChildNode(text, child);
    expect(text.childNodes).toContain(child);
  });
});

describe("insertBeforeNode", () => {
  it("falls back to append when anchor is not in childNodes", () => {
    const parent = createNode("ink-box");
    const orphan = createNode("ink-box");
    const child = createNode("ink-text");
    insertBeforeNode(parent, child, orphan);
    expect(parent.childNodes).toContain(child);
  });

  it("re-parents a node already attached elsewhere when inserting before", () => {
    const a = createNode("ink-box");
    const b = createNode("ink-box");
    const anchor = createNode("ink-text");
    const child = createNode("ink-box");
    appendChildNode(a, child);
    appendChildNode(b, anchor);
    insertBeforeNode(b, child, anchor);
    expect(a.childNodes).not.toContain(child);
    expect(b.childNodes[0]).toBe(child);
  });

  it("preserves order when child has no yoga node (e.g. comment)", () => {
    const parent = createNode("ink-box");
    const anchor = createNode("ink-text");
    const comment = createNode("ink-comment");
    appendChildNode(parent, anchor);
    insertBeforeNode(parent, comment, anchor);
    expect(parent.childNodes).toEqual([comment, anchor]);
  });
});

describe("setAttribute / setStyle", () => {
  it("stores attribute values on the element", () => {
    const node = createNode("ink-box");
    setAttribute(node, "data-x", "y");
    expect(node.attributes["data-x"]).toBe("y");
  });

  it("clears style when undefined is passed", () => {
    const node = createNode("ink-box");
    setStyle(node, { width: 10 });
    expect(node.style.width).toBe(10);
    setStyle(node);
    expect(node.style).toEqual({});
  });
});

describe("removeChildNode", () => {
  it("detaches and clears parentNode", () => {
    const parent = createNode("ink-box");
    const child = createNode("ink-text");
    appendChildNode(parent, child);
    removeChildNode(parent, child);
    expect(parent.childNodes).not.toContain(child);
    expect(child.parentNode).toBeUndefined();
  });

  it("preserves the yoga node on detach so keyed moves can reinsert it", () => {
    // Vue's keyed-move path is `remove from current parent` + `insertBefore`.
    // `insertBeforeNode` reads `child.yogaNode` to rewire the yoga tree, so
    // detach must leave that handle intact.
    const parent = createNode("ink-box");
    const child = createNode("ink-text");
    appendChildNode(parent, child);
    removeChildNode(parent, child);
    expect(child.yogaNode).toBeDefined();
  });

  it("frees a subtree explicitly via freeYogaSubtree", () => {
    const parent = createNode("ink-box");
    const child = createNode("ink-box");
    const grandchild = createNode("ink-text");
    appendChildNode(parent, child);
    appendChildNode(child, grandchild);
    removeChildNode(parent, child);
    freeYogaSubtree(child);
    expect(child.yogaNode).toBeUndefined();
  });
});

describe("measureTextNode (via render)", () => {
  it("renders very small width without crashing", async () => {
    // Drives the `width < 1` branch in measureTextNode.
    const Demo = defineComponent({
      setup: () => () => h(Box, { width: 1 }, () => h(Text, null, () => "abc")),
    });
    const out = await renderToString(Demo, { columns: 1 });
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("setTextNodeValue marks ancestors dirty", () => {
  it("re-renders the tree when text inside a Box updates", async () => {
    const value = ref("first");
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => h(Text, null, () => value.value)),
    });
    const { instance, output, flush, stdout } = await renderReusable(Demo, { columns: 20 });
    expect(output()).toBe("first");
    value.value = "second";
    await flush();
    const lastFrame = stdout.frames.at(-1) ?? "";
    instance.unmount();
    expect(lastFrame).toContain("second");
  });
});

describe("renderer rejects unknown element types", () => {
  it("throws when Vue tries to render an unknown host tag", async () => {
    const Demo = defineComponent({
      setup: () => () => h("not-a-real-tag" as "div", null, "oops"),
    });
    expect(() => render(Demo, { stdout: process.stdout })).toThrow(/unknown host element/);
  });
});

describe("squashTextNodes branches", () => {
  it("skips sparse holes in childNodes (defensive branch)", async () => {
    const { default: squashTextNodes } = await import("../../core/src/squash-text-nodes.ts");
    const parent = createNode("ink-text");
    const a = createTextNode("a");
    appendChildNode(parent, a);
    (parent.childNodes as unknown as Array<unknown>).push(undefined);
    const b = createTextNode("b");
    appendChildNode(parent, b);
    expect(squashTextNodes(parent)).toBe("ab");
  });

  it("skips a nested ink-text/virtual-text whose squashed text is empty", async () => {
    const { default: squashTextNodes } = await import("../../core/src/squash-text-nodes.ts");
    const parent = createNode("ink-text");
    const head = createTextNode("A");
    const emptyChild = createNode("ink-virtual-text");
    const tail = createTextNode("B");
    appendChildNode(parent, head);
    appendChildNode(parent, emptyChild);
    appendChildNode(parent, tail);
    // emptyChild has no descendants → nested squash returns '' → continue.
    expect(squashTextNodes(parent)).toBe("AB");
  });
});

describe("dom.insertBeforeNode marks ink-text/virtual-text dirty", () => {
  it("marks ink-text dirty when inserting a sibling text node before another", () => {
    const parent = createNode("ink-text");
    const existing = createTextNode("existing");
    const incoming = createTextNode("incoming");
    appendChildNode(parent, existing);
    insertBeforeNode(parent, incoming, existing);
    expect(parent.childNodes.map((n) => (n.nodeName === "#text" ? n.nodeValue : ""))).toEqual([
      "incoming",
      "existing",
    ]);
  });

  it("marks ink-virtual-text dirty when inserting a sibling", () => {
    const parent = createNode("ink-text");
    const virt = createNode("ink-virtual-text");
    appendChildNode(parent, virt);
    const existing = createTextNode("existing");
    const incoming = createTextNode("incoming");
    appendChildNode(virt, existing);
    insertBeforeNode(virt, incoming, existing);
    expect(virt.childNodes.length).toBe(2);
  });
});

describe("dom: markNodeAsDirty inside ink-text/virtual-text", () => {
  // what this catches: removeChildNode on an ink-text parent must mark
  // it dirty so the next render reflows. Regression would render a
  // stale frame after removing a text fragment.
  it("marks ink-text dirty when a child is removed", () => {
    const parent = createNode("ink-text");
    const a = createTextNode("a");
    const b = createTextNode("b");
    appendChildNode(parent, a);
    appendChildNode(parent, b);
    removeChildNode(parent, a);
    expect(parent.childNodes).toEqual([b]);
  });

  // what this catches: same dirty-marking contract for the
  // ink-virtual-text wrapper that nested-text composition uses.
  it("marks ink-virtual-text dirty when a child is removed", () => {
    const text = createNode("ink-text");
    const virt = createNode("ink-virtual-text");
    appendChildNode(text, virt);
    const a = createTextNode("a");
    appendChildNode(virt, a);
    removeChildNode(virt, a);
    expect(virt.childNodes).toEqual([]);
  });
});

describe("renderer host: setStyle with no value clears style", () => {
  // what this catches: setStyle(node) with no second argument must
  // clear the style to {}. Regression would leave the previous style
  // in place (so old widths/colors would leak).
  it("passing undefined style resets to empty object", () => {
    const node = createNode("ink-box");
    setStyle(node, { width: 5 });
    expect(node.style.width).toBe(5);
    setStyle(node);
    expect(node.style).toEqual({});
  });
});
