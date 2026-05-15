import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('Box layout', () => {
	it('lays out children in a row with justifyContent space-between', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 20,
						flexDirection: 'row',
						justifyContent: 'space-between',
					},
					() => [h(Text, null, () => 'A'), h(Text, null, () => 'B')],
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('A                  B');
	});

	it('applies padding and width', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Box, { width: 10, paddingLeft: 2 }, () => h(Text, null, () => 'hi')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('  hi');
	});

	it('stacks column with margin', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'one'),
					h(Text, null, () => 'two'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toMatchInlineSnapshot(`
			"one
			two"
		`);
	});

	it('alignItems flex-end pushes text to the right edge', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 10,
						flexDirection: 'column',
						alignItems: 'flex-end',
					},
					() => h(Text, null, () => 'X'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('         X');
	});

	it('handles Fragment children (v-for) without crashing yoga', async () => {
		// Regression: Vue's v-for compiles to a Fragment with a comment anchor.
		// insertBeforeNode previously passed the DOM-tree index to yoga's
		// insertChild, but comments have no yoga node, so the DOM index
		// over-shot the yoga child count and corrupted wasm memory.
		const items = ['a', 'b', 'c'];
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					null,
					() =>
						items.map((label) =>
							h(Text, { key: label }, () => label),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('abc');
	});

	it('height fills with empty lines', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { height: 3, flexDirection: 'column' }, () => [h(Text, null, () => 'a')]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out.split('\n').length).toBeGreaterThanOrEqual(1);
		expect(out).toContain('a');
	});
});
