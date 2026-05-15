import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('alignContent', () => {
	it('packs wrapped rows to flex-start by default', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						flexDirection: 'row',
						flexWrap: 'wrap',
						width: 4,
						height: 4,
					},
					() => [
						h(Box, { width: 2, height: 1 }, () => h(Text, null, () => 'aa')),
						h(Box, { width: 2, height: 1 }, () => h(Text, null, () => 'bb')),
						h(Box, { width: 2, height: 1 }, () => h(Text, null, () => 'cc')),
					],
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// First two children fit on row 0 (each 2 wide). Third wraps to row 1.
		// With flex-start packing, row 0 and row 1 sit at the top.
		expect(out.split('\n')[0]).toBe('aabb');
		expect(out.split('\n')[1]).toBe('cc');
	});

	it('alignContent space-between spreads wrapped rows', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						flexDirection: 'row',
						flexWrap: 'wrap',
						alignContent: 'space-between',
						width: 4,
						height: 4,
					},
					() => [
						h(Box, { width: 2, height: 1 }, () => h(Text, null, () => 'aa')),
						h(Box, { width: 2, height: 1 }, () => h(Text, null, () => 'bb')),
						h(Box, { width: 2, height: 1 }, () => h(Text, null, () => 'cc')),
					],
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		expect(lines[0]).toBe('aabb');
		// Last wrapped row pushed to bottom edge of the 4-line cross axis.
		expect(lines[3]).toBe('cc');
	});
});
