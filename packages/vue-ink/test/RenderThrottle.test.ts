import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { render, Text } from '../src/index.ts';
import { createCaptureStream, flush, flushVueOnly } from './helpers.ts';

const stripBSU = (s: string): string => s.replace(/\x1b\[\?2026[hl]/g, '');

const countPaintedFrames = (stdout: { frames: string[] }): number => stdout.frames.map(stripBSU).filter((chunk) => chunk.includes('n=')).length;

afterEach(() => {
	vi.useRealTimers();
});

describe('render throttle (maxFps)', () => {
	it('rejects maxFps: 0 with a clear error', () => {
		const stdout = createCaptureStream();
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		expect(() => render(App, { stdout, maxFps: 0 })).toThrow(/maxFps/);
	});

	it('rejects negative maxFps', () => {
		const stdout = createCaptureStream();
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		expect(() => render(App, { stdout, maxFps: -5 })).toThrow(/maxFps/);
	});

	it('throttles paints to maxFps when state updates faster than the frame budget', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout, interactive: true, maxFps: 30 });
		await flushVueOnly();

		const before = countPaintedFrames(stdout);

		// 100 updates over a simulated 1 second — should cap near 30 frames.
		for (let i = 0; i < 100; i += 1) {
			counter.value = i + 1;
			await flushVueOnly();
			vi.advanceTimersByTime(10);
		}
		await vi.runOnlyPendingTimersAsync();
		await flushVueOnly();

		const after = countPaintedFrames(stdout);
		const painted = after - before;
		// Allow one trailing-edge frame past the cap.
		expect(painted).toBeLessThanOrEqual(31);
		expect(painted).toBeGreaterThan(0);

		instance.unmount();
	});

	it('preserves the trailing-edge frame (last update is never lost)', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout, interactive: true, maxFps: 30 });
		await flushVueOnly();

		counter.value = 1;
		await flushVueOnly();
		counter.value = 2;
		await flushVueOnly();
		counter.value = 3;
		await flushVueOnly();

		// Run the trailing-edge timer.
		await vi.runOnlyPendingTimersAsync();
		await flushVueOnly();

		const last = stdout.frames[stdout.frames.length - 1] ?? '';
		expect(stripBSU(last)).toContain('n=3');
		instance.unmount();
	});

	it('maxFps: Infinity disables throttling — every commit paints', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, {
			stdout,
			interactive: true,
			maxFps: Number.POSITIVE_INFINITY,
		});
		await flush();

		const before = countPaintedFrames(stdout);
		for (let i = 0; i < 10; i += 1) {
			counter.value = i + 1;
			await flush();
		}

		const painted = countPaintedFrames(stdout) - before;
		expect(painted).toBe(10);

		instance.unmount();
	});

	it('default maxFps is 30 (renderThrottleMs ≈ 34ms)', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout, interactive: true });
		await flushVueOnly();

		const before = countPaintedFrames(stdout);
		// The mount paint consumed the leading edge of the first window. Two
		// further updates inside the same window must coalesce — zero paints
		// until the trailing-edge timer (~34ms for maxFps=30) elapses.
		counter.value = 1;
		await flushVueOnly();
		counter.value = 2;
		await flushVueOnly();

		expect(countPaintedFrames(stdout) - before).toBe(0);

		// Advance past 1000/30 ≈ 34ms — the trailing-edge paint should fire.
		vi.advanceTimersByTime(40);
		await vi.runOnlyPendingTimersAsync();
		await flushVueOnly();

		expect(countPaintedFrames(stdout) - before).toBe(1);
		instance.unmount();
	});

	it('debug mode bypasses throttling', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, {
			stdout,
			debug: true,
			interactive: true,
			maxFps: 30,
		});
		await flush();

		const before = stdout.frames.length;
		for (let i = 0; i < 10; i += 1) {
			counter.value = i + 1;
			await flush();
		}
		const painted = stdout.frames.length - before;
		// Debug mode appends every frame as plain text; expect one per commit.
		expect(painted).toBe(10);

		instance.unmount();
	});

	it('flushes pending throttled render on unmount', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: false });
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout, interactive: true, maxFps: 30 });
		await flushVueOnly();
		counter.value = 1;
		await flushVueOnly();
		counter.value = 2;
		await flushVueOnly();
		counter.value = 3;
		await flushVueOnly();

		// Unmount without advancing timers — the pending trailing render must still
		// land so the user sees the final state.
		instance.unmount();

		const all = stdout.frames.map(stripBSU).join('');
		expect(all).toContain('n=3');
	});
});
