import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { defineComponent, h, ref } from "vue";
import boxen from "boxen";
import indentString from "indent-string";
import cliBoxes from "cli-boxes";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { render } from "@vue-ink/testing-library";
import { Box, Text } from "../src/index.ts";
import { frame, renderToString, renderToStringRaw } from "./helpers.ts";

type BoxStyle = {
  topLeft: string;
  top: string;
  topRight: string;
  right: string;
  bottomRight: string;
  bottom: string;
  bottomLeft: string;
  left: string;
};

// Ported from repos/ink/test/borders.tsx + border-backgrounds.tsx, plus the
// renderToString-based unit tests originally in Border.test.ts. The
// boxen/indent-string/cli-boxes/chalk libraries serve as oracles — if the
// underlying ANSI semantics shift, the test fails alongside whatever
// vue-ink/ink would have produced.

const ESC_BB = "\x1b";

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let originalChalkLevel: typeof chalk.level;
beforeAll(() => {
  originalChalkLevel = chalk.level;
  chalk.level = 3;
});
afterAll(() => {
  chalk.level = originalChalkLevel;
});

describe("borders", () => {
  it("single node - full width box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round" }, () => h(Text, null, () => "Hello World")),
    );

    expect(output).toBe(boxen("Hello World", { width: 100, borderStyle: "round" }));
  });

  it("single node - full width box with colorful border", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", borderColor: "green" }, () =>
        h(Text, null, () => "Hello World"),
      ),
    );

    expect(output).toBe(
      boxen("Hello World", {
        width: 100,
        borderStyle: "round",
        borderColor: "green",
      }),
    );
  });

  it("single node - fit-content box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello World"),
      ),
    );

    expect(output).toBe(boxen("Hello World", { borderStyle: "round" }));
  });

  it("single node - fit-content box with wide characters", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "こんにちは"),
      ),
    );

    expect(output).toBe(boxen("こんにちは", { borderStyle: "round" }));
  });

  it("single node - fit-content box with emojis", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () => h(Text, null, () => "🌊🌊")),
    );

    expect(output).toBe(boxen("🌊🌊", { borderStyle: "round" }));
  });

  it("single node - fit-content box with variation selector emojis", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () =>
        h(Text, null, () => "🌡️⚠️✅"),
      ),
    );

    expect(output).toBe(boxen("🌡️⚠️✅", { borderStyle: "round" }));
  });

  it("single node - fixed width box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 20 }, () => h(Text, null, () => "Hello World")),
    );

    expect(output).toBe(boxen("Hello World".padEnd(18, " "), { borderStyle: "round" }));
  });

  it("single node - fixed width and height box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 20, height: 20 }, () =>
        h(Text, null, () => "Hello World"),
      ),
    );

    expect(output).toBe(
      boxen("Hello World".padEnd(18, " ") + "\n".repeat(17), {
        borderStyle: "round",
      }),
    );
  });

  it("single node - box with padding", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", padding: 1, alignSelf: "flex-start" }, () =>
        h(Text, null, () => "Hello World"),
      ),
    );

    expect(output).toBe(boxen("\n Hello World \n", { borderStyle: "round" }));
  });

  it("single node - box with horizontal alignment", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 20, justifyContent: "center" }, () =>
        h(Text, null, () => "Hello World"),
      ),
    );

    expect(output).toBe(boxen("   Hello World    ", { borderStyle: "round" }));
  });

  it("single node - box with vertical alignment", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "round",
          height: 20,
          alignItems: "center",
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hello World"),
      ),
    );

    expect(output).toBe(
      boxen(`${"\n".repeat(8)}Hello World${"\n".repeat(9)}`, {
        borderStyle: "round",
      }),
    );
  });

  it("single node - box with wrapping", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 10 }, () => h(Text, null, () => "Hello World")),
    );

    expect(output).toBe(boxen("Hello   \nWorld", { borderStyle: "round" }));
  });

  it("multiple nodes - full width box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round" }, () => h(Text, null, () => ["Hello ", "World"])),
    );

    expect(output).toBe(boxen("Hello World", { width: 100, borderStyle: "round" }));
  });

  it("multiple nodes - full width box with colorful border", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", borderColor: "green" }, () =>
        h(Text, null, () => ["Hello ", "World"]),
      ),
    );

    expect(output).toBe(
      boxen("Hello World", {
        width: 100,
        borderStyle: "round",
        borderColor: "green",
      }),
    );
  });

  it("multiple nodes - fit-content box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () =>
        h(Text, null, () => ["Hello ", "World"]),
      ),
    );

    expect(output).toBe(boxen("Hello World", { borderStyle: "round" }));
  });

  it("multiple nodes - fixed width box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 20 }, () => h(Text, null, () => ["Hello ", "World"])),
    );

    expect(output).toBe(boxen("Hello World".padEnd(18, " "), { borderStyle: "round" }));
  });

  it("multiple nodes - fixed width and height box", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 20, height: 20 }, () =>
        h(Text, null, () => ["Hello ", "World"]),
      ),
    );

    expect(output).toBe(
      boxen("Hello World".padEnd(18, " ") + "\n".repeat(17), {
        borderStyle: "round",
      }),
    );
  });

  it("multiple nodes - box with padding", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", padding: 1, alignSelf: "flex-start" }, () =>
        h(Text, null, () => ["Hello ", "World"]),
      ),
    );

    expect(output).toBe(boxen("\n Hello World \n", { borderStyle: "round" }));
  });

  it("multiple nodes - box with horizontal alignment", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 20, justifyContent: "center" }, () =>
        h(Text, null, () => ["Hello ", "World"]),
      ),
    );

    expect(output).toBe(boxen("   Hello World    ", { borderStyle: "round" }));
  });

  it("multiple nodes - box with vertical alignment", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "round",
          height: 20,
          alignItems: "center",
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => ["Hello ", "World"]),
      ),
    );

    expect(output).toBe(
      boxen(`${"\n".repeat(8)}Hello World${"\n".repeat(9)}`, {
        borderStyle: "round",
      }),
    );
  });

  it("multiple nodes - box with wrapping", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 10 }, () => h(Text, null, () => ["Hello ", "World"])),
    );

    expect(output).toBe(boxen("Hello   \nWorld", { borderStyle: "round" }));
  });

  it("multiple nodes - box with wrapping and long first node", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 10 }, () =>
        h(Text, null, () => ["Helloooooo", " World"]),
      ),
    );

    expect(output).toBe(boxen("Helloooo\noo World", { borderStyle: "round" }));
  });

  it("multiple nodes - box with wrapping and very long first node", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 10 }, () =>
        h(Text, null, () => ["Hellooooooooooooo", " World"]),
      ),
    );

    expect(output).toBe(boxen("Helloooo\noooooooo\no World", { borderStyle: "round" }));
  });

  it("nested boxes", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", width: 40, padding: 1 }, () =>
        h(Box, { borderStyle: "round", justifyContent: "center", padding: 1 }, () =>
          h(Text, null, () => "Hello World"),
        ),
      ),
    );

    const nestedBox = indentString(boxen("\n Hello World \n", { borderStyle: "round" }), 1);

    expect(output).toBe(boxen(`${" ".repeat(38)}\n${nestedBox}\n`, { borderStyle: "round" }));
  });

  it("nested boxes - fit-content box with wide characters on flex-direction row", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () => [
        h(Box, { borderStyle: "round" }, () => h(Text, null, () => "ミスター")),
        h(Box, { borderStyle: "round" }, () => h(Text, null, () => "スポック")),
        h(Box, { borderStyle: "round" }, () => h(Text, null, () => "カーク船長")),
      ]),
    );

    const box1 = boxen("ミスター", { borderStyle: "round" });
    const box2 = boxen("スポック", { borderStyle: "round" });
    const box3 = boxen("カーク船長", { borderStyle: "round" });

    const expected = boxen(
      box1
        .split("\n")
        .map((line, index) => line + box2.split("\n")[index]! + box3.split("\n")[index]!)
        .join("\n"),
      { borderStyle: "round" },
    );

    expect(output).toBe(expected);
  });

  it("nested boxes - fit-content box with emojis on flex-direction row", () => {
    const output = frame(() =>
      h(Box, { borderStyle: "round", alignSelf: "flex-start" }, () => [
        h(Box, { borderStyle: "round" }, () => h(Text, null, () => "🦾")),
        h(Box, { borderStyle: "round" }, () => h(Text, null, () => "🌏")),
        h(Box, { borderStyle: "round" }, () => h(Text, null, () => "😋")),
      ]),
    );

    const box1 = boxen("🦾", { borderStyle: "round" });
    const box2 = boxen("🌏", { borderStyle: "round" });
    const box3 = boxen("😋", { borderStyle: "round" });

    const expected = boxen(
      box1
        .split("\n")
        .map((line, index) => line + box2.split("\n")[index]! + box3.split("\n")[index]!)
        .join("\n"),
      { borderStyle: "round" },
    );

    expect(output).toBe(expected);
  });

  it("nested boxes - fit-content box with wide characters on flex-direction column", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "round",
          alignSelf: "flex-start",
          flexDirection: "column",
        },
        () => [
          h(Box, { borderStyle: "round" }, () => h(Text, null, () => "ミスター")),
          h(Box, { borderStyle: "round" }, () => h(Text, null, () => "スポック")),
          h(Box, { borderStyle: "round" }, () => h(Text, null, () => "カーク船長")),
        ],
      ),
    );

    const expected = boxen(
      `${boxen("ミスター  ", { borderStyle: "round" })}\n${boxen("スポック  ", {
        borderStyle: "round",
      })}\n${boxen("カーク船長", { borderStyle: "round" })}`,
      { borderStyle: "round" },
    );

    expect(output).toBe(expected);
  });

  it("nested boxes - fit-content box with emojis on flex-direction column", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "round",
          alignSelf: "flex-start",
          flexDirection: "column",
        },
        () => [
          h(Box, { borderStyle: "round" }, () => h(Text, null, () => "🦾")),
          h(Box, { borderStyle: "round" }, () => h(Text, null, () => "🌏")),
          h(Box, { borderStyle: "round" }, () => h(Text, null, () => "😋")),
        ],
      ),
    );

    const expected = boxen(
      `${boxen("🦾", { borderStyle: "round" })}\n${boxen("🌏", { borderStyle: "round" })}\n${boxen(
        "😋",
        { borderStyle: "round" },
      )}`,
      { borderStyle: "round" },
    );

    expect(output).toBe(expected);
  });

  it("render border after update", async () => {
    const borderColor = ref<string | undefined>(undefined);
    const Test = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "round", borderColor: borderColor.value }, () =>
          h(Text, null, () => "Hello World"),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);

    expect(lastFrame()).toBe(boxen("Hello World", { width: 100, borderStyle: "round" }));

    borderColor.value = "green";
    await waitUntilFlush();

    expect(lastFrame()).toBe(
      boxen("Hello World", {
        width: 100,
        borderStyle: "round",
        borderColor: "green",
      }),
    );

    borderColor.value = undefined;
    await waitUntilFlush();

    expect(lastFrame()).toBe(boxen("Hello World", { width: 100, borderStyle: "round" }));

    unmount();
  });

  it("render border edge changes after update when borderStyle is unchanged", async () => {
    const borderTop = ref<boolean | undefined>(undefined);
    const Test = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "round",
            borderTop: borderTop.value,
            alignSelf: "flex-start",
          },
          () => h(Text, null, () => "Content"),
        ),
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);

    expect(lastFrame()).toBe(boxen("Content", { borderStyle: "round" }));

    borderTop.value = false;
    await waitUntilFlush();

    expect(lastFrame()).toBe(
      [
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
      ].join("\n"),
    );

    borderTop.value = undefined;
    await waitUntilFlush();

    expect(lastFrame()).toBe(boxen("Content", { borderStyle: "round" }));

    unmount();
  });

  it("hide top border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderTop: false }, () => h(Text, null, () => "Content")),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  it("hide bottom border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderBottom: false }, () => h(Text, null, () => "Content")),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        "Below",
      ].join("\n"),
    );
  });

  it("hide top and bottom borders", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(
          Box,
          {
            borderStyle: "round",
            borderTop: false,
            borderBottom: false,
          },
          () => h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      ["Above", `${cliBoxes.round.left}Content${cliBoxes.round.right}`, "Below"].join("\n"),
    );
  });

  it("hide left border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderLeft: false }, () => h(Text, null, () => "Content")),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottom.repeat(7)}${cliBoxes.round.bottomRight}`,
        "Below",
      ].join("\n"),
    );
  });

  it("hide right border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderRight: false }, () => h(Text, null, () => "Content")),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}`,
        `${cliBoxes.round.left}Content`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}`,
        "Below",
      ].join("\n"),
    );
  });

  it("hide left and right border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(
          Box,
          {
            borderStyle: "round",
            borderLeft: false,
            borderRight: false,
          },
          () => h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        cliBoxes.round.top.repeat(7),
        "Content",
        cliBoxes.round.bottom.repeat(7),
        "Below",
      ].join("\n"),
    );
  });

  it("hide all borders", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(
          Box,
          {
            borderStyle: "round",
            borderTop: false,
            borderBottom: false,
            borderLeft: false,
            borderRight: false,
          },
          () => h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(["Above", "Content", "Below"].join("\n"));
  });

  it("change color of top border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderTopColor: "green" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        chalk.green(
          `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        ),
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  it("change color of bottom border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderBottomColor: "green" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        chalk.green(
          `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
            cliBoxes.round.bottomRight
          }`,
        ),
        "Below",
      ].join("\n"),
    );
  });

  it("change color of left border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderLeftColor: "green" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${chalk.green(cliBoxes.round.left)}Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  it("change color of right border", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderStyle: "round", borderRightColor: "green" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${cliBoxes.round.left}Content${chalk.green(cliBoxes.round.right)}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  it("custom border style", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: {
            topLeft: "↘",
            top: "↓",
            topRight: "↙",
            left: "→",
            bottomLeft: "↗",
            bottom: "↑",
            bottomRight: "↖",
            right: "←",
          },
        },
        () => h(Text, null, () => "Content"),
      ),
    );

    expect(output).toBe(boxen("Content", { width: 100, borderStyle: "arrow" }));
  });

  it("dim border color", () => {
    const output = frame(() =>
      h(Box, { borderDimColor: true, borderStyle: "round" }, () => h(Text, null, () => "Content")),
    );

    expect(output).toBe(
      boxen("Content", {
        width: 100,
        borderStyle: "round",
        dimBorder: true,
      }),
    );
  });

  it("dim top border color", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderTopDimColor: true, borderStyle: "round" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        chalk.dim(
          `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        ),
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  it("dim bottom border color", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderBottomDimColor: true, borderStyle: "round" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${cliBoxes.round.left}Content${cliBoxes.round.right}`,
        chalk.dim(
          `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
            cliBoxes.round.bottomRight
          }`,
        ),
        "Below",
      ].join("\n"),
    );
  });

  it("dim left border color", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderLeftDimColor: true, borderStyle: "round" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${chalk.dim(cliBoxes.round.left)}Content${cliBoxes.round.right}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  it("dim right border color", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", alignItems: "flex-start" }, () => [
        h(Text, null, () => "Above"),
        h(Box, { borderRightDimColor: true, borderStyle: "round" }, () =>
          h(Text, null, () => "Content"),
        ),
        h(Text, null, () => "Below"),
      ]),
    );

    expect(output).toBe(
      [
        "Above",
        `${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
        `${cliBoxes.round.left}Content${chalk.dim(cliBoxes.round.right)}`,
        `${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
          cliBoxes.round.bottomRight
        }`,
        "Below",
      ].join("\n"),
    );
  });

  // Regression for ink #840 — dimBorder should not bleed into styled children.
  it("borderDimColor does not dim styled child Text touching left edge", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderDimColor: true,
          borderStyle: "round",
          alignSelf: "flex-start",
        },
        () => h(Text, { bold: true, color: "blue" }, () => "styled text"),
      ),
    );

    const styledText = chalk.bold(chalk.blue("styled text"));
    expect(output.includes(styledText)).toBe(true);

    const dimmedTopBorder = chalk.dim(
      cliBoxes.round.topLeft + cliBoxes.round.top.repeat(11) + cliBoxes.round.topRight,
    );
    expect(output.includes(dimmedTopBorder)).toBe(true);
  });
});

describe("border-backgrounds", () => {
  it("border with background color", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "single",
          borderColor: "white",
          borderBackgroundColor: "blue",
        },
        () => h(Box, { width: 4 }, () => h(Text, null, () => "Test")),
      ),
    );
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).toContain("└");
    expect(output).toContain("┘");
    expect(output).toContain("Test");
    expect(output).toContain(`${ESC_BB}[44m`);
  });

  it("border with different background colors per side", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "single",
          borderTopBackgroundColor: "red",
          borderBottomBackgroundColor: "blue",
          borderLeftBackgroundColor: "green",
          borderRightBackgroundColor: "yellow",
        },
        () => h(Box, { width: 4 }, () => h(Text, null, () => "Test")),
      ),
    );
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).toContain("└");
    expect(output).toContain("┘");
    expect(output).toContain("Test");
    expect(output).toContain(`${ESC_BB}[41m`);
    expect(output).toContain(`${ESC_BB}[42m`);
    expect(output).toContain(`${ESC_BB}[43m`);
    expect(output).toContain(`${ESC_BB}[44m`);
  });

  it("border background color fallback to general borderBackgroundColor", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "single",
          borderBackgroundColor: "magenta",
          borderTopBackgroundColor: "cyan",
        },
        () => h(Box, { width: 4 }, () => h(Text, null, () => "Test")),
      ),
    );
    expect(output).toContain("┌");
    expect(output).toContain("┐");
    expect(output).toContain("└");
    expect(output).toContain("┘");
    expect(output).toContain("Test");
    expect(output).toContain(`${ESC_BB}[46m`);
    expect(output).toContain(`${ESC_BB}[45m`);
  });

  it("vertical border background does not bleed into content rows", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderStyle: "classic",
          borderBackgroundColor: "cyan",
          alignSelf: "flex-start",
          width: 12,
        },
        () => h(Text, null, () => "Text longer than the Box width, so will definitely wrap."),
      ),
    );
    const tableBorderPattern = `${escapeRegex(`${ESC_BB}[46m`)}\\|${escapeRegex(`${ESC_BB}[49m`)}`;
    const contentRowPattern = new RegExp(`^${tableBorderPattern}.*${tableBorderPattern}$`);
    const tableRows = output.split("\n");
    const contentRows = tableRows.slice(1, -1);
    expect(contentRows.length).toBeGreaterThan(0);
    for (const contentRow of contentRows) {
      expect(contentRow).toMatch(contentRowPattern);
    }
  });

  it("foreground, background and dim combine correctly", () => {
    const output = frame(() =>
      h(
        Box,
        {
          borderTopDimColor: true,
          borderStyle: "single",
          borderTopColor: "red",
          borderTopBackgroundColor: "cyan",
          alignSelf: "flex-start",
        },
        () => h(Text, null, () => "Hi"),
      ),
    );
    expect(output).toContain(`${ESC_BB}[31m`);
    expect(output).toContain(`${ESC_BB}[46m`);
    expect(output).toContain(`${ESC_BB}[2m`);
  });
});

describe("Box borders", () => {
  it("renders single-style border around content", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", width: 10, height: 3 }, () => h(Text, null, () => "hi")),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe(["┌────────┐", "│hi      │", "└────────┘"].join("\n"));
  });

  it("reserves space for the border so children sit inside it", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", width: 6 }, () => h(Text, null, () => "ab")),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe(["┌────┐", "│ab  │", "└────┘"].join("\n"));
  });

  it("uses double-style glyphs", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "double", width: 6, height: 3 }, () => h(Text, null, () => "x")),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe(["╔════╗", "║x   ║", "╚════╝"].join("\n"));
  });

  it("drops the top edge when borderTop is false (corners adapt)", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", borderTop: false, width: 6, height: 3 }, () =>
          h(Text, null, () => "x"),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // No top edge, height 3 → 2 inner rows + 1 bottom edge.
    // Without a top edge, the side borders start at row 0.
    expect(out).toBe(["│x   │", "│    │", "└────┘"].join("\n"));
  });

  it("drops the left edge when borderLeft is false", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", borderLeft: false, width: 6, height: 3 }, () =>
          h(Text, null, () => "x"),
        ),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // No left edge → top-left and bottom-left corners disappear; the top
    // row is 5 horizontals + top-right glyph; bottom row similarly.
    expect(out).toBe(["─────┐", "x    │", "─────┘"].join("\n"));
  });

  it("paints the border in the requested color", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", borderColor: "green", width: 6, height: 3 }, () =>
          h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 20 });
    // Green = [32m. Border glyphs should be wrapped in that escape.
    expect(raw).toMatch(/\[32m.*┌.*\[39m/);
  });
});

describe("borders: more branches", () => {
  it("accepts an explicit borderStyle object", async () => {
    const customBox: BoxStyle = {
      topLeft: "A",
      top: "B",
      topRight: "C",
      right: "D",
      bottomRight: "E",
      bottom: "F",
      bottomLeft: "G",
      left: "H",
    };
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: customBox, width: 6, height: 3 }, () => h(Text, null, () => "x")),
    });
    const out = await renderToString(Demo, { columns: 10 });
    expect(out.split("\n")).toEqual(["ABBBBC", "Hx   D", "GFFFFE"]);
  });

  it("drops bottom edge when borderBottom is false", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", borderBottom: false, width: 6, height: 3 }, () =>
          h(Text, null, () => "x"),
        ),
    });
    const out = await renderToString(Demo, { columns: 10 });
    expect(out).toBe(["┌────┐", "│x   │", "│    │"].join("\n"));
  });

  it("drops right edge when borderRight is false", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { borderStyle: "single", borderRight: false, width: 6, height: 3 }, () =>
          h(Text, null, () => "x"),
        ),
    });
    const out = await renderToString(Demo, { columns: 10 });
    // trailing spaces are trimmed per line by Output
    expect(out).toBe(["┌─────", "│x", "└─────"].join("\n"));
  });

  it("applies borderTopColor, borderBottomColor independently", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderTopColor: "red",
            borderBottomColor: "blue",
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    expect(raw).toMatch(/\x1b\[31m.*┌/); // red top
    expect(raw).toMatch(/\x1b\[34m.*└/); // blue bottom
  });

  it("applies borderDimColor (dim modifier on all edges)", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderDimColor: true,
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    expect(raw).toMatch(/\x1b\[2m/);
  });

  it("applies borderBackgroundColor", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderBackgroundColor: "yellow",
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    // bgYellow = 43
    expect(raw).toMatch(/\x1b\[43m/);
  });
});

describe("borders: per-edge styling and custom glyphs", () => {
  it("applies borderTopBackgroundColor independently of bottom", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderTopBackgroundColor: "red",
            borderBottomBackgroundColor: "blue",
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    // bgRed = 41, bgBlue = 44
    expect(raw).toMatch(/\x1b\[41m.*┌/);
    expect(raw).toMatch(/\x1b\[44m.*└/);
  });

  it("applies borderLeftBackgroundColor and borderRightBackgroundColor per side", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderLeftBackgroundColor: "green",
            borderRightBackgroundColor: "yellow",
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    // bgGreen = 42, bgYellow = 43
    expect(raw).toMatch(/\x1b\[42m/);
    expect(raw).toMatch(/\x1b\[43m/);
  });

  it("applies borderTopDimColor only to top edge", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderTopDimColor: true,
            borderTopColor: "red",
            borderBottomColor: "red",
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    // The dim modifier (CSI 2) appears alongside the top edge.
    expect(raw).toMatch(/\x1b\[2m/);
    // Confirm the top edge contains both color and dim, and the row with
    // "└" (bottom edge) does not have the dim sequence preceding it.
    const lines = raw.split("\n");
    const topLine = lines.find((l) => l.includes("┌")) ?? "";
    const bottomLine = lines.find((l) => l.includes("└")) ?? "";
    expect(topLine).toContain("\x1b[2m");
    expect(bottomLine).not.toContain("\x1b[2m");
  });

  it("applies borderBottomDimColor and borderLeftDimColor and borderRightDimColor independently", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: "single",
            borderBottomDimColor: true,
            borderLeftDimColor: true,
            borderRightDimColor: true,
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    // Each of bottom/left/right got the dim modifier (CSI 2).
    const dimCount = (raw.match(/\x1b\[2m/g) ?? []).length;
    expect(dimCount).toBeGreaterThanOrEqual(3);
  });

  it("custom BoxStyle object combined with borderTop: false drops top edge but keeps custom corner glyphs on remaining edges", async () => {
    const customBox: BoxStyle = {
      topLeft: "+",
      top: "=",
      topRight: "+",
      right: "|",
      bottomRight: "+",
      bottom: "=",
      bottomLeft: "+",
      left: "|",
    };
    const Demo = defineComponent({
      setup: () => () =>
        h(
          Box,
          {
            borderStyle: customBox,
            borderTop: false,
            width: 6,
            height: 3,
          },
          () => h(Text, null, () => "x"),
        ),
    });
    const raw = await renderToStringRaw(Demo, { columns: 10 });
    const stripped = stripAnsi(raw);
    const lines = stripped
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(Boolean);
    // No top edge → first row is the content row (left | spaces | right).
    expect(lines[0]).toBe("|x   |");
    // Bottom row uses the custom corners and the custom bottom glyph.
    expect(lines[lines.length - 1]).toBe("+====+");
  });
});
