import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

const withEnv = async (
	overrides: Record<string, string | undefined>,
	fn: () => void | Promise<void>,
): Promise<void> => {
	const prev: Record<string, string | undefined> = {};
	for (const key of Object.keys(overrides)) prev[key] = process.env[key];
	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		await fn();
	} finally {
		for (const [key, value] of Object.entries(prev)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
};

describe('interactive mode detection', () => {
	it('non-interactive stdout buffers and writes only the final frame at unmount', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout });
		await flush();
		counter.value = 1;
		await flush();
		counter.value = 2;
		await flush();

		// Nothing should be written mid-stream when non-interactive.
		expect(stdout.frames.length).toBe(0);

		instance.unmount();

		// Final frame is emitted exactly once, with no escape sequences.
		expect(stdout.frames.length).toBe(1);
		const [final] = stdout.frames;
		expect(stripAnsi(final).replace(/\n+$/, '')).toBe('n=2');
		// Trailing newline required so non-interactive output composes with logs.
		expect(final.endsWith('\n')).toBe(true);
		// No ANSI escape sequences in non-interactive mode.
		expect(final).toBe(stripAnsi(final));
	});

	it('forcing interactive: true overrides non-TTY detection and writes per-frame', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout, interactive: true });
		await flush();
		const initialFrames = stdout.frames.length;
		expect(initialFrames).toBeGreaterThan(0);

		counter.value = 1;
		await flush();
		expect(stdout.frames.length).toBeGreaterThan(initialFrames);

		instance.unmount();
	});

	it('registers a resize listener even in non-interactive mode and detaches on unmount', async () => {
		const stdout = createCaptureStream(10);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});

		const instance = render(App, { stdout });
		await flush();

		// The renderer attaches a resize listener regardless of interactivity
		// so composables (`useBoxMetrics`) get a recomputed layout when tests
		// or non-TTY consumers fire `resize` manually. Real non-TTY streams
		// never emit `resize`, so this listener is dormant in production.
		expect(stdout.listenerCount('resize')).toBe(1);

		instance.unmount();
		expect(stdout.listenerCount('resize')).toBe(0);
	});

	// Regression: `isCiEnv()` used to truthy-check `process.env.CI`, so a
	// workstation (or test harness) that exported `CI=false` got the opposite
	// of what it asked for — interactive flipped off, no per-frame writes.
	// See `brain/renderer/ci-detection.md`.
	it('treats falsy CI string values as not-in-CI on a TTY', async () => {
		await withEnv(
			{
				CI: 'false',
				CONTINUOUS_INTEGRATION: undefined,
				BUILD_NUMBER: undefined,
				RUN_ID: undefined,
			},
			async () => {
				const stdout = createCaptureStream(20, { isTTY: true });
				const counter = ref(0);
				const App = defineComponent({
					setup: () => () => h(Text, null, () => `n=${counter.value}`),
				});

				const instance = render(App, { stdout });
				await flush();
				const initialFrames = stdout.frames.length;
				expect(initialFrames).toBeGreaterThan(0);

				counter.value = 1;
				await flush();
				expect(stdout.frames.length).toBeGreaterThan(initialFrames);

				instance.unmount();
			},
		);
	});

	it('treats a truthy CI string on a TTY as in-CI (no per-frame writes)', async () => {
		await withEnv(
			{
				CI: 'true',
				CONTINUOUS_INTEGRATION: undefined,
				BUILD_NUMBER: undefined,
				RUN_ID: undefined,
			},
			async () => {
				const stdout = createCaptureStream(20, { isTTY: true });
				const counter = ref(0);
				const App = defineComponent({
					setup: () => () => h(Text, null, () => `n=${counter.value}`),
				});

				const instance = render(App, { stdout });
				await flush();
				counter.value = 1;
				await flush();

				// CI=true → interactive false → buffered, no mid-stream writes.
				expect(stdout.frames.length).toBe(0);

				instance.unmount();
				expect(stdout.frames.length).toBe(1);
				expect(stripAnsi(stdout.frames[0]!).replace(/\n+$/, '')).toBe('n=1');
			},
		);
	});

	it('treats BUILD_NUMBER as a presence signal regardless of value', async () => {
		await withEnv(
			{
				CI: undefined,
				CONTINUOUS_INTEGRATION: undefined,
				BUILD_NUMBER: '0',
				RUN_ID: undefined,
			},
			async () => {
				const stdout = createCaptureStream(20, { isTTY: true });
				const App = defineComponent({
					setup: () => () => h(Text, null, () => 'x'),
				});

				const instance = render(App, { stdout });
				await flush();
				instance.unmount();

				// BUILD_NUMBER set (even to "0") → in-CI → buffered, one final write.
				expect(stdout.frames.length).toBe(1);
			},
		);
	});
});
