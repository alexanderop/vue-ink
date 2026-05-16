import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import { render, Text, type RenderMetrics } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('onRender callback', () => {
	it('fires once per committed frame with monotonic frame numbers', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const calls: RenderMetrics[] = [];
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, {
			stdout,
			interactive: true,
			onRender: (m) => calls.push(m),
		});
		await flush();
		counter.value = 1;
		await flush();
		counter.value = 2;
		await flush();
		instance.unmount();

		expect(calls.length).toBeGreaterThanOrEqual(3);
		for (let i = 1; i < calls.length; i += 1) {
			expect(calls[i].frame).toBe(calls[i - 1].frame + 1);
		}
		expect(calls.at(-1)!.lineCount).toBeGreaterThan(0);
		expect(calls.at(-1)!.output).toContain('n=2');
		expect(calls.at(-1)!.durationMs).toBeGreaterThanOrEqual(0);
		// Ink parity: `renderTime` is emitted as an alias of `durationMs`
		// so ports of `onRender({ renderTime }) => …` keep working.
		expect(calls.at(-1)!.renderTime).toBeGreaterThanOrEqual(0);
		expect(calls.at(-1)!.renderTime).toBe(calls.at(-1)!.durationMs);
	});

	it('reports a line count that matches the actual output', async () => {
		const stdout = createCaptureStream(20);
		const calls: RenderMetrics[] = [];
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'a\nb\nc'),
		});

		const instance = render(App, {
			stdout,
			interactive: true,
			onRender: (m) => calls.push(m),
		});
		await flush();
		instance.unmount();

		expect(calls.at(-1)!.lineCount).toBe(3);
	});

	it('isolates a throwing callback so the renderer keeps going', async () => {
		const stdout = createCaptureStream(20);
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, {
			stdout,
			interactive: true,
			onRender: () => {
				throw new Error('boom');
			},
		});
		await flush();
		counter.value = 1;
		await flush();
		// Still mounted, frame still rendering.
		expect(stdout.frames.length).toBeGreaterThan(0);
		expect(stderrSpy.mock.calls.flat().some((c) => String(c).includes('boom'))).toBe(true);
		instance.unmount();
		stderrSpy.mockRestore();
	});
});
