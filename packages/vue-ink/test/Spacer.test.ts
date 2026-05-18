import { describe, it, expect } from "vitest";
import { h, defineComponent } from "vue";
import { Box, Text, Spacer } from "../src/index.ts";
import { frame, renderToString } from "./helpers.ts";

describe("Spacer", () => {
  it("pushes its two siblings to opposite edges in a fixed-width row", async () => {
    const Demo = defineComponent({
      setup: () => () =>
        h(Box, { width: 10, flexDirection: "row" }, () => [
          h(Text, null, () => "L"),
          h(Spacer),
          h(Text, null, () => "R"),
        ]),
    });
    const out = await renderToString(Demo, { columns: 20 });
    expect(out).toBe("L        R");
  });

  it("horizontal spacer fills row", () => {
    const output = frame(() =>
      h(Box, { width: 20 }, () => [
        h(Text, null, () => "Left"),
        h(Spacer),
        h(Text, null, () => "Right"),
      ]),
    );
    expect(output).toBe("Left           Right");
  });

  it("vertical spacer fills column", () => {
    const output = frame(() =>
      h(Box, { flexDirection: "column", height: 6 }, () => [
        h(Text, null, () => "Top"),
        h(Spacer),
        h(Text, null, () => "Bottom"),
      ]),
    );
    expect(output).toBe("Top\n\n\n\n\nBottom");
  });
});
