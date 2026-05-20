import { describe, it, expect } from "vitest";
import fc from "fast-check";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import squashTextNodes from "../../core/src/squash-text-nodes.ts";
import {
  appendChildNode,
  createNode,
  createTextNode,
  type DOMElement,
} from "../../core/src/dom.ts";

// Fragments that can appear inside <Text>: plain text and chalk-coloured runs.
// Keep the alphabet ANSI-safe (printable ASCII, no C0 controls, no ESC) so the
// "visible content is preserved" invariant doesn't have to model sanitization.
const printable = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz 0123456789"),
  minLength: 1,
  maxLength: 8,
});

const plainFragment = printable;
const colouredFragment = printable.map((s) => chalk.green(s));
const fragment = fc.oneof(plainFragment, colouredFragment);

const buildInkText = (fragments: readonly string[]): DOMElement => {
  const node = createNode("ink-text");
  for (const value of fragments) {
    appendChildNode(node, createTextNode(value));
  }
  return node;
};

const buildVirtualText = (value: string): DOMElement => {
  const node = createNode("ink-virtual-text");
  if (value.length > 0) {
    appendChildNode(node, createTextNode(value));
  }
  return node;
};

describe("squashTextNodes — properties", () => {
  it("stripAnsi(squash(node)) === concat of stripAnsi(children)", () => {
    fc.assert(
      fc.property(fc.array(fragment, { minLength: 1, maxLength: 6 }), (fragments) => {
        const node = buildInkText(fragments);
        const squashed = squashTextNodes(node);
        const expected = fragments.map((value) => stripAnsi(value)).join("");
        expect(stripAnsi(squashed)).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  it("nested ink-virtual-text children flatten through squash", () => {
    // Outer ink-text + inner ink-virtual-text wrappers, each holding one text
    // child. Inner *must* be virtual: ink-text has a yoga measureFunc which
    // makes Yoga refuse insertChild (see brain/renderer/nested-text-must-be-virtual).
    fc.assert(
      fc.property(fc.array(printable, { minLength: 1, maxLength: 5 }), (fragments) => {
        const outer = createNode("ink-text");
        for (const value of fragments) {
          const inner = createNode("ink-virtual-text");
          appendChildNode(inner, createTextNode(value));
          appendChildNode(outer, inner);
        }
        expect(stripAnsi(squashTextNodes(outer))).toBe(fragments.join(""));
      }),
      { numRuns: 200 },
    );
  });

  it("empty text children contribute nothing", () => {
    fc.assert(
      fc.property(fc.array(printable, { minLength: 1, maxLength: 5 }), (fragments) => {
        const withEmpties: string[] = [];
        for (const value of fragments) {
          withEmpties.push("", value, "");
        }
        const baseline = squashTextNodes(buildInkText(fragments));
        const padded = squashTextNodes(buildInkText(withEmpties));
        expect(padded).toBe(baseline);
      }),
      { numRuns: 200 },
    );
  });

  it("empty text placeholders do not count toward transform indexes", () => {
    const outer = createNode("ink-text");
    const transformed = buildVirtualText("child");
    transformed.internal_transform = (text, index) => `${index}:${text}`;

    appendChildNode(outer, createTextNode(""));
    appendChildNode(outer, transformed);

    expect(squashTextNodes(outer)).toBe("0:child");
  });

  it("plain text children count toward transform indexes", () => {
    const outer = createNode("ink-text");
    const transformed = buildVirtualText("child");
    transformed.internal_transform = (text, index) => `${index}:${text}`;

    appendChildNode(outer, createTextNode("plain"));
    appendChildNode(outer, transformed);

    expect(squashTextNodes(outer)).toBe("plain1:child");
  });

  it("empty nested text nodes produce no output but still count as renderable", () => {
    const outer = createNode("ink-text");
    const empty = buildVirtualText("");
    const transformed = buildVirtualText("child");

    empty.internal_transform = (text, index) => `empty-${index}:${text}`;
    transformed.internal_transform = (text, index) => `${index}:${text}`;

    appendChildNode(outer, empty);
    appendChildNode(outer, transformed);

    expect(squashTextNodes(outer)).toBe("1:child");
  });

  it("ink-text children are flattened like virtual text children", () => {
    const outer = createNode("ink-virtual-text");
    const inner = createNode("ink-text");
    appendChildNode(inner, createTextNode("child"));
    appendChildNode(outer, inner);

    expect(squashTextNodes(outer)).toBe("child");
  });
});
