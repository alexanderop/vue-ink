import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import stripAnsi from 'strip-ansi';
import { Box, Text } from '../src/index.ts';
import { renderToStringRaw } from './helpers.ts';

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

describe('borders: per-edge styling and custom glyphs', () => {
	it('applies borderTopBackgroundColor independently of bottom', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderTopBackgroundColor: 'red',
						borderBottomBackgroundColor: 'blue',
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		// bgRed = 41, bgBlue = 44
		expect(raw).toMatch(/\x1b\[41m.*┌/);
		expect(raw).toMatch(/\x1b\[44m.*└/);
	});

	it('applies borderLeftBackgroundColor and borderRightBackgroundColor per side', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderLeftBackgroundColor: 'green',
						borderRightBackgroundColor: 'yellow',
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		// bgGreen = 42, bgYellow = 43
		expect(raw).toMatch(/\x1b\[42m/);
		expect(raw).toMatch(/\x1b\[43m/);
	});

	it('applies borderTopDimColor only to top edge', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderTopDimColor: true,
						borderTopColor: 'red',
						borderBottomColor: 'red',
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		// The dim modifier (CSI 2) appears alongside the top edge.
		expect(raw).toMatch(/\x1b\[2m/);
		// Confirm the top edge contains both color and dim, and the row with
		// "└" (bottom edge) does not have the dim sequence preceding it.
		const lines = raw.split('\n');
		const topLine = lines.find((l) => l.includes('┌')) ?? '';
		const bottomLine = lines.find((l) => l.includes('└')) ?? '';
		expect(topLine).toContain('\x1b[2m');
		expect(bottomLine).not.toContain('\x1b[2m');
	});

	it('applies borderBottomDimColor and borderLeftDimColor and borderRightDimColor independently', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'single',
						borderBottomDimColor: true,
						borderLeftDimColor: true,
						borderRightDimColor: true,
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		// Each of bottom/left/right got the dim modifier (CSI 2).
		const dimCount = (raw.match(/\x1b\[2m/g) ?? []).length;
		expect(dimCount).toBeGreaterThanOrEqual(3);
	});

	it('custom BoxStyle object combined with borderTop: false drops top edge but keeps custom corner glyphs on remaining edges', async () => {
		const customBox: BoxStyle = {
			topLeft: '+',
			top: '=',
			topRight: '+',
			right: '|',
			bottomRight: '+',
			bottom: '=',
			bottomLeft: '+',
			left: '|',
		};
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: customBox,
						borderTop: false,
						width: 6,
						height: 3,
					},
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 10 });
		const stripped = stripAnsi(raw);
		const lines = stripped.split('\n').map((l) => l.trimEnd()).filter(Boolean);
		// No top edge → first row is the content row (left | spaces | right).
		expect(lines[0]).toBe('|x   |');
		// Bottom row uses the custom corners and the custom bottom glyph.
		expect(lines[lines.length - 1]).toBe('+====+');
	});
});
