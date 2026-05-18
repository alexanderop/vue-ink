import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import { render } from '@vue-ink/testing-library';
import { Text, useAnimation } from '../src/index.ts';

// End-to-end animation behavior: mount real components through the
// testing-library render path and verify `useAnimation` drives reactive
// frames. The composable-level unit tests in
// `packages/renderer/src/composables/useAnimation/index.test.ts` cover the
// scheduler wiring; these tests guard the rendered-frame contract.

const advance = async (
	ms: number,
	waitUntilFlush: () => Promise<void>,
): Promise<void> => {
	await vi.advanceTimersByTimeAsync(ms);
	await waitUntilFlush();
};

const latest = (lastFrame: () => string | undefined): string =>
	stripAnsi(lastFrame() ?? '');

afterEach(() => {
	vi.useRealTimers();
});

describe('useAnimation behavior', () => {
	it('advances `frame` over multiple ticks and the rendered text changes', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const Component = defineComponent({
			setup() {
				const { frame } = useAnimation({ interval: 50 });
				return () => h(Text, null, () => `frame:${frame.value}`);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();
		expect(latest(lastFrame)).toBe('frame:0');

		await advance(50, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:1');

		await advance(50, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:2');

		await advance(150, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:5');

		unmount();
	});

	it('produces no frame advances when `isActive: false`', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const Component = defineComponent({
			setup() {
				const { frame } = useAnimation({ interval: 50, isActive: false });
				return () => h(Text, null, () => `frame:${frame.value}`);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();
		expect(latest(lastFrame)).toBe('frame:0');

		await advance(500, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:0');

		unmount();
	});

	it('toggles isActive: true → false → true and resets frame counter on the second true', async () => {
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
		expect(latest(lastFrame)).toBe('frame:3');

		active.value = false;
		await waitUntilFlush();
		// Going inactive zeroes the counter immediately.
		expect(latest(lastFrame)).toBe('frame:0');

		await advance(200, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:0');

		active.value = true;
		await waitUntilFlush();
		// Re-activated — counter restarts from zero.
		expect(latest(lastFrame)).toBe('frame:0');

		await advance(50, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:1');

		unmount();
	});

	it('resubscribes the timer when `interval` changes mid-flight', async () => {
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
		expect(latest(lastFrame)).toBe('frame:2');

		// Changing interval re-anchors and resets the counter.
		interval.value = 20;
		await waitUntilFlush();
		expect(latest(lastFrame)).toBe('frame:0');

		// At the new cadence, 60ms produces 3 frames where 50ms would only yield 1.
		await advance(60, waitUntilFlush);
		expect(latest(lastFrame)).toBe('frame:3');

		unmount();
	});

	it('two concurrent useAnimation consumers share one underlying timer', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		// Count how many real setTimeout calls land on the queue while the
		// animation runs. With a shared scheduler, both consumers should ride a
		// single outstanding timeout at a time — never one per consumer.
		const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		const Component = defineComponent({
			setup() {
				const a = useAnimation({ interval: 50 });
				const b = useAnimation({ interval: 50 });
				return () =>
					h(Text, null, () => `a:${a.frame.value} b:${b.frame.value}`);
			},
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Component);
		await waitUntilFlush();

		const callsBefore = setTimeoutSpy.mock.calls.length;
		await advance(50, waitUntilFlush);
		expect(latest(lastFrame)).toBe('a:1 b:1');
		const callsAfter = setTimeoutSpy.mock.calls.length;

		// One tick should schedule at most a single follow-up timeout from the
		// shared scheduler (one set, plus possibly one re-schedule). Two
		// independent timers would produce ≥ 2 additional per tick.
		expect(callsAfter - callsBefore).toBeLessThanOrEqual(2);

		setTimeoutSpy.mockRestore();
		unmount();
	});
});
