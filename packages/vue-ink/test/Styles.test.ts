import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

// styles.ts is an internal yoga-translation layer. Hit every branch by
// rendering Box with each style prop combination.

describe('styles', () => {
	it('applies margin via shorthand and per-edge', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ marginLeft: 2, marginTop: 1 },
					() => h(Text, null, () => 'x'),
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		const lines = out.split('\n');
		expect(lines[lines.length - 1]).toContain('x');
	});

	it('applies marginX and marginY shorthand', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ flexDirection: 'column' },
					() => [
						h(Box, { marginX: 1, marginY: 1 }, () => h(Text, null, () => 'x')),
					],
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('x');
	});

	it('applies margin shorthand (all edges)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { margin: 1 }, () => h(Text, null, () => 'a')),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('a');
	});

	it('applies marginRight and marginBottom', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { marginRight: 2, marginBottom: 1 }, () => h(Text, null, () => 'b')),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('b');
	});

	it('applies padding shorthand and per-edge', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { padding: 1, paddingLeft: 2 }, () => h(Text, null, () => 'p')),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('p');
	});

	it('applies paddingX, paddingY, paddingRight, paddingTop, paddingBottom', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ paddingX: 1, paddingY: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1 },
					() => h(Text, null, () => 'q'),
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('q');
	});

	it('respects flexGrow', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 6, flexDirection: 'row' }, () => [
					h(Box, { flexGrow: 1 }, () => h(Text, null, () => 'a')),
					h(Box, { flexGrow: 1 }, () => h(Text, null, () => 'b')),
				]),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('a');
		expect(out).toContain('b');
	});

	it('respects flexShrink', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 4 }, () => [
					h(Box, { flexShrink: 0 }, () => h(Text, null, () => 'abc')),
					h(Box, { flexShrink: 1 }, () => h(Text, null, () => 'def')),
				]),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out.length).toBeGreaterThan(0);
	});

	it('respects flexBasis as a number', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 10 }, () =>
					h(Box, { flexBasis: 5 }, () => h(Text, null, () => 'x')),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('x');
	});

	it('respects flexBasis as a percentage string', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 10 }, () =>
					h(Box, { flexBasis: '50%' }, () => h(Text, null, () => 'x')),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('x');
	});

	it('respects flexWrap wrap / nowrap / wrap-reverse', async () => {
		for (const flexWrap of ['wrap', 'nowrap', 'wrap-reverse'] as const) {
			const Demo = defineComponent({
				setup: () => () =>
					h(Box, { flexWrap, width: 6, flexDirection: 'row' }, () => [
						h(Box, { width: 4 }, () => h(Text, null, () => 'a')),
						h(Box, { width: 4 }, () => h(Text, null, () => 'b')),
					]),
			});
			const out = await renderToString(Demo, { columns: 10 });
			expect(out).toContain('a');
		}
	});

	it('respects flexDirection variants', async () => {
		for (const flexDirection of [
			'row',
			'row-reverse',
			'column',
			'column-reverse',
		] as const) {
			const Demo = defineComponent({
				setup: () => () =>
					h(Box, { flexDirection }, () => [
						h(Text, null, () => 'a'),
						h(Text, null, () => 'b'),
					]),
			});
			const out = await renderToString(Demo, { columns: 10 });
			expect(out).toContain('a');
		}
	});

	it('respects alignItems variants', async () => {
		for (const alignItems of [
			'flex-start',
			'center',
			'flex-end',
			'stretch',
			'baseline',
		] as const) {
			const Demo = defineComponent({
				setup: () => () =>
					h(
						Box,
						{ flexDirection: 'column', height: 3, alignItems },
						() => h(Text, null, () => 'a'),
					),
			});
			const out = await renderToString(Demo, { columns: 10 });
			expect(out).toContain('a');
		}
	});

	it('respects alignSelf variants', async () => {
		for (const alignSelf of [
			'auto',
			'flex-start',
			'center',
			'flex-end',
			'stretch',
			'baseline',
		] as const) {
			const Demo = defineComponent({
				setup: () => () =>
					h(Box, { flexDirection: 'column', height: 3 }, () =>
						h(Box, { alignSelf }, () => h(Text, null, () => 'a')),
					),
			});
			const out = await renderToString(Demo, { columns: 10 });
			expect(out).toContain('a');
		}
	});

	it('respects justifyContent variants', async () => {
		for (const justifyContent of [
			'flex-start',
			'center',
			'flex-end',
			'space-between',
			'space-around',
			'space-evenly',
		] as const) {
			const Demo = defineComponent({
				setup: () => () =>
					h(Box, { width: 10, flexDirection: 'row', justifyContent }, () => [
						h(Text, null, () => 'a'),
						h(Text, null, () => 'b'),
					]),
			});
			const out = await renderToString(Demo, { columns: 10 });
			expect(out).toContain('a');
		}
	});

	it('respects minWidth/minHeight as number and percent', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ width: 10, flexDirection: 'column' },
					() =>
						h(
							Box,
							{ minWidth: 5, minHeight: 2 },
							() => h(Text, null, () => 'a'),
						),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('a');

		const Demo2 = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ width: 10 },
					() => h(Box, { minWidth: '50%', minHeight: '50%' }, () => h(Text, null, () => 'b')),
				),
		});
		const out2 = await renderToString(Demo2, { columns: 20 });
		expect(out2).toContain('b');
	});

	it('respects maxWidth/maxHeight as number and percent', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { maxWidth: 4, maxHeight: 2 }, () => h(Text, null, () => 'hello')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('hel');

		const Demo2 = defineComponent({
			setup: () => () =>
				h(Box, { width: 10 }, () =>
					h(Box, { maxWidth: '50%', maxHeight: '50%' }, () => h(Text, null, () => 'hi')),
				),
		});
		const out2 = await renderToString(Demo2, { columns: 20 });
		expect(out2).toContain('hi');
	});

	it('respects width / height as percent strings', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 10 }, () =>
					h(Box, { width: '50%', height: '50%' }, () => h(Text, null, () => 'x')),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toContain('x');
	});

	it('respects display: none (hides the subtree)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Box, { display: 'none' }, () => h(Text, null, () => 'hidden')),
					h(Text, null, () => 'visible'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).not.toContain('hidden');
		expect(out).toContain('visible');
	});

	it('respects gap, columnGap, rowGap', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'row', gap: 2 }, () => [
					h(Text, null, () => 'a'),
					h(Text, null, () => 'b'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('a  b');

		const Demo2 = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column', columnGap: 1, rowGap: 1 }, () => [
					h(Text, null, () => 'a'),
					h(Text, null, () => 'b'),
				]),
		});
		const out2 = await renderToString(Demo2, { columns: 20 });
		expect(out2.split('\n').filter(Boolean)).toEqual(['a', 'b']);
	});
});
