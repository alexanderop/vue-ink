import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString, renderToStringRaw } from './helpers.ts';

type BoxStyle = {
	topLeft: string;
	top: string;
	topRight: string;
	right: string;
	bottomRight: string;
	bottom: string;
	bottomLeft: string;
	left: string;
};

describe('borders: more branches', () => {
	it('accepts an explicit borderStyle object', async () => {
		const customBox: BoxStyle = {
			topLeft: 'A',
			top: 'B',
			topRight: 'C',
			right: 'D',
			bottomRight: 'E',
			bottom: 'F',
			bottomLeft: 'G',
			left: 'H',
		};
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { borderStyle: customBox, width: 6, height: 3 }, () =>
					h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out.split('\n')).toEqual(['ABBBBC', 'Hx   D', 'GFFFFE']);
	});

	it('drops bottom edge when borderBottom is false', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ borderStyle: 'single', borderBottom: false, width: 6, height: 3 },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toBe(['┌────┐', '│x   │', '│    │'].join('\n'));
	});

	it('drops right edge when borderRight is false', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ borderStyle: 'single', borderRight: false, width: 6, height: 3 },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		// trailing spaces are trimmed per line by Output
		expect(out).toBe(['┌─────', '│x', '└─────'].join('\n'));
	});

	it('applies borderTopColor, borderBottomColor independently', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderTopColor: 'red',
						borderBottomColor: 'blue',
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		expect(raw).toMatch(/\x1b\[31m.*┌/); // red top
		expect(raw).toMatch(/\x1b\[34m.*└/); // blue bottom
	});

	it('applies borderDimColor (dim modifier on all edges)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderDimColor: true,
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		expect(raw).toMatch(/\x1b\[2m/);
	});

	it('applies borderBackgroundColor', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderBackgroundColor: 'yellow',
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		// bgYellow = 43
		expect(raw).toMatch(/\x1b\[43m/);
	});
});
