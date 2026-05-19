import { describe, it, expect } from "vitest";
import { defineComponent, h, onBeforeMount, onUnmounted, ref } from "vue";
import stripAnsi from "strip-ansi";
import boxen from "boxen";
import chalk from "chalk";
import {
  Box,
  Newline,
  Spacer,
  Static,
  Text,
  Transform,
  renderToString,
  useApp,
  useInput,
  useStdin,
  useStdout,
  useStderr,
  useFocus,
  useFocusManager,
} from "../src/index.ts";

// Public renderToString — non-test consumers reach for this when they want
// the rendered output as a string (docs, snapshot fixtures, file output)
// without spinning up a live terminal session.

describe("renderToString", () => {
  it("renders plain text synchronously", () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => "Hello world"),
    });
    const out = renderToString(Demo);
    expect(stripAnsi(out)).toBe("Hello world");
  });

  it("preserves ANSI styling in the output", () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, { color: "green" }, () => "green"),
    });
    const out = renderToString(Demo);
    // Stripping yields the plain text; the raw output keeps the escape.
    expect(stripAnsi(out)).toBe("green");
    expect(out).not.toBe("green");
    expect(out).toMatch(/\x1b\[/);
  });

  it("lays out <Box> children with the default 80-column width", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 20, justifyContent: "space-between" }, () => [
          h(Text, null, () => "A"),
          h(Text, null, () => "B"),
        ]),
    });
    const out = stripAnsi(renderToString(Demo));
    expect(out).toBe("A                  B");
  });

  it("honors the `columns` option for the virtual terminal width", () => {
    // A flexGrow box should fill the requested column width.
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () =>
          h(Box, { width: "100%" }, () => h(Text, null, () => "x")),
        ),
    });
    const wide = stripAnsi(renderToString(Demo, { columns: 40 }));
    const narrow = stripAnsi(renderToString(Demo, { columns: 10 }));
    expect(wide.split("\n")[0]!.length).toBeGreaterThanOrEqual(narrow.split("\n")[0]!.length);
  });

  it("resizes content when columns shrinks", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: "100%", justifyContent: "space-between" }, () => [
          h(Text, null, () => "L"),
          h(Text, null, () => "R"),
        ]),
    });
    const at40 = stripAnsi(renderToString(Demo, { columns: 40 }));
    const at10 = stripAnsi(renderToString(Demo, { columns: 10 }));
    expect(at40).toBe(`L${" ".repeat(38)}R`);
    expect(at10).toBe(`L${" ".repeat(8)}R`);
  });

  it("does not throw when components mount terminal composables", () => {
    // Each composable here would normally need a terminal session. The
    // no-op contexts inside renderToString must satisfy them — the
    // component should mount, render, and unmount without surprises.
    const Demo = defineComponent({
      setup() {
        useApp();
        useStdin();
        useStdout();
        useStderr();
        useFocusManager();
        useFocus();
        useInput(() => {});
        return () => h(Text, null, () => "ok");
      },
    });
    expect(() => renderToString(Demo)).not.toThrow();
    expect(stripAnsi(renderToString(Demo))).toBe("ok");
  });

  it("captures the first synchronous frame even if state changes after mount", () => {
    // Mirrors React renderToString: post-mount async effects don't reach
    // the returned string.
    const Demo = defineComponent({
      setup() {
        const label = ref("initial");
        queueMicrotask(() => {
          label.value = "after";
        });
        return () => h(Text, null, () => label.value);
      },
    });
    const out = stripAnsi(renderToString(Demo));
    expect(out).toBe("initial");
  });

  it("re-throws errors raised during component setup", () => {
    const Boom = defineComponent({
      setup() {
        throw new Error("boom");
      },
    });
    expect(() => renderToString(Boom)).toThrow(/boom/);
  });

  it("renders a box with paddingLeft", () => {
    const Demo = defineComponent({
      setup: () => () => h(Box, { paddingLeft: 2 }, () => h(Text, null, () => "Padded")),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("  Padded");
  });

  it("renders a box with marginLeft", () => {
    const Demo = defineComponent({
      setup: () => () => h(Box, { marginLeft: 2 }, () => h(Text, null, () => "Margined")),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("  Margined");
  });

  it("renders gap between row items", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { gap: 1 }, () => [h(Text, null, () => "A"), h(Text, null, () => "B")]),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("A B");
  });

  it("renders a box with fixed width and height as a 3-line block", () => {
    const Demo = defineComponent({
      setup: () => () => h(Box, { width: 10, height: 3 }, () => h(Text, null, () => "Hi")),
    });
    const lines = renderToString(Demo).split("\n");
    expect(lines.length).toBe(3);
  });

  it("renders <Spacer> pushing siblings to opposite ends of the row", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 20 }, () => [
          h(Text, null, () => "Left"),
          h(Spacer),
          h(Text, null, () => "Right"),
        ]),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("Left           Right");
  });

  it("renders <Newline> as a blank row in a column-direction box", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "Above"),
          h(Newline),
          h(Text, null, () => "Below"),
        ]),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("Above\n\n\nBelow");
  });

  it("renders a box with a single-line border matching boxen", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", width: 20 }, () => h(Text, null, () => "Bordered")),
    });
    const out = renderToString(Demo, { columns: 20 });
    expect(out).toBe(boxen("Bordered", { width: 20, borderStyle: "single" }));
  });

  it("renders bold text with chalk-equivalent ANSI escapes", () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, { bold: true }, () => "Bold"),
    });
    const out = renderToString(Demo);
    expect(stripAnsi(out)).toBe("Bold");
    expect(out).toMatch(/\x1b\[/);
    expect(out).toBe(chalk.bold("Bold"));
  });

  it("wraps text at the given width when wrap='wrap'", () => {
    const Demo = defineComponent({
      setup: () => () => h(Box, { width: 7 }, () => h(Text, { wrap: "wrap" }, () => "Hello World")),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("Hello\nWorld");
  });

  it("truncates text with an ellipsis when wrap='truncate'", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 7 }, () => h(Text, { wrap: "truncate" }, () => "Hello World")),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("Hello …");
  });

  it("defaults to 80 columns when no columns option is given", () => {
    const longText = "A".repeat(100);
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => longText),
    });
    const lines = renderToString(Demo).split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toBe("A".repeat(80));
    expect(lines[1]).toBe("A".repeat(20));
  });

  it("renders <Transform> by applying the function to its children", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Transform, { transform: (s: string) => s.toUpperCase() }, () =>
          h(Text, null, () => "hello"),
        ),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("HELLO");
  });

  it("renders <Static> items above a dynamic sibling", () => {
    const items = ["A", "B", "C"];
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(
            Static,
            { items },
            { default: ({ item }: { item: string }) => h(Text, { key: item }, () => item) },
          ),
          h(Text, null, () => "Dynamic"),
        ]),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("A\nB\nC\nDynamic");
  });

  it("renders <Static> alone with no trailing newline", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Static,
          { items: ["A", "B"] },
          { default: ({ item }: { item: string }) => h(Text, { key: item }, () => item) },
        ),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("A\nB");
  });

  it("inserts exactly one newline between <Static> output and the dynamic frame", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(
            Static,
            { items: ["A", "B"] },
            { default: ({ item }: { item: string }) => h(Text, { key: item }, () => item) },
          ),
          h(Text, null, () => "Dynamic"),
        ]),
    });
    expect(stripAnsi(renderToString(Demo))).toBe("A\nB\nDynamic");
  });

  it("reflects state mutations made in onBeforeMount in the output", () => {
    // Vue equivalent of React's useLayoutEffect: a synchronous state update
    // before mount completes is captured in the first painted frame.
    const Demo = defineComponent({
      setup() {
        const text = ref("Initial");
        onBeforeMount(() => {
          text.value = "Layout Updated";
        });
        return () => h(Text, null, () => text.value);
      },
    });
    expect(stripAnsi(renderToString(Demo))).toBe("Layout Updated");
  });

  it("runs onUnmounted callbacks during teardown", () => {
    let cleanupRan = false;
    const Demo = defineComponent({
      setup() {
        onUnmounted(() => {
          cleanupRan = true;
        });
        return () => h(Text, null, () => "Cleanup test");
      },
    });
    const out = renderToString(Demo);
    expect(stripAnsi(out)).toBe("Cleanup test");
    expect(cleanupRan).toBe(true);
  });

  it("does not throw when raw text appears outside a <Text> wrapper", () => {
    // Divergence from ink: vue-ink's createText path returns an
    // unattached host text node so a stray string in a <Box> produces
    // empty output rather than the ink invariant error.
    const Demo = defineComponent({
      setup: () => () => h(Box, null, () => "raw text"),
    });
    expect(() => renderToString(Demo)).not.toThrow();
    expect(stripAnsi(renderToString(Demo))).toBe("");
  });

  it("recovers cleanly after a previous render threw during setup", () => {
    const Boom = defineComponent({
      setup() {
        throw new Error("Boom");
      },
    });
    const Healthy = defineComponent({
      setup: () => () => h(Text, null, () => "Still works"),
    });
    expect(() => renderToString(Boom)).toThrow(/Boom/);
    expect(stripAnsi(renderToString(Healthy))).toBe("Still works");
  });

  it("can be called multiple times independently", () => {
    const First = defineComponent({
      setup: () => () => h(Text, null, () => "First"),
    });
    const Second = defineComponent({
      setup: () => () => h(Text, null, () => "Second"),
    });
    expect(stripAnsi(renderToString(First))).toBe("First");
    expect(stripAnsi(renderToString(Second))).toBe("Second");
  });

  it("renders a deeply nested component tree", () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () =>
          h(Box, { paddingLeft: 1 }, () =>
            h(Box, null, () =>
              h(Text, { bold: true }, () => ["Nested ", h(Text, { color: "green" }, () => "deep")]),
            ),
          ),
        ),
    });
    const out = stripAnsi(renderToString(Demo));
    expect(out).toContain("Nested");
    expect(out).toContain("deep");
  });
});
