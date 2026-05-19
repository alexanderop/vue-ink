import { describe, it, expect, vi, afterEach } from "vitest";
import { defineComponent, h, ref } from "vue";
import stripAnsi from "strip-ansi";
import { render } from "@vue-ink/testing-library";
import { Text, useAnimation } from "../src/index.ts";

// End-to-end animation behavior: mount real components through the
// testing-library render path and verify `useAnimation` drives reactive
// frames. The composable-level unit tests in
// `packages/renderer/src/composables/useAnimation/index.test.ts` cover the
// scheduler wiring; these tests guard the rendered-frame contract.

const advance = async (ms: number, waitUntilFlush: () => Promise<void>): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms);
  await waitUntilFlush();
};

const latest = (lastFrame: () => string | undefined): string => stripAnsi(lastFrame() ?? "");

afterEach(() => {
  vi.useRealTimers();
});

describe("useAnimation behavior", () => {
  it("advances `frame` over multiple ticks and the rendered text changes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval: 50 });
        return () => h(Text, null, () => `frame:${frame.value}`);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("frame:0");

    await advance(50, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:1");

    await advance(50, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:2");

    await advance(150, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:5");

    unmount();
  });

  it("produces no frame advances when `isActive: false`", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval: 50, isActive: false });
        return () => h(Text, null, () => `frame:${frame.value}`);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("frame:0");

    await advance(500, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:0");

    unmount();
  });

  it("toggles isActive: true → false → true and resets frame counter on the second true", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const active = ref(true);
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({
          interval: 50,
          isActive: () => active.value,
        });
        return () => h(Text, null, () => `frame:${frame.value}`);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    await advance(150, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:3");

    active.value = false;
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("frame:0");

    await advance(200, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:0");

    active.value = true;
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("frame:0");

    await advance(50, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:1");

    unmount();
  });

  it("resubscribes the timer when `interval` changes mid-flight", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const interval = ref(50);
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval: () => interval.value });
        return () => h(Text, null, () => `frame:${frame.value}`);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();

    await advance(100, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:2");

    interval.value = 20;
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("frame:0");

    // At the new cadence, 60ms produces 3 frames where 50ms would only yield 1.
    await advance(60, waitUntilFlush);
    expect(latest(lastFrame)).toBe("frame:3");

    unmount();
  });

  it("two concurrent useAnimation consumers share one underlying timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    // Count how many real setTimeout calls land on the queue while the
    // animation runs. With a shared scheduler, both consumers should ride a
    // single outstanding timeout at a time — never one per consumer.
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const Component = defineComponent({
      setup() {
        const a = useAnimation({ interval: 50 });
        const b = useAnimation({ interval: 50 });
        return () => h(Text, null, () => `a:${a.frame.value} b:${b.frame.value}`);
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();

    const callsBefore = setTimeoutSpy.mock.calls.length;
    await advance(50, waitUntilFlush);
    expect(latest(lastFrame)).toBe("a:1 b:1");
    const callsAfter = setTimeoutSpy.mock.calls.length;

    // One tick should schedule at most a single follow-up timeout from the
    // shared scheduler (one set, plus possibly one re-schedule). Two
    // independent timers would produce ≥ 2 additional per tick.
    expect(callsAfter - callsBefore).toBeLessThanOrEqual(2);

    setTimeoutSpy.mockRestore();
    unmount();
  });

  it("defaults to 100ms interval when none is provided", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation();
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("0");

    await advance(100, waitUntilFlush);
    expect(latest(lastFrame)).toBe("1");

    unmount();
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("treats %s interval as the default interval", async (_label, interval) => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("0");

    await advance(100, waitUntilFlush);
    expect(latest(lastFrame)).toBe("1");

    unmount();
  });

  it("clamps oversized finite interval to the timer maximum", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({
          interval: Number.MAX_SAFE_INTEGER,
        });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("0");

    await advance(1000, waitUntilFlush);
    expect(latest(lastFrame)).toBe("0");

    unmount();
  });

  it.each([
    ["zero", 0],
    ["negative", -10],
  ])("clamps %s interval to 1ms", async (_label, interval) => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("0");

    await advance(5, waitUntilFlush);
    expect(latest(lastFrame)).toBe("5");

    unmount();
  });

  it("maxFps does not speed up animation state (interval=8, 25ms → frame=3)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval: 8 });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("0");

    await advance(25, waitUntilFlush);
    expect(latest(lastFrame)).toBe("3");

    unmount();
  });

  it("reset() resets frame, time, and delta to 0", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    let resetAnimation!: () => void;
    const Component = defineComponent({
      setup() {
        const { frame, time, delta, reset } = useAnimation({ interval: 50 });
        resetAnimation = reset;
        return () =>
          h(
            Text,
            null,
            () => `${frame.value},${Math.round(time.value)},${Math.round(delta.value)}`,
          );
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();

    await advance(200, waitUntilFlush);
    const [frameBefore, timeBefore] = latest(lastFrame).split(",").map(Number);
    expect(frameBefore).toBeGreaterThanOrEqual(1);
    expect(timeBefore).toBeGreaterThanOrEqual(100);

    resetAnimation();
    await advance(1, waitUntilFlush);
    const [frameAfterReset, timeAfterReset, deltaAfterReset] = latest(lastFrame)
      .split(",")
      .map(Number);
    expect(frameAfterReset).toBe(0);
    expect(timeAfterReset).toBeLessThanOrEqual(1);
    expect(deltaAfterReset).toBeLessThanOrEqual(1);

    await advance(100, waitUntilFlush);
    const [frameAfter, timeAfter] = latest(lastFrame).split(",").map(Number);
    expect(frameAfter).toBeGreaterThanOrEqual(1);
    expect(timeAfter).toBeLessThan(timeBefore!);

    unmount();
  });

  it("reset is a stable function reference across reactive updates", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const captured: Array<() => void> = [];
    const Component = defineComponent({
      setup() {
        const { frame, reset } = useAnimation({ interval: 50 });
        captured.push(reset);
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();

    await advance(50, waitUntilFlush);
    await advance(50, waitUntilFlush);
    captured[0]!();
    await waitUntilFlush();
    await advance(50, waitUntilFlush);

    // `reset` is created once per setup() call — calling it across the
    // component's lifetime must always reference the same function.
    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(captured.every((fn) => fn === captured[0])).toBe(true);

    unmount();
  });

  it("unmount before first tick cleans up without error", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval: 50 });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, frames, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();
    expect(latest(lastFrame)).toBe("0");

    const framesBeforeUnmount = frames.length;
    expect(() => unmount()).not.toThrow();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(frames.length).toBe(framesBeforeUnmount);

    clearTimeoutSpy.mockRestore();
  });

  it("frame catches up when the shared timer is delayed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({ interval: 50 });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();

    await advance(220, waitUntilFlush);
    expect(latest(lastFrame)).toBe("4");

    unmount();
  });

  it("pausing animation stops ticks before the next frame", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const active = ref(true);
    const Component = defineComponent({
      setup() {
        const { frame } = useAnimation({
          interval: 8,
          isActive: () => active.value,
        });
        return () => h(Text, null, () => String(frame.value));
      },
    });

    const { lastFrame, waitUntilFlush, unmount } = render(Component);
    await waitUntilFlush();

    await advance(25, waitUntilFlush);
    const beforePause = Number(latest(lastFrame));
    expect(beforePause).toBeGreaterThanOrEqual(1);

    active.value = false;
    await waitUntilFlush();
    // vue-ink diverges from ink here: flipping isActive false zeroes
    // frame/time/delta synchronously. The shared contract this test guards
    // is "no further ticks fire after pause".
    const pausedFrame = latest(lastFrame);
    expect(pausedFrame).toBe("0");

    await advance(25, waitUntilFlush);
    expect(latest(lastFrame)).toBe(pausedFrame);

    unmount();
  });
});
