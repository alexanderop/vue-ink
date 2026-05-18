import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { defineComponent, h, ref } from "vue";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { render } from "@vue-ink/testing-library";
import { Box, Text } from "../src/index.ts";
import { frame, renderToString, renderToStringRaw } from "./helpers.ts";

// Ported from repos/ink/test/background.tsx. We assert against raw ANSI for
// the fill-region tests because vue-ink (like ink) emits continuous escape
// runs rather than per-cell chalk wraps.
const ansi = {
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgHexRed: "\x1b[48;2;255;0;0m",
  bgAnsi256Nine: "\x1b[48;5;9m",
  bgReset: "\x1b[49m",
} as const;

// Tests rely on FORCE_COLOR semantics; lock chalk to truecolor for stability.
let originalLevel: typeof chalk.level;
beforeAll(() => {
  originalLevel = chalk.level;
  chalk.level = 3;
});
afterAll(() => {
  chalk.level = originalLevel;
});

describe("Box backgroundColor", () => {
  it("fills the box area with the background color", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { backgroundColor: "red", width: 4, height: 2 }, () => h(Text, null, () => "hi")),
    });
    const raw = await renderToStringRaw(Demo, { columns: 20 });
    // Red bg = [41m. Painted cells (spaces + "hi") should be wrapped.
    expect(raw).toMatch(/\[41m/);
    expect(stripAnsi(raw).replace(/\n+$/, "")).toContain("hi");
  });

  it("inherits background to descendant Text", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { backgroundColor: "red", width: 4, height: 1 }, () => h(Text, null, () => "x")),
    });
    const raw = await renderToStringRaw(Demo, { columns: 20 });
    // The 'x' itself should be painted on red bg (not just the box fill).
    expect(raw).toMatch(/\[41m[^]*x[^]*\[49m/);
  });

  it("Text can override inherited background", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { backgroundColor: "red", width: 4, height: 1 }, () =>
          h(Text, { backgroundColor: "blue" }, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 20 });
    // Text 'x' carries blue (44), not the inherited red around itself.
    expect(raw).toMatch(/\[44m[^]*x[^]*\[49m/);
  });

  it("respects border insets — does not paint over the border", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", backgroundColor: "red", width: 6, height: 3 }, () =>
          h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 20 });
    const plain = stripAnsi(raw).replace(/\n+$/, "");
    expect(plain).toBe(["┌────┐", "│x   │", "└────┘"].join("\n"));
    // And background red [41m must appear somewhere (for the inner fill).
    expect(raw).toMatch(/\[41m/);
  });
});

describe("background", () => {
  it("Text inherits parent Box background color", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "green", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello World"),
      ),
    );
    expect(output).toBe(chalk.bgGreen("Hello World"));
  });

  it("Text explicit background color overrides inherited", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "red", alignSelf: "flex-start" }, () =>
        h(Text, { backgroundColor: "blue" }, () => "Hello World"),
      ),
    );
    expect(output).toBe(chalk.bgBlue("Hello World"));
  });

  it("Nested Box background inheritance", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "red", alignSelf: "flex-start" }, () =>
        h(Box, { backgroundColor: "blue" }, () => h(Text, null, () => "Hello World")),
      ),
    );
    expect(output).toBe(chalk.bgBlue("Hello World"));
  });

  it("Text without parent Box background has no inheritance", () => {
    const output = frame(() =>
      h(Box, { alignSelf: "flex-start" }, () => h(Text, null, () => "Hello World")),
    );
    expect(output).toBe("Hello World");
  });

  it("Multiple Text elements inherit same background", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "yellow", alignSelf: "flex-start" }, () => [
        h(Text, null, () => "Hello "),
        h(Text, null, () => "World"),
      ]),
    );
    expect(output).toBe(chalk.bgYellow("Hello World"));
  });

  it("Mixed text with and without background inheritance", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "green", alignSelf: "flex-start" }, () => [
        h(Text, null, () => "Inherited "),
        h(Text, { backgroundColor: "" }, () => "No BG "),
        h(Text, { backgroundColor: "red" }, () => "Red BG"),
      ]),
    );
    expect(output).toBe(`${chalk.bgGreen("Inherited ")}No BG ${chalk.bgRed("Red BG")}`);
  });

  it("Complex nested structure with background inheritance", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "yellow", alignSelf: "flex-start" }, () =>
        h(Box, null, () => [
          h(Text, null, () => "Outer: "),
          h(Box, { backgroundColor: "blue" }, () => [
            h(Text, null, () => "Inner: "),
            h(Text, { backgroundColor: "red" }, () => "Explicit"),
          ]),
        ]),
      ),
    );
    expect(output).toBe(
      `${ansi.bgYellow}Outer: ${ansi.bgBlue}Inner: ${ansi.bgRed}Explicit${ansi.bgReset}`,
    );
  });

  it("Box background with standard color", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "red", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toBe(chalk.bgRed("Hello"));
  });

  it("Box background with hex color", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "#FF0000", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toBe(chalk.bgHex("#FF0000")("Hello"));
  });

  it("Box background with rgb color", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "rgb(255, 0, 0)", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toBe(chalk.bgRgb(255, 0, 0)("Hello"));
  });

  it("Box background with ansi256 color", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "ansi256(9)", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toBe(chalk.bgAnsi256(9)("Hello"));
  });

  it("Box background with wide characters", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "yellow", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "こんにちは"),
      ),
    );
    expect(output).toBe(chalk.bgYellow("こんにちは"));
  });

  it("Box background with emojis", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "red", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "🎉🎊"),
      ),
    );
    expect(output).toBe(chalk.bgRed("🎉🎊"));
  });

  it("Box background fills entire area with standard color", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "red",
          width: 10,
          height: 3,
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toContain(ansi.bgRed);
    expect(output).toContain(ansi.bgReset);
    expect(output).toContain("Hello");
    expect(output).toContain(`${ansi.bgRed}          ${ansi.bgReset}`);
  });

  it("Box background fills with hex color", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "#FF0000",
          width: 10,
          height: 3,
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toContain("Hello");
    expect(output).toContain(ansi.bgHexRed);
    expect(output).toContain(ansi.bgReset);
  });

  it("Box background fills with rgb color", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "rgb(255, 0, 0)",
          width: 10,
          height: 3,
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toContain("Hello");
    expect(output).toContain(ansi.bgHexRed);
    expect(output).toContain(ansi.bgReset);
  });

  it("Box background fills with ansi256 color", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "ansi256(9)",
          width: 10,
          height: 3,
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hello"),
      ),
    );
    expect(output).toContain("Hello");
    expect(output).toContain(ansi.bgAnsi256Nine);
    expect(output).toContain(ansi.bgReset);
  });

  it("Box background with border fills content area", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "cyan",
          borderStyle: "round",
          width: 10,
          height: 5,
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hi"),
      ),
    );
    expect(output).toContain("Hi");
    expect(output).toContain(ansi.bgCyan);
    expect(output).toContain(ansi.bgReset);
    expect(output).toContain("╭");
    expect(output).toContain("╮");
  });

  it("Box background with padding fills entire padded area", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "magenta",
          padding: 1,
          width: 10,
          height: 5,
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hi"),
      ),
    );
    expect(output).toContain("Hi");
    expect(output).toContain(ansi.bgMagenta);
    expect(output).toContain(ansi.bgReset);
  });

  it("Box background with center alignment fills entire area", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "blue",
          width: 10,
          height: 3,
          justifyContent: "center",
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hi"),
      ),
    );
    expect(output).toContain("Hi");
    expect(output).toContain(ansi.bgBlue);
    expect(output).toContain(ansi.bgReset);
  });

  it("Box background with column layout fills entire area", () => {
    const output = frame(() =>
      h(
        Box,
        {
          backgroundColor: "green",
          flexDirection: "column",
          width: 10,
          height: 5,
          alignSelf: "flex-start",
        },
        () => [h(Text, null, () => "Line 1"), h(Text, null, () => "Line 2")],
      ),
    );
    expect(output).toContain("Line 1");
    expect(output).toContain("Line 2");
    expect(output).toContain(ansi.bgGreen);
    expect(output).toContain(ansi.bgReset);
  });

  it("Box background updates on rerender", async () => {
    const bgColor = ref<string | undefined>(undefined);
    const Test = defineComponent({
      setup: () => () =>
        h(Box, { backgroundColor: bgColor.value, alignSelf: "flex-start" }, () =>
          h(Text, null, () => "Hello"),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);

    expect(lastFrame()).toBe("Hello");

    bgColor.value = "green";
    await waitUntilFlush();
    expect(lastFrame()).toBe(chalk.bgGreen("Hello"));

    bgColor.value = undefined;
    await waitUntilFlush();
    expect(lastFrame()).toBe("Hello");

    unmount();
  });

  it("Box backgroundColor fills full width on every line when text wraps", () => {
    const output = frame(() =>
      h(Box, { backgroundColor: "red", width: 10, alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello World!!"),
      ),
    );
    expect(output).toBe(
      `${ansi.bgRed}Hello     ${ansi.bgReset}\n${ansi.bgRed}World!!   ${ansi.bgReset}`,
    );
  });

  it("Text-only backgroundColor colors text content but does not fill Box width", () => {
    const output = frame(() =>
      h(Box, { width: 10, alignSelf: "flex-start" }, () =>
        h(Text, { backgroundColor: "red" }, () => "Hello World!!"),
      ),
    );
    expect(output).toBe(`${ansi.bgRed}Hello ${ansi.bgReset}\n${ansi.bgRed}World!!${ansi.bgReset}`);
  });
});

describe("background: contentWidth/Height edge cases", () => {
  // what this catches: when borders collapse the content area to
  // width 0 (or height 0), the background paint must bail out before
  // writing. Regression would write past the buffer or NaN-stripe.
  it("skips background paint when content area is zero", async () => {
    // width 2 + border on both sides → contentWidth = 0; the background
    // paint should bail out early without writing anything.
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            width: 2,
            height: 2,
            borderStyle: "single",
            backgroundColor: "red",
          },
          () => null,
        ),
    });
    const out = await renderToString(Demo, { columns: 10 });
    expect(out.length).toBeGreaterThan(0);
  });
});
