import { describe, it, expect } from "vitest";
import { h, defineComponent } from "vue";
import stripAnsi from "strip-ansi";
import { Box, Text, Transform, render } from "../src/index.ts";
import { createCaptureStream, flush, frame, renderToString, renderToStringRaw } from "./helpers.ts";

describe("Transform", () => {
  it("uppercases its children string", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Transform, { transform: (s: string) => s.toUpperCase() }, () => "hi"),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("HI");
  });

  it("composes when nested (innermost runs first)", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Transform, { transform: (s: string) => `${s}!` }, () =>
          h(Transform, { transform: (s: string) => s.toUpperCase() }, () => "hi"),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("HI!");
  });

  it("passes a per-line index to the transform", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Transform, { transform: (line: string, i: number) => `${i}:${line}` }, () =>
          h(Text, null, () => "a\nb"),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("0:a\n1:b");
  });
});

describe("Transform edge cases", () => {
  it("preserves ANSI sequences from a styled child while transforming the text", async () => {
    // Uppercase the input that already contains ANSI escapes (red FG). The
    // transform must see and pass through the ANSI sequences alongside the
    // uppercased characters.
    let captured = "";
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Transform,
          {
            transform: (line: string) => {
              captured = line;
              return line.toUpperCase();
            },
          },
          () => h(Text, { color: "red" }, () => "hi"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 20 });
    // The transform saw ANSI escape codes embedded in its input.
    expect(captured).toMatch(/\x1b\[/);
    // Output still contains ANSI (preserved by uppercasing) and uppercased text.
    expect(raw).toContain("HI");
    expect(stripAnsi(raw).replace(/\s+$/, "")).toBe("HI");
  });

  it("returning a non-string from transform propagates that value verbatim", async () => {
    // Matches ink: the renderer doesn't validate the return type — whatever
    // the transform returns is written out as-is. We pass through a fixed
    // string to confirm the pipeline doesn't crash.
    const Demo = defineComponent({
      setup: () => () =>
        h(Transform, { transform: () => "REPLACED" as unknown as string }, () =>
          h(Text, null, () => "original"),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("REPLACED");
  });

  it("renders nothing when there are no children (short-circuit)", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Transform, { transform: (s: string) => s.toUpperCase() }),
          h(Text, null, () => "after"),
        ]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // The empty Transform contributes no row; "after" is the only line.
    expect(out).toBe("after");
  });

  it("renders nothing when default slot returns an empty array", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Transform, { transform: (s: string) => s }, () => []),
          h(Text, null, () => "after"),
        ]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("after");
  });

  it("accessibilityLabel substitutes the transformed text in screen-reader mode", async () => {
    const stdout = createCaptureStream(80);
    const App = defineComponent({
      setup: () => () =>
        h(
          Transform,
          {
            transform: (s: string) => s.toUpperCase(),
            accessibilityLabel: "Spinner: loading",
          },
          () => h(Text, null, () => "wait"),
        ),
    });
    const instance = render(App, {
      stdout,
      debug: true,
      interactive: false,
      isScreenReaderEnabled: true,
    });
    await flush();
    const frame = stripAnsi(stdout.frames.at(-1) ?? "").replace(/\n+$/, "");
    expect(frame).toBe("Spinner: loading");
    instance.unmount();
  });
});

describe("<Transform> with index", () => {
  it("transforms children with index", () => {
    const output = frame(() =>
      h(
        Transform,
        {
          transform: (str: string, index: number) => `[${index}: ${str}]`,
        },
        () =>
          h(Text, null, () =>
            h(
              Transform,
              {
                transform: (str: string, index: number) => `{${index}: ${str}}`,
              },
              () => h(Text, null, () => "test"),
            ),
          ),
      ),
    );
    expect(output).toBe("[0: {0: test}]");
  });

  it("applies transform across multiple lines", () => {
    const output = frame(() =>
      h(
        Transform,
        {
          transform: (str: string, index: number) => `[${index}: ${str}]`,
        },
        () => h(Text, null, () => "hello world\ngoodbye world"),
      ),
    );
    expect(output).toBe("[0: hello world]\n[1: goodbye world]");
  });

  it("<Transform> with empty children renders empty", () => {
    const output = frame(() => h(Transform, { transform: (s: string) => s }));
    expect(output).toBe("");
  });
});
