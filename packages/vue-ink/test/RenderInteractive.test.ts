import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

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
});
