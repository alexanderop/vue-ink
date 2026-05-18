import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { defineComponent, h, ref } from "vue";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { render } from "@vue-ink/testing-library";
import { Box, Text } from "../src/index.ts";
import { frame, renderToStringRaw } from "./helpers.ts";

let originalChalkLevel: typeof chalk.level;
beforeAll(() => {
  originalChalkLevel = chalk.level;
  chalk.level = 3;
});
afterAll(() => {
  chalk.level = originalChalkLevel;
});

describe("Text", () => {
  it("renders plain text", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => "hello world"),
    });
    const output = await renderToStringRaw(Demo);
    expect(stripAnsi(output)).toContain("hello world");
  });

  it("applies color (green)", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, { color: "green" }, () => "colored"),
    });
    const output = await renderToStringRaw(Demo);
    // ANSI green foreground = [32m
    expect(output).toMatch(/\[32m.*colored.*\[39m/);
    expect(stripAnsi(output)).toContain("colored");
  });

  it("applies backgroundColor (red)", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, { backgroundColor: "red" }, () => "bg"),
    });
    const output = await renderToStringRaw(Demo);
    expect(output).toMatch(/\[41m.*bg.*\[49m/);
  });

  it("applies bold", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, { bold: true }, () => "bold"),
    });
    const output = await renderToStringRaw(Demo);
    expect(output).toMatch(/\[1m.*bold.*\[22m/);
  });

  it("applies dimColor", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, { dimColor: true }, () => "dim"),
    });
    const output = await renderToStringRaw(Demo);
    expect(output).toMatch(/\[2m.*dim.*\[22m/);
  });
});

// Ported from repos/ink/test/text.tsx. Subset focused on user-visible
// behaviour; deep ANSI-stripping cases live in sanitize-ansi tests already.
describe("<Text>", () => {
  it("renders empty for undefined children", () => {
    expect(frame(() => h(Text))).toBe("");
  });

  it("renders empty for null/undefined slot return", () => {
    expect(frame(() => h(Text, null, () => undefined))).toBe("");
  });

  it("renders standard color", () => {
    const output = frame(() => h(Text, { color: "green" }, () => "Test"));
    expect(output).toBe(chalk.green("Test"));
  });

  it("renders dim+bold (preserves ANSI)", () => {
    const output = frame(() => h(Text, { dimColor: true, bold: true }, () => "Test"));
    expect(stripAnsi(output)).toBe("Test");
    expect(output).not.toBe("Test");
  });

  it("renders dimmed color", () => {
    const output = frame(() => h(Text, { dimColor: true, color: "green" }, () => "Test"));
    expect(output).toBe(chalk.green.dim("Test"));
  });

  it("renders hex color", () => {
    const output = frame(() => h(Text, { color: "#FF8800" }, () => "Test"));
    expect(output).toBe(chalk.hex("#FF8800")("Test"));
  });

  it("renders rgb color", () => {
    const output = frame(() => h(Text, { color: "rgb(255, 136, 0)" }, () => "Test"));
    expect(output).toBe(chalk.rgb(255, 136, 0)("Test"));
  });

  it("renders ansi256 color", () => {
    const output = frame(() => h(Text, { color: "ansi256(194)" }, () => "Test"));
    expect(output).toBe(chalk.ansi256(194)("Test"));
  });

  it("renders standard background color", () => {
    const output = frame(() => h(Text, { backgroundColor: "green" }, () => "Test"));
    expect(output).toBe(chalk.bgGreen("Test"));
  });

  it("renders hex background color", () => {
    const output = frame(() => h(Text, { backgroundColor: "#FF8800" }, () => "Test"));
    expect(output).toBe(chalk.bgHex("#FF8800")("Test"));
  });

  it("renders rgb background color", () => {
    const output = frame(() => h(Text, { backgroundColor: "rgb(255, 136, 0)" }, () => "Test"));
    expect(output).toBe(chalk.bgRgb(255, 136, 0)("Test"));
  });

  it("renders ansi256 background color", () => {
    const output = frame(() => h(Text, { backgroundColor: "ansi256(194)" }, () => "Test"));
    expect(output).toBe(chalk.bgAnsi256(194)("Test"));
  });

  it("renders inverse", () => {
    const output = frame(() => h(Text, { inverse: true }, () => "Test"));
    expect(output).toBe(chalk.inverse("Test"));
  });

  // https://github.com/vadimdemedes/ink/issues/743 — "constructor" used to
  // be lost because of a prototype lookup leak.
  it('renders content "constructor" without dropping characters', () => {
    expect(frame(() => h(Text, null, () => "constructor"))).toBe("constructor");
  });

  it("remeasures text after a reactive change", async () => {
    const add = ref(false);
    const App = defineComponent({
      setup: () => () => h(Box, null, () => h(Text, null, () => (add.value ? "abcx" : "abc"))),
    });

    const { lastFrame, waitUntilFlush } = render(App);
    expect(lastFrame()).toBe("abc");

    add.value = true;
    await waitUntilFlush();
    expect(lastFrame()).toBe("abcx");
  });

  // https://github.com/vadimdemedes/ink/issues/867
  it("empty-to-nonempty interpolation does not wrap", async () => {
    const show = ref(false);
    const App = defineComponent({
      setup: () => () => h(Box, null, () => h(Text, null, () => `${show.value ? "x" : ""}hello`)),
    });

    const { lastFrame, waitUntilFlush } = render(App);
    expect(lastFrame()).toBe("hello");

    show.value = true;
    await waitUntilFlush();
    expect(lastFrame()).toBe("xhello");
  });
});

describe("text composition", () => {
  it("plain text", () => {
    expect(frame(() => h(Text, null, () => "Hello World"))).toBe("Hello World");
  });

  it("text with variable interpolation", () => {
    expect(frame(() => h(Text, null, () => `Count: ${1}`))).toBe("Count: 1");
  });

  it("multiple text fragments in a slot", () => {
    expect(frame(() => h(Text, null, () => ["Hello", " World"]))).toBe("Hello World");
  });

  it("text composed from nested <Text>", () => {
    expect(frame(() => h(Text, null, () => ["Hello ", h(Text, null, () => "World")]))).toBe(
      "Hello World",
    );
  });
});

describe("text wrapping", () => {
  it("soft wrap fits within width", () => {
    const output = frame(() =>
      h(Box, { width: 7 }, () => h(Text, { wrap: "wrap" }, () => "Hello World")),
    );
    expect(output).toBe("Hello\nWorld");
  });

  it("does not wrap when there is enough space", () => {
    const output = frame(() =>
      h(Box, { width: 20 }, () => h(Text, { wrap: "wrap" }, () => "Hello World")),
    );
    expect(output).toBe("Hello World");
  });

  it("hard wrap breaks at width boundary", () => {
    const output = frame(() =>
      h(Box, { width: 7 }, () => h(Text, { wrap: "hard" }, () => "Hello World")),
    );
    expect(output).toBe("Hello W\norld");
  });

  it("hard wrap with long word", () => {
    const output = frame(() =>
      h(Box, { width: 5 }, () => h(Text, { wrap: "hard" }, () => "aaaaaaaaaa")),
    );
    expect(output).toBe("aaaaa\naaaaa");
  });

  it("does not hard wrap when there is enough space", () => {
    const output = frame(() =>
      h(Box, { width: 20 }, () => h(Text, { wrap: "hard" }, () => "Hello World")),
    );
    expect(output).toBe("Hello World");
  });

  it("truncate text in the end", () => {
    const output = frame(() =>
      h(Box, { width: 7 }, () => h(Text, { wrap: "truncate" }, () => "Hello World")),
    );
    expect(output).toBe("Hello …");
  });

  it("truncate text in the middle", () => {
    const output = frame(() =>
      h(Box, { width: 7 }, () => h(Text, { wrap: "truncate-middle" }, () => "Hello World")),
    );
    expect(output).toBe("Hel…rld");
  });

  it("truncate text in the beginning", () => {
    const output = frame(() =>
      h(Box, { width: 7 }, () => h(Text, { wrap: "truncate-start" }, () => "Hello World")),
    );
    expect(output).toBe("… World");
  });
});
