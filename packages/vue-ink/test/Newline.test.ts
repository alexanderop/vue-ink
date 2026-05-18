import { describe, it, expect } from "vitest";
import { h, defineComponent } from "vue";
import { Box, Text, Newline } from "../src/index.ts";
import { renderToString } from "./helpers.ts";

describe("Newline", () => {
  it("inserts one newline between siblings inside <Text>", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => ["a", h(Newline), "b"]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("a\nb");
  });

  it("count=3 inserts three newlines", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => ["a", h(Newline, { count: 3 }), "b"]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("a\n\n\nb");
  });
});

describe("Newline edge cases", () => {
  it("count=0 emits no newlines", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => ["a", h(Newline, { count: 0 }), "b"]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("ab");
  });

  it("count=10 emits exactly 10 newlines", async () => {
    const Demo = defineComponent({
      setup: () => () => h(Text, null, () => ["a", h(Newline, { count: 10 }), "b"]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // 'a' then 10 '\n' then 'b' → 11 segments when split by '\n'.
    const segments = out.split("\n");
    expect(segments[0]).toBe("a");
    expect(segments[segments.length - 1]).toBe("b");
    // Total of 10 separators → 11 parts; the 9 inner parts are blank.
    expect(segments.length).toBe(11);
    for (const inner of segments.slice(1, -1)) {
      expect(inner).toBe("");
    }
  });

  it("renders as an ink-text outside a <Text> parent without throwing", async () => {
    // Newline always emits an `ink-text` host (via useTextHost). When placed
    // directly under a <Box>, the renderer still draws the newline as a
    // row — but the surrounding Box's flexbox laying-out means the literal
    // '\n' character is what gets emitted. This documents the current
    // behaviour: no error, the newline contributes a (possibly empty) row.
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: "column" }, () => [
          h(Text, null, () => "top"),
          h(Newline),
          h(Text, null, () => "bot"),
        ]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    // No crash; both labels survive in the output.
    expect(out).toContain("top");
    expect(out).toContain("bot");
  });
});
