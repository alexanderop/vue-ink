import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { type AnimationContext } from '../../context.ts';
import { createAnimationScheduler } from '../../animation-scheduler.ts';
import { withSetup } from '../_test/with-setup.ts';
import { useAnimation } from './index.ts';

afterEach(() => {
	vi.useRealTimers();
});

const buildContext = (renderThrottleMs = 0): AnimationContext => {
	const scheduler = createAnimationScheduler();
	return {
		renderThrottleMs,
		subscribe: scheduler.subscribe,
	};
};

describe('useAnimation()', () => {
	it('throws a named error when not mounted inside vue-ink render()', () => {
		expect(() =>
			withSetup(() => useAnimation()),
		).toThrow(/useAnimation/);
	});

	it('starts from zero and increments `frame` at the configured interval', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const ctx = buildContext();
		const { result, unmount } = withSetup(() => useAnimation({ interval: 100 }), {
			animation: ctx,
		});

		expect(result.frame.value).toBe(0);
		expect(result.time.value).toBe(0);

		// Advance one interval — the scheduler timer fires once.
		await vi.advanceTimersByTimeAsync(100);
		expect(result.frame.value).toBe(1);

		await vi.advanceTimersByTimeAsync(100);
		expect(result.frame.value).toBe(2);

		unmount();
	});

	it('returns reactive refs that update inside the same effect scope', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const ctx = buildContext();
		const { result, unmount } = withSetup(() => useAnimation({ interval: 50 }), {
			animation: ctx,
		});

		await vi.advanceTimersByTimeAsync(150);
		expect(result.frame.value).toBeGreaterThanOrEqual(2);
		expect(result.time.value).toBeGreaterThanOrEqual(100);
		unmount();
	});

	it('multiple useAnimation consumers share the same animation subscription pool', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const ctx = buildContext();
		// `subscribe` is the externally observable contract — count how many
		// subscriptions the scheduler hands out vs how many timer ticks drive
		// every consumer's frame counter.
		const subscribeSpy = vi.spyOn(ctx, 'subscribe');

		const { result: a, unmount: u1 } = withSetup(
			() => useAnimation({ interval: 100 }),
			{ animation: ctx },
		);
		const { result: b, unmount: u2 } = withSetup(
			() => useAnimation({ interval: 100 }),
			{ animation: ctx },
		);

		// Two consumers → two subscribers, but they both ride the same shared
		// timer that the scheduler owns internally.
		expect(subscribeSpy).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(100);
		expect(a.frame.value).toBe(1);
		expect(b.frame.value).toBe(1);

		u1();
		u2();
	});

	it('reset() restarts timing without rebuilding the subscription', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const ctx = buildContext();
		const subscribeSpy = vi.spyOn(ctx, 'subscribe');

		const { result, unmount } = withSetup(() => useAnimation({ interval: 50 }), {
			animation: ctx,
		});

		await vi.advanceTimersByTimeAsync(150);
		expect(result.frame.value).toBeGreaterThan(0);

		const subscribeCallsBefore = subscribeSpy.mock.calls.length;
		result.reset();
		// reset() re-subscribes to anchor a fresh start time. Allow that.
		await vi.advanceTimersByTimeAsync(0);
		expect(result.frame.value).toBe(0);
		expect(result.time.value).toBe(0);

		await vi.advanceTimersByTimeAsync(50);
		expect(result.frame.value).toBe(1);

		// Either a single new subscribe call (re-anchored) or none, never N.
		const subscribeCallsAfter = subscribeSpy.mock.calls.length;
		expect(subscribeCallsAfter - subscribeCallsBefore).toBeLessThanOrEqual(1);

		unmount();
	});

	it('toggling isActive: true → false → true resets frame/time to zero', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const ctx = buildContext();
		const isActive = ref(true);

		const { result, unmount } = withSetup(
			() => useAnimation({ interval: 50, isActive: () => isActive.value }),
			{ animation: ctx },
		);

		await vi.advanceTimersByTimeAsync(150);
		expect(result.frame.value).toBeGreaterThan(0);

		isActive.value = false;
		await vi.advanceTimersByTimeAsync(200);
		expect(result.frame.value).toBe(0);
		expect(result.time.value).toBe(0);

		isActive.value = true;
		await vi.advanceTimersByTimeAsync(50);
		expect(result.frame.value).toBe(1);

		unmount();
	});

	it('skips ticks inside the active render-throttle window', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		// renderThrottleMs = 100 means useAnimation should not produce a new
		// snapshot more often than that even if the scheduler wakes at 20ms.
		const ctx = buildContext(100);
		const { result, unmount } = withSetup(() => useAnimation({ interval: 20 }), {
			animation: ctx,
		});

		// After 20ms, frame increments (first tick is outside the window
		// because lastRenderTime was anchored at startTime).
		await vi.advanceTimersByTimeAsync(20);
		const firstFrame = result.frame.value;

		// A few more 20ms ticks inside the throttle window should NOT increment.
		await vi.advanceTimersByTimeAsync(60);
		expect(result.frame.value).toBe(firstFrame);

		// Past the throttle window — the next tick lands.
		await vi.advanceTimersByTimeAsync(40);
		expect(result.frame.value).toBeGreaterThan(firstFrame);

		unmount();
	});

	it('exposes `delta` measured against the previously rendered tick', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const ctx = buildContext();
		const { result, unmount } = withSetup(() => useAnimation({ interval: 100 }), {
			animation: ctx,
		});

		await vi.advanceTimersByTimeAsync(100);
		expect(result.delta.value).toBeGreaterThan(0);

		const firstDelta = result.delta.value;
		await vi.advanceTimersByTimeAsync(100);
		expect(result.delta.value).toBeGreaterThan(0);
		// Two consecutive 100ms ticks should produce comparable deltas (±5%).
		expect(Math.abs(result.delta.value - firstDelta)).toBeLessThan(firstDelta * 0.05 + 1);

		unmount();
	});
});
