import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text, useApp } from '../src/index.ts';
import { createCaptureStream } from './helpers.ts';

describe('waitUntilRenderFlush()', () => {
	it('resolves only after the next frame is written to the stream', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});
		const instance = render(App, { stdout, interactive: true });
		await instance.waitUntilRenderFlush();

		const writesBefore = stdout.frames.length;
		counter.value = 1;
		const wait = instance.waitUntilRenderFlush();
		// State changed but the rerender hasn't been awaited yet — the next frame
		// hasn't been emitted.
		expect(stdout.frames.length).toBe(writesBefore);
		await wait;
		expect(stdout.frames.length).toBeGreaterThan(writesBefore);
		expect(stripAnsi(stdout.frames.at(-1) ?? '')).toContain('n=1');

		instance.unmount();
	});

	it('issues a fresh promise each call so consecutive waits target distinct frames', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});
		const instance = render(App, { stdout, interactive: true });
		await instance.waitUntilRenderFlush();

		counter.value = 1;
		await instance.waitUntilRenderFlush();
		const sawOne = stdout.frames.length;
		counter.value = 2;
		await instance.waitUntilRenderFlush();
		expect(stdout.frames.length).toBeGreaterThan(sawOne);
		expect(stripAnsi(stdout.frames.at(-1) ?? '')).toContain('n=2');

		instance.unmount();
	});

	it('exposes waitUntilRenderFlush via useApp() so components can await their own frame', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		let appCtx: ReturnType<typeof useApp> | undefined;
		const App = defineComponent({
			setup() {
				appCtx = useApp();
				return () => h(Text, null, () => `n=${counter.value}`);
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await instance.waitUntilRenderFlush();

		expect(typeof appCtx!.waitUntilRenderFlush).toBe('function');
		counter.value = 5;
		await appCtx!.waitUntilRenderFlush();
		expect(stripAnsi(stdout.frames.at(-1) ?? '')).toContain('n=5');

		instance.unmount();
	});

	it('resolves on the next microtask when nothing is pending', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'idle'),
		});
		const instance = render(App, { stdout, interactive: true });
		await instance.waitUntilRenderFlush();
		// No pending change; should resolve quickly without hanging.
		const t = Date.now();
		await instance.waitUntilRenderFlush();
		expect(Date.now() - t).toBeLessThan(100);
		instance.unmount();
	});
});
