import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('aspectRatio', () => {
	it('derives height from width when aspectRatio is set (w / aspect = h)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ width: 20, aspectRatio: 2, borderStyle: 'single' },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 40 });
		// Border consumes 2 of the rows; aspectRatio 2 with width 20 gives height 10.
		const lines = out.split('\n');
		expect(lines.length).toBe(10);
	});

	it('derives width from height when only height is set', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ height: 5, aspectRatio: 2, borderStyle: 'single' },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 40 });
		// aspectRatio 2 with height 5 → width 10. First border line must be 10 chars.
		const lines = out.split('\n');
		expect(lines[0].length).toBe(10);
	});
});
