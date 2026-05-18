import { describe, it, expect } from "vitest";
import { defineComponent, h, ref, useTemplateRef, type Ref } from "vue";
import stripAnsi from "strip-ansi";
import { render } from "@vue-ink/testing-library";
import { Box, Text, measureElement, useBoxMetrics, type BoxMetricsTarget } from "../src/index.ts";
import { renderReusable } from "./helpers.ts";

const frameOf = (lastFrame: () => string | undefined): string => stripAnsi(lastFrame() ?? "");

const settle = async (waitUntilFlush: () => Promise<void>): Promise<void> => {
  // Two ticks: first commit produces zeros, the layout listener flips the
  // metrics, the next commit picks them up.
  await waitUntilFlush();
  await waitUntilFlush();
};

// Public measureElement — the non-reactive sibling of useBoxMetrics. Designed
// for one-shot reads in input handlers / timers where allocating a watcher
// for a single read is overkill.

describe("measureElement", () => {
  it("returns { width: 0, height: 0 } for null/undefined", () => {
    expect(measureElement(null)).toEqual({ width: 0, height: 0 });
    expect(measureElement(undefined)).toEqual({ width: 0, height: 0 });
  });

  it("reads computed width/height from a measured Box ref", async () => {
    let captured: { width: number; height: number } | undefined;
    const Demo = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        return () => {
          const node = h(Box, { ref: "box", width: 30, height: 4 }, () => h(Text, null, () => "x"));
          // Defer the read to a microtask so layout has committed
          // before we sample. The render function itself runs
          // before the post-flush layout pass.
          queueMicrotask(() => {
            captured = measureElement(boxRef.value);
          });
          return node;
        };
      },
    });
    const { instance, flush } = await renderReusable(Demo, { columns: 80 });
    await flush();
    expect(captured).toEqual({ width: 30, height: 4 });
    instance.unmount();
  });

  it("returns the same shape as react-ink (width + height only)", async () => {
    // Guards against accidentally widening the API surface — the contract
    // is the two-key object, nothing else.
    let captured: object | undefined;
    const Demo = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        return () => {
          const node = h(Box, { ref: "box", width: 10, height: 2 });
          queueMicrotask(() => {
            captured = measureElement(boxRef.value);
          });
          return node;
        };
      },
    });
    const { instance, flush } = await renderReusable(Demo, { columns: 80 });
    await flush();
    expect(Object.keys(captured ?? {}).sort()).toEqual(["height", "width"]);
    instance.unmount();
  });

  it("does not subscribe to layout changes (one-shot read)", async () => {
    // Sanity check: calling measureElement repeatedly returns the latest
    // committed layout without registering anything that lingers after the
    // call. Contrast with useBoxMetrics, which attaches a layout listener.
    let measureFn: (() => { width: number; height: number }) | undefined;
    const Demo = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        measureFn = () => measureElement(boxRef.value);
        return () => h(Box, { ref: "box", width: 12, height: 3 });
      },
    });
    const { instance, flush } = await renderReusable(Demo);
    await flush();
    const first = measureFn!();
    const second = measureFn!();
    expect(first).toEqual({ width: 12, height: 3 });
    expect(second).toEqual({ width: 12, height: 3 });
    instance.unmount();
  });
});

// Ported from repos/ink/test/measure-element.tsx. ink's `measureElement`
// returns a synchronous {width, height} for a ref'd DOM node and is paired
// with `useEffect` to write the result back to state. vue-ink's
// `useBoxMetrics` already exposes those values as reactive refs that update
// post-paint, so the Vue version uses them directly.
describe("measure-element", () => {
  it("measure element", async () => {
    const Test = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        const { width } = useBoxMetrics(boxRef);
        return () => h(Box, { ref: "box" }, () => h(Text, null, () => `Width: ${width.value}`));
      },
    });

    const { lastFrame, frames, waitUntilFlush, unmount } = render(Test);
    expect(stripAnsi(frames[0] ?? "")).toBe("Width: 0");
    await settle(waitUntilFlush);
    expect(frameOf(lastFrame)).toBe("Width: 100");
    unmount();
  });

  it("measure element after state update", async () => {
    const items: Ref<string[]> = ref<string[]>([]);
    const Test = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        const { height } = useBoxMetrics(boxRef);
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Box, { ref: "box", flexDirection: "column" }, () =>
              items.value.map((item) => h(Text, { key: item }, () => item)),
            ),
            h(Text, null, () => `Height: ${height.value}`),
          ]);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    await settle(waitUntilFlush);

    items.value = ["line 1", "line 2", "line 3"];
    await settle(waitUntilFlush);

    expect(frameOf(lastFrame).trim()).toBe("line 1\nline 2\nline 3\nHeight: 3");
    unmount();
  });

  it("measure element after multiple state updates", async () => {
    const items: Ref<string[]> = ref<string[]>([]);
    const Test = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        const { height } = useBoxMetrics(boxRef);
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Box, { ref: "box", flexDirection: "column" }, () =>
              items.value.map((item) => h(Text, { key: item }, () => item)),
            ),
            h(Text, null, () => `Height: ${height.value}`),
          ]);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    await settle(waitUntilFlush);

    items.value = ["line 1", "line 2", "line 3"];
    await settle(waitUntilFlush);

    items.value = ["line 1"];
    await settle(waitUntilFlush);

    expect(frameOf(lastFrame).trim()).toBe("line 1\nHeight: 1");
    unmount();
  });

  it("measure element in useLayoutEffect after state update", async () => {
    // vue-ink's `useBoxMetrics` already commits the post-paint write
    // synchronously into a reactive ref; there is no separate "layout
    // effect" tier in Vue. This test mirrors ink's contract: a state
    // change must re-measure on the very next paint without the user
    // scheduling anything explicitly.
    const items: Ref<string[]> = ref<string[]>([]);
    const Test = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        const { height } = useBoxMetrics(boxRef);
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Box, { ref: "box", flexDirection: "column" }, () =>
              items.value.map((item) => h(Text, { key: item }, () => item)),
            ),
            h(Text, null, () => `Height: ${height.value}`),
          ]);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    await settle(waitUntilFlush);

    items.value = ["line 1", "line 2", "line 3"];
    await settle(waitUntilFlush);

    expect(frameOf(lastFrame).trim()).toBe("line 1\nline 2\nline 3\nHeight: 3");
    unmount();
  });

  it("calculate layout while rendering is throttled", async () => {
    // The testing-library wrapper sets `maxFps: Infinity` so paints aren't
    // throttled, but the metrics path still relies on layout listeners
    // firing after each commit. Confirm the final frame holds the
    // post-measure width regardless of how many intermediate frames
    // landed.
    const Test = defineComponent({
      setup() {
        const boxRef = useTemplateRef<BoxMetricsTarget>("box");
        const { width } = useBoxMetrics(boxRef);
        return () => h(Box, { ref: "box" }, () => h(Text, null, () => `Width: ${width.value}`));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Test);
    await settle(waitUntilFlush);
    expect(frameOf(lastFrame).trim()).toBe("Width: 100");
    unmount();
  });
});
