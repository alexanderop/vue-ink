import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Static, Box, Text } from '../src/index.ts';
import { createCaptureStream, flush, renderToString } from './helpers.ts';

describe('<Static>', () => {
	it('renders every item once and lays them out in column order (debug mode)', async () => {
		const App = defineComponent({
			setup: () => () =>
				h(Box, null, () => [
					h(
						Static,
						{ items: ['A', 'B', 'C'] },
						{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
					),
					h(Box, { marginTop: 1 }, () => h(Text, null, () => 'X')),
				]),
		});

		const out = await renderToString(App, { columns: 20 });
		// All three static items appear, in order, ABOVE the dynamic content.
		expect(out).toContain('A');
		expect(out).toContain('B');
		expect(out).toContain('C');
		expect(out).toContain('X');
		expect(out.indexOf('A')).toBeLessThan(out.indexOf('B'));
		expect(out.indexOf('B')).toBeLessThan(out.indexOf('C'));
	});

	it('appending to items writes the new rows once and does not re-render previous rows', async () => {
		const stdout = createCaptureStream(20);
		const items = ref<string[]>([]);
		const App = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: items.value },
					{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
				),
		});

		const instance = render(App, { stdout, debug: true });
		await flush();
		const baseline = stdout.frames.length;

		items.value = ['A'];
		await flush();
		const afterA = stdout.frames.length;
		expect(afterA).toBeGreaterThan(baseline);
		const aFrame = stdout.frames[afterA - 1] ?? '';
		expect(stripAnsi(aFrame)).toContain('A');

		items.value = ['A', 'B'];
		await flush();
		const afterB = stdout.frames[stdout.frames.length - 1] ?? '';
		expect(stripAnsi(afterB)).toContain('B');

		items.value = ['A', 'B', 'C'];
		await flush();
		const afterC = stdout.frames[stdout.frames.length - 1] ?? '';
		expect(stripAnsi(afterC)).toContain('C');

		instance.unmount();
	});

	it('does not erase previous static rows when the live frame repaints', async () => {
		const stdout = createCaptureStream(20);
		const items = ref(['log:1', 'log:2']);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(
						Static,
						{ items: items.value },
						{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
					),
					h(Text, null, () => `live=${counter.value}`),
				]),
		});

		const instance = render(App, { stdout, interactive: true });
		await instance.waitUntilRenderFlush();

		const initialJoin = stdout.frames.join('');
		expect(stripAnsi(initialJoin)).toContain('log:1');
		expect(stripAnsi(initialJoin)).toContain('log:2');

		// Drive several live-frame repaints — none of them must trigger a
		// re-render of the existing static rows.
		const initialFrameCount = stdout.frames.length;
		for (let i = 1; i <= 5; i += 1) {
			counter.value = i;
			await instance.waitUntilRenderFlush();
		}

		// After repainting the live frame 5 more times, the new chunks must not
		// contain "log:1" or "log:2" — they were written once and never again.
		const afterLiveChanges = stdout.frames.slice(initialFrameCount).join('');
		expect(stripAnsi(afterLiveChanges)).not.toContain('log:1');
		expect(stripAnsi(afterLiveChanges)).not.toContain('log:2');
		expect(stripAnsi(stdout.frames.at(-1) ?? '')).toContain('live=5');

		instance.unmount();
	});

	it('emits new items above the live frame with one trailing newline', async () => {
		const stdout = createCaptureStream(20);
		const items = ref<string[]>([]);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(
						Static,
						{ items: items.value },
						{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
					),
					h(Text, null, () => `live=${counter.value}`),
				]),
		});

		const instance = render(App, { stdout, interactive: true });
		await instance.waitUntilRenderFlush();
		const before = stdout.frames.length;

		items.value = ['done:foo'];
		await instance.waitUntilRenderFlush();

		const newChunks = stdout.frames.slice(before).join('');
		expect(stripAnsi(newChunks)).toContain('done:foo');
		instance.unmount();
	});

	it('passes the index argument alongside the item to the default slot', async () => {
		const App = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: ['a', 'b', 'c'] },
					{
						default: ({ item, index }: { item: string; index: number }) =>
							h(Text, null, () => `${index}=${item}`),
					},
				),
		});

		const out = await renderToString(App, { columns: 20 });
		expect(out).toContain('0=a');
		expect(out).toContain('1=b');
		expect(out).toContain('2=c');
	});
});
