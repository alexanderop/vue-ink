import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import stripAnsi from 'strip-ansi';
import { Box, Text } from '../src/index.ts';
import { renderToStringRaw } from './helpers.ts';

describe('Box backgroundColor', () => {
	it('fills the box area with the background color', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { backgroundColor: 'red', width: 4, height: 2 }, () =>
					h(Text, null, () => 'hi'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 20 });
		// Red bg = [41m. Painted cells (spaces + "hi") should be wrapped.
		expect(raw).toMatch(/\[41m/);
		expect(stripAnsi(raw).replace(/\n+$/, '')).toContain('hi');
	});

	it('inherits background to descendant Text', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { backgroundColor: 'red', width: 4, height: 1 }, () =>
					h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 20 });
		// The 'x' itself should be painted on red bg (not just the box fill).
		expect(raw).toMatch(/\[41m[^]*x[^]*\[49m/);
	});

	it('Text can override inherited background', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { backgroundColor: 'red', width: 4, height: 1 }, () =>
					h(Text, { backgroundColor: 'blue' }, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 20 });
		// Text 'x' carries blue (44), not the inherited red around itself.
		expect(raw).toMatch(/\[44m[^]*x[^]*\[49m/);
	});

	it('respects border insets — does not paint over the border', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ borderStyle: 'single', backgroundColor: 'red', width: 6, height: 3 },
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 20 });
		const plain = stripAnsi(raw).replace(/\n+$/, '');
		expect(plain).toBe(['┌────┐', '│x   │', '└────┘'].join('\n'));
		// And background red [41m must appear somewhere (for the inner fill).
		expect(raw).toMatch(/\[41m/);
	});
});
