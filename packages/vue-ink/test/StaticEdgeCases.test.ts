import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text, Static } from '../src/index.ts';
import { renderToString } from './helpers.ts';

type Task = { id: string; label: string };

describe('<Static> component edge cases', () => {
	it('renders nothing for an empty array', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(
						Static,
						{ items: [] },
						{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
					),
					h(Text, null, () => 'after'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// "after" is the only visible content; Static contributed no rows.
		expect(out).toBe('after');
	});

	it('renders a single-element array', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: ['only'] },
					{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('only');
	});

	it('renders duplicate string values both times', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: ['A', 'A'] },
					{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// Both 'A' rows must appear — verify a single 'A' is not deduped away.
		const lines = out.split('\n').filter((line) => line.trim().length > 0);
		expect(lines.length).toBeGreaterThanOrEqual(2);
		expect(lines[0]).toBe('A');
		expect(lines[1]).toBe('A');
	});

	it('renders an array of objects using the item.id as a key', async () => {
		const tasks: Task[] = [
			{ id: 't1', label: 'first' },
			{ id: 't2', label: 'second' },
			{ id: 't3', label: 'third' },
		];
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: tasks },
					{
						default: ({ item }: { item: Task }) =>
							h(Text, { key: item.id }, () => item.label),
					},
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('first');
		expect(out).toContain('second');
		expect(out).toContain('third');
		expect(out.indexOf('first')).toBeLessThan(out.indexOf('second'));
		expect(out.indexOf('second')).toBeLessThan(out.indexOf('third'));
	});

	it('passes a zero-based index alongside the item to the slot', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: ['x', 'y', 'z'] },
					{
						default: ({ item, index }: { item: string; index: number }) =>
							h(Text, null, () => `${index}-${item}`),
					},
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('0-x');
		expect(out).toContain('1-y');
		expect(out).toContain('2-z');
	});

	it('applies a custom style prop to the container box', async () => {
		// Custom styles merge with Static's defaults (position:absolute,
		// flexDirection:column). Adding paddingLeft shifts every item right.
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Static,
					{ items: ['a', 'b'], style: { paddingLeft: 3 } },
					{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n').filter((line) => line.length > 0);
		// Each item is shifted right by 3 spaces.
		expect(lines[0]).toBe('   a');
		expect(lines[1]).toBe('   b');
	});
});
