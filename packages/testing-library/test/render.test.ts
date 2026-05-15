import { describe, test, expect, afterEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { Box, Text } from '@vue-ink/components';
import { useInput } from '@vue-ink/renderer';
import { render, cleanup } from '../src/index.ts';

afterEach(() => {
	cleanup();
});

describe('render', () => {
	test('returns the initial frame synchronously', () => {
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'Hello'),
		});

		const { lastFrame } = render(App);
		expect(lastFrame()).toBe('Hello');
	});

	test('rerender swaps the rendered component', async () => {
		const Counter = defineComponent({
			props: { count: { type: Number, required: true } },
			setup: (props) => () => h(Text, null, () => `Count: ${props.count}`),
		});

		const { lastFrame, rerender, waitUntilFlush } = render(
			h(Counter, { count: 0 }),
		);
		expect(lastFrame()).toBe('Count: 0');

		rerender(h(Counter, { count: 1 }));
		await waitUntilFlush();
		expect(lastFrame()).toBe('Count: 1');
	});

	test('reactive state changes show up after waitUntilFlush', async () => {
		const count = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${count.value}`),
		});

		const { lastFrame, waitUntilFlush } = render(App);
		expect(lastFrame()).toBe('n=0');

		count.value = 5;
		await waitUntilFlush();
		expect(lastFrame()).toBe('n=5');
	});

	test('frames captures every committed frame', async () => {
		const count = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => String(count.value)),
		});

		const { frames, waitUntilFlush } = render(App);
		count.value = 1;
		await waitUntilFlush();
		count.value = 2;
		await waitUntilFlush();

		// Initial mount may emit two identical frames (mutation flush +
		// post-mount renderImmediate) — assert content, not exact length.
		expect(frames).toContain('0');
		expect(frames).toContain('1');
		expect(frames).toContain('2');
		expect(frames.at(-1)).toBe('2');
	});

	test('stdin.write drives useInput', async () => {
		const seen: string[] = [];
		const App = defineComponent({
			setup() {
				useInput((input) => {
					seen.push(input);
				});
				return () => h(Text, null, () => 'ready');
			},
		});

		const { stdin } = render(App);
		stdin.write('a');
		stdin.write('b');
		expect(seen).toEqual(['a', 'b']);
	});

	test('unmount stops further frames', async () => {
		const count = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => String(count.value)),
		});

		const { frames, unmount, waitUntilFlush } = render(App);
		unmount();
		const lengthAtUnmount = frames.length;
		count.value = 99;
		await waitUntilFlush();
		expect(frames.length).toBe(lengthAtUnmount);
	});

	test('cleanup unmounts every active instance', () => {
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'hi'),
		});
		const a = render(App);
		const b = render(App);
		expect(a.lastFrame()).toBe('hi');
		expect(b.lastFrame()).toBe('hi');
		cleanup();
		// Subsequent renders should work without leaking the previous tree.
		const c = render(App);
		expect(c.lastFrame()).toBe('hi');
	});

	test('renders a Box layout without ANSI cursor noise', () => {
		const App = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'one'),
					h(Text, null, () => 'two'),
				]),
		});

		const { lastFrame } = render(App);
		expect(lastFrame()).toBe('one\ntwo');
	});
});
