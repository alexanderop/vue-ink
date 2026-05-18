import { describe, it, expect, vi } from "vitest";
import { defineComponent, h, onMounted } from "vue";
import { render } from "@vue-ink/testing-library";
import { renderToString } from "@vue-ink/renderer";
import { Box, Text, Transform } from "../src/index.ts";

// Ported from repos/ink/test/screen-reader.tsx. The visual renderer is
// bypassed entirely when `isScreenReaderEnabled` is set: the tree is walked
// once to produce a flat string of text + aria announcements, with row
// children joined by spaces and column children joined by newlines.

const sr = (renderFn: () => unknown): string => {
  const { lastFrame, unmount } = render(defineComponent({ setup: () => renderFn }), {
    isScreenReaderEnabled: true,
  });
  const out = lastFrame() ?? "";
  unmount();
  return out;
};

describe("screen-reader", () => {
  it("render text for screen readers", () => {
    expect(
      sr(() =>
        h(Box, { "aria-label": "Hello World" }, () =>
          h(Text, null, () => "Not visible to screen readers"),
        ),
      ),
    ).toBe("Hello World");
  });

  it("render text for screen readers with aria-hidden", () => {
    expect(
      sr(() =>
        h(Box, { "aria-hidden": true }, () => h(Text, null, () => "Not visible to screen readers")),
      ),
    ).toBe("");
  });

  it("render text for screen readers with aria-role", () => {
    expect(sr(() => h(Box, { "aria-role": "button" }, () => h(Text, null, () => "Click me")))).toBe(
      "button: Click me",
    );
  });

  it("render select input for screen readers", () => {
    const items = ["Red", "Green", "Blue"];
    const output = sr(() =>
      h(Box, { "aria-role": "list", flexDirection: "column" }, () => [
        h(Text, null, () => "Select a color:"),
        ...items.map((item, index) =>
          h(
            Box,
            {
              key: item,
              "aria-label": `${index + 1}. ${item}`,
              "aria-role": "listitem",
              "aria-state": { selected: index === 1 },
            },
            () => h(Text, null, () => item),
          ),
        ),
      ]),
    );
    expect(output).toBe(
      "list: Select a color:\nlistitem: 1. Red\nlistitem: (selected) 2. Green\nlistitem: 3. Blue",
    );
  });

  it("render aria-label only Text for screen readers", () => {
    expect(sr(() => h(Text, { "aria-label": "Screen-reader only" }))).toBe("Screen-reader only");
  });

  it("render aria-label only Box for screen readers", () => {
    expect(sr(() => h(Box, { "aria-label": "Screen-reader only" }))).toBe("Screen-reader only");
  });

  it("omit ANSI styling in screen-reader output", () => {
    expect(
      sr(() =>
        h(Box, null, () =>
          h(
            Text,
            { bold: true, color: "green", inverse: true, underline: true },
            () => "Styled content",
          ),
        ),
      ),
    ).toBe("Styled content");
  });

  it("skip nodes with display:none style in screen-reader output", () => {
    expect(
      sr(() =>
        h(Box, null, () => [
          h(Box, { display: "none" }, () => h(Text, null, () => "Hidden")),
          h(Text, null, () => "Visible"),
        ]),
      ),
    ).toBe("Visible");
  });

  it("render multiple Text components", () => {
    expect(
      sr(() =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "Hello"),
          h(Text, null, () => "World"),
        ]),
      ),
    ).toBe("Hello\nWorld");
  });

  it("render nested Box components with Text", () => {
    expect(
      sr(() =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "Hello"),
          h(Box, null, () => h(Text, null, () => "World")),
        ]),
      ),
    ).toBe("Hello\nWorld");
  });

  it("render component that returns null", () => {
    const NullComponent = defineComponent({ setup: () => () => null });
    expect(
      sr(() =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "Hello"),
          h(NullComponent),
          h(Text, null, () => "World"),
        ]),
      ),
    ).toBe("Hello\nWorld");
  });

  it("render with aria-state.busy", () => {
    expect(
      sr(() => h(Box, { "aria-state": { busy: true } }, () => h(Text, null, () => "Loading"))),
    ).toBe("(busy) Loading");
  });

  it("render with aria-state.checked", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "checkbox", "aria-state": { checked: true } }, () =>
          h(Text, null, () => "Accept terms"),
        ),
      ),
    ).toBe("checkbox: (checked) Accept terms");
  });

  it("render with aria-state.disabled", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "button", "aria-state": { disabled: true } }, () =>
          h(Text, null, () => "Submit"),
        ),
      ),
    ).toBe("button: (disabled) Submit");
  });

  it("render with aria-state.expanded", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "combobox", "aria-state": { expanded: true } }, () =>
          h(Text, null, () => "Select"),
        ),
      ),
    ).toBe("combobox: (expanded) Select");
  });

  it("render with aria-state.multiline", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "textbox", "aria-state": { multiline: true } }, () =>
          h(Text, null, () => "Hello"),
        ),
      ),
    ).toBe("textbox: (multiline) Hello");
  });

  it("render with aria-state.multiselectable", () => {
    expect(
      sr(() =>
        h(
          Box,
          {
            "aria-role": "listbox",
            "aria-state": { multiselectable: true },
          },
          () => h(Text, null, () => "Options"),
        ),
      ),
    ).toBe("listbox: (multiselectable) Options");
  });

  it("render with aria-state.readonly", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "textbox", "aria-state": { readonly: true } }, () =>
          h(Text, null, () => "Hello"),
        ),
      ),
    ).toBe("textbox: (readonly) Hello");
  });

  it("render with aria-state.required", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "textbox", "aria-state": { required: true } }, () =>
          h(Text, null, () => "Name"),
        ),
      ),
    ).toBe("textbox: (required) Name");
  });

  it("render with aria-state.selected", () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "option", "aria-state": { selected: true } }, () =>
          h(Text, null, () => "Blue"),
        ),
      ),
    ).toBe("option: (selected) Blue");
  });

  it("render multi-line text", () => {
    expect(
      sr(() =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "Line 1"),
          h(Text, null, () => "Line 2"),
        ]),
      ),
    ).toBe("Line 1\nLine 2");
  });

  it("render nested multi-line text", () => {
    expect(
      sr(() =>
        h(Box, { flexDirection: "row" }, () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Text, null, () => "Line 1"),
            h(Text, null, () => "Line 2"),
          ]),
        ),
      ),
    ).toBe("Line 1\nLine 2");
  });

  it("render nested row", () => {
    expect(
      sr(() =>
        h(Box, { flexDirection: "column" }, () =>
          h(Box, { flexDirection: "row" }, () => [
            h(Text, null, () => "Line 1"),
            h(Text, null, () => "Line 2"),
          ]),
        ),
      ),
    ).toBe("Line 1 Line 2");
  });

  it("render multi-line text with roles", () => {
    expect(
      sr(() =>
        h(Box, { flexDirection: "column", "aria-role": "list" }, () => [
          h(Box, { "aria-role": "listitem" }, () => h(Text, null, () => "Item 1")),
          h(Box, { "aria-role": "listitem" }, () => h(Text, null, () => "Item 2")),
        ]),
      ),
    ).toBe("list: listitem: Item 1\nlistitem: Item 2");
  });

  it("render listbox with multiselectable options", () => {
    expect(
      sr(() =>
        h(
          Box,
          {
            flexDirection: "column",
            "aria-role": "listbox",
            "aria-state": { multiselectable: true },
          },
          () => [
            h(
              Box,
              {
                "aria-role": "option",
                "aria-state": { selected: true },
              },
              () => h(Text, null, () => "Option 1"),
            ),
            h(
              Box,
              {
                "aria-role": "option",
                "aria-state": { selected: false },
              },
              () => h(Text, null, () => "Option 2"),
            ),
            h(
              Box,
              {
                "aria-role": "option",
                "aria-state": { selected: true },
              },
              () => h(Text, null, () => "Option 3"),
            ),
          ],
        ),
      ),
    ).toBe(
      "listbox: (multiselectable) option: (selected) Option 1\noption: Option 2\noption: (selected) Option 3",
    );
  });

  it("Transform announces accessibilityLabel instead of transformed text", () => {
    // Without the label the screen reader would announce the styled
    // children verbatim; with it, the transformer's visual effect is
    // substituted by a human-readable description.
    expect(
      sr(() =>
        h(
          Transform,
          {
            transform: (s: string) => s.toUpperCase(),
            accessibilityLabel: "Loading…",
          },
          () => h(Text, null, () => "wait"),
        ),
      ),
    ).toBe("Loading…");
  });

  it("Transform without accessibilityLabel falls through to plain text", () => {
    expect(
      sr(() =>
        h(Transform, { transform: (s: string) => s.toUpperCase() }, () =>
          h(Text, null, () => "hello"),
        ),
      ),
    ).toBe("hello");
  });

  // Parity with ink: `<Box aria-hidden>` returns null when SR is on, so the
  // subtree is never mounted. No Yoga layout, no lifecycle hooks for children.
  describe("aria-hidden short-circuit on Box", () => {
    it("aria-hidden Box does not mount its children when SR is on", () => {
      const onMount = vi.fn();
      const Child = defineComponent({
        setup() {
          onMounted(onMount);
          return () => h(Text, null, () => "hidden");
        },
      });

      const out = renderToString(
        defineComponent({
          setup: () => () => h(Box, { "aria-hidden": true }, () => h(Child)),
        }),
        { columns: 80, isScreenReaderEnabled: true },
      );

      expect(out.trim()).toBe("");
      expect(onMount).not.toHaveBeenCalled();
    });

    it("aria-hidden Box mounts children normally when SR is off", () => {
      const onMount = vi.fn();
      const Child = defineComponent({
        setup() {
          onMounted(onMount);
          return () => h(Text, null, () => "hidden");
        },
      });

      const out = renderToString(
        defineComponent({
          setup: () => () => h(Box, { "aria-hidden": true }, () => h(Child)),
        }),
        { columns: 80, isScreenReaderEnabled: false },
      );

      expect(out).toContain("hidden");
      expect(onMount).toHaveBeenCalledTimes(1);
    });

    it("Box without aria-hidden mounts children when SR is on", () => {
      const onMount = vi.fn();
      const Child = defineComponent({
        setup() {
          onMounted(onMount);
          return () => h(Text, null, () => "visible");
        },
      });

      const out = renderToString(
        defineComponent({
          setup: () => () => h(Box, null, () => h(Child)),
        }),
        { columns: 80, isScreenReaderEnabled: true },
      );

      expect(out).toContain("visible");
      expect(onMount).toHaveBeenCalledTimes(1);
    });
  });
});

// The blocks above exercise roughly 8 of the 18 roles declared in
// `packages/core/src/dom.ts` (`AccessibilityRole`). The set below fills in
// the remaining roles so every supported `aria-role` value has at least one
// passing screen-reader assertion. Each test renders a Box with a Text child
// and verifies the walker emits `${role}: <text>`.
const REMAINING_ROLES = [
  "menu",
  "menuitem",
  "radio",
  "radiogroup",
  "tab",
  "tablist",
  "table",
  "timer",
  "toolbar",
  "progressbar",
] as const;

describe("screen-reader aria-role coverage (remaining roles)", () => {
  for (const role of REMAINING_ROLES) {
    it(`announces "${role}:" prefix on a Box with that role`, () => {
      expect(
        sr(() => h(Box, { "aria-role": role }, () => h(Text, null, () => `${role}-content`))),
      ).toBe(`${role}: ${role}-content`);
    });
  }
});

describe("screen-reader aria-label / aria-hidden on Text", () => {
  it("aria-label on Text replaces the visible text in SR output", () => {
    expect(sr(() => h(Text, { "aria-label": "alt" }, () => "Visible"))).toBe("alt");
  });

  it("aria-hidden on Text removes its subtree from the SR walk", () => {
    // A hidden Text alongside a visible one should leave only the visible
    // announcement in the output.
    expect(
      sr(() =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, { "aria-hidden": true }, () => "Invisible"),
          h(Text, null, () => "See me"),
        ]),
      ),
    ).toBe("See me");
  });

  it("a lone aria-hidden Text produces empty SR output", () => {
    expect(sr(() => h(Text, { "aria-hidden": true }, () => "Invisible"))).toBe("");
  });

  it('aria-label on Text inside a roled Box composes into "role: label"', () => {
    expect(
      sr(() =>
        h(Box, { "aria-role": "button" }, () => h(Text, { "aria-label": "alt" }, () => "Visible")),
      ),
    ).toBe("button: alt");
  });

  // Parity with ink: when SR is on, Text replaces its children with the
  // aria-label entirely. Children should not be rendered/mounted, so any
  // side effects inside the slot (e.g. onMounted) do not fire.
  it("aria-label replaces the child subtree (no mount side effects)", () => {
    const onMount = vi.fn();
    const Child = defineComponent({
      setup() {
        onMounted(onMount);
        return () => "visible";
      },
    });

    const out = renderToString(
      defineComponent({
        setup: () => () => h(Text, { "aria-label": "foo" }, () => h(Child)),
      }),
      { columns: 80, isScreenReaderEnabled: true },
    );

    expect(out).toContain("foo");
    expect(out).not.toContain("visible");
    expect(onMount).not.toHaveBeenCalled();
  });

  it("renders the child subtree normally when SR is off", () => {
    const onMount = vi.fn();
    const Child = defineComponent({
      setup() {
        onMounted(onMount);
        return () => "visible";
      },
    });

    const out = renderToString(
      defineComponent({
        setup: () => () => h(Text, { "aria-label": "foo" }, () => h(Child)),
      }),
      { columns: 80, isScreenReaderEnabled: false },
    );

    expect(out).toContain("visible");
    expect(onMount).toHaveBeenCalledTimes(1);
  });
});
