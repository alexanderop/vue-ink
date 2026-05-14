import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import Yoga from 'yoga-layout';
import stripAnsi from 'strip-ansi';
import { render, Box, Text } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('comments are invisible', () => {
	it('renders no spurious whitespace from v-if comment anchors', async () => {
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'a'),
					// v-if anchor: a falsy slot child renders as a comment vnode
					false,
					h(Text, null, () => 'b'),
				]),
		});
		const instance = render(Demo, { stdout });
		await flush();
		const out = stripAnsi(stdout.frames.join('')).replace(/\n+$/, '');
		instance.unmount();
		expect(out).toBe('a\nb');
	});
});

describe('rerender preserves component state', () => {
	it('keeps the same root instance when rerender is called with the same component', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});

		const instance = render(App, { stdout });
		await flush();

		counter.value = 1;
		instance.rerender(App);
		await flush();

		counter.value = 2;
		await flush();

		const frames = stdout.frames.map((f) => stripAnsi(f).trim()).filter(Boolean);
		instance.unmount();

		// state survives rerender: we see n=2 after the rerender swap
		expect(frames.at(-1)).toContain('n=2');
	});
});

describe('resize triggers a re-layout', () => {
	it('produces a new frame when columns change', async () => {
		const stdout = createCaptureStream(10);
		const Demo = defineComponent({
			setup: () => () => h(Box, { width: '100%' }, () => h(Text, null, () => 'X')),
		});
		const instance = render(Demo, { stdout });
		await flush();
		const before = stdout.frames.length;

		stdout.columns = 30;
		stdout.emit('resize');
		await flush();

		instance.unmount();
		expect(stdout.frames.length).toBeGreaterThan(before);
	});
});

describe('yoga cleanup on unmount', () => {
	it('frees the yoga subtree so leftover handles cannot keep accumulating', async () => {
		// Yoga nodes inherit from a per-instance class — easiest cross-version
		// way to count live handles is to snapshot a created node's proto and
		// confirm freeRecursive is called when we unmount.
		const probe = Yoga.Node.create();
		const proto = Object.getPrototypeOf(probe) as {
			freeRecursive: (this: unknown) => void;
		};
		const spy = vi.spyOn(proto, 'freeRecursive');
		probe.freeRecursive(); // baseline call so spy is wired correctly
		const baseline = spy.mock.calls.length;

		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'hi'),
		});
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();

		expect(spy.mock.calls.length).toBeGreaterThan(baseline);
		spy.mockRestore();
	});
});
