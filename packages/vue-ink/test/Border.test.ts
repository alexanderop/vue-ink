import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString, renderToStringRaw } from './helpers.ts';

describe('Box borders', () => {
	it('renders single-style border around content', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { borderStyle: 'single', width: 10, height: 3 }, () =>
					h(Text, null, () => 'hi'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe(['┌────────┐', '│hi      │', '└────────┘'].join('\n'));
	});

	it('reserves space for the border so children sit inside it', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { borderStyle: 'single', width: 6 }, () =>
					h(Text, null, () => 'ab'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe(['┌────┐', '│ab  │', '└────┘'].join('\n'));
	});

	it('uses double-style glyphs', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { borderStyle: 'double', width: 6, height: 3 }, () =>
					h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe(['╔════╗', '║x   ║', '╚════╝'].join('\n'));
	});

	it('drops the top edge when borderTop is false (corners adapt)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ borderStyle: 'single', borderTop: false, width: 6, height: 3 },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// No top edge, height 3 → 2 inner rows + 1 bottom edge.
		// Without a top edge, the side borders start at row 0.
		expect(out).toBe(['│x   │', '│    │', '└────┘'].join('\n'));
	});

	it('drops the left edge when borderLeft is false', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ borderStyle: 'single', borderLeft: false, width: 6, height: 3 },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		// No left edge → top-left and bottom-left corners disappear; the top
		// row is 5 horizontals + top-right glyph; bottom row similarly.
		expect(out).toBe(['─────┐', 'x    │', '─────┘'].join('\n'));
	});

	it('paints the border in the requested color', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ borderStyle: 'single', borderColor: 'green', width: 6, height: 3 },
					() => h(Text, null, () => 'x'),
				),
		});
		const raw = await renderToStringRaw(Demo, { columns: 20 });
		// Green = [32m. Border glyphs should be wrapped in that escape.
		expect(raw).toMatch(/\[32m.*┌.*\[39m/);
	});
});
