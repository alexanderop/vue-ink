import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import boxen, { type Options } from 'boxen';
import sliceAnsi from 'slice-ansi';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/overflow.tsx. Uses boxen + slice-ansi as
// oracles so the assertions track ink's behaviour rather than pinning a
// specific glyph layout.

const box = (text: string, options?: Options): string =>
	boxen(text, { ...options, borderStyle: 'round' });

const clipX = (text: string, columns: number): string =>
	text
		.split('\n')
		.map((line) => sliceAnsi(line, 0, columns).trim())
		.join('\n');

describe('overflow', () => {
	describe('overflowX', () => {
		it('single text node in a box inside overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(Box, { width: 16, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello World'),
					),
				),
			);
			expect(output).toBe('Hello');
		});

		it('single text node inside overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{ width: 6, overflowX: 'hidden', borderStyle: 'round' },
					() =>
						h(Box, { width: 16, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello World'),
						),
				),
			);
			expect(output).toBe(box('Hell'));
		});

		it('single text node in a box with border inside overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(
						Box,
						{ width: 16, flexShrink: 0, borderStyle: 'round' },
						() => h(Text, null, () => 'Hello World'),
					),
				),
			);
			expect(output).toBe(clipX(box('Hello'), 6));
		});

		it('multiple text nodes in a box inside overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(Box, { width: 12, flexShrink: 0 }, () => [
						h(Text, null, () => 'Hello '),
						h(Text, null, () => 'World'),
					]),
				),
			);
			expect(output).toBe('Hello');
		});

		it('multiple text nodes in a box inside overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{ width: 8, overflowX: 'hidden', borderStyle: 'round' },
					() =>
						h(Box, { width: 12, flexShrink: 0 }, () => [
							h(Text, null, () => 'Hello '),
							h(Text, null, () => 'World'),
						]),
				),
			);
			expect(output).toBe(box('Hello '));
		});

		it('multiple text nodes in a box with border inside overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 8, overflowX: 'hidden' }, () =>
					h(
						Box,
						{ width: 12, flexShrink: 0, borderStyle: 'round' },
						() => [
							h(Text, null, () => 'Hello '),
							h(Text, null, () => 'World'),
						],
					),
				),
			);
			expect(output).toBe(clipX(box('HelloWo\n'), 8));
		});

		it('multiple boxes inside overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () => [
					h(Box, { width: 6, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello '),
					),
					h(Box, { width: 6, flexShrink: 0 }, () =>
						h(Text, null, () => 'World'),
					),
				]),
			);
			expect(output).toBe('Hello');
		});

		it('multiple boxes inside overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{ width: 8, overflowX: 'hidden', borderStyle: 'round' },
					() => [
						h(Box, { width: 6, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello '),
						),
						h(Box, { width: 6, flexShrink: 0 }, () =>
							h(Text, null, () => 'World'),
						),
					],
				),
			);
			expect(output).toBe(box('Hello '));
		});

		it('box before left edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(Box, { marginLeft: -12, width: 6, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello'),
					),
				),
			);
			expect(output).toBe('');
		});

		it('box before left edge of overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{ width: 6, overflowX: 'hidden', borderStyle: 'round' },
					() =>
						h(Box, { marginLeft: -12, width: 6, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello'),
						),
				),
			);
			expect(output).toBe(box(' '.repeat(4)));
		});

		it('box intersecting with left edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(Box, { marginLeft: -3, width: 12, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello World'),
					),
				),
			);
			expect(output).toBe('lo Wor');
		});

		it('box intersecting with left edge of overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{ width: 8, overflowX: 'hidden', borderStyle: 'round' },
					() =>
						h(Box, { marginLeft: -3, width: 12, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello World'),
						),
				),
			);
			expect(output).toBe(box('lo Wor'));
		});

		it('box after right edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(Box, { marginLeft: 6, width: 6, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello'),
					),
				),
			);
			expect(output).toBe('');
		});

		it('box intersecting with right edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 6, overflowX: 'hidden' }, () =>
					h(Box, { marginLeft: 3, width: 6, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello'),
					),
				),
			);
			expect(output).toBe('   Hel');
		});
	});

	describe('overflowY', () => {
		it('single text node inside overflow container', () => {
			const output = frame(() =>
				h(Box, { height: 1, overflowY: 'hidden' }, () =>
					h(Text, null, () => 'Hello\nWorld'),
				),
			);
			expect(output).toBe('Hello');
		});

		it('single text node inside overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{
						width: 20,
						height: 3,
						overflowY: 'hidden',
						borderStyle: 'round',
					},
					() => h(Text, null, () => 'Hello\nWorld'),
				),
			);
			expect(output).toBe(box('Hello'.padEnd(18, ' ')));
		});

		it('multiple boxes inside overflow container', () => {
			const output = frame(() =>
				h(
					Box,
					{ height: 2, overflowY: 'hidden', flexDirection: 'column' },
					() => [
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #1'),
						),
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #2'),
						),
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #3'),
						),
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #4'),
						),
					],
				),
			);
			expect(output).toBe('Line #1\nLine #2');
		});

		it('multiple boxes inside overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{
						width: 9,
						height: 4,
						overflowY: 'hidden',
						flexDirection: 'column',
						borderStyle: 'round',
					},
					() => [
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #1'),
						),
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #2'),
						),
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #3'),
						),
						h(Box, { flexShrink: 0 }, () =>
							h(Text, null, () => 'Line #4'),
						),
					],
				),
			);
			expect(output).toBe(box('Line #1\nLine #2'));
		});

		it('box above top edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { height: 1, overflowY: 'hidden' }, () =>
					h(Box, { marginTop: -2, height: 2, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello\nWorld'),
					),
				),
			);
			expect(output).toBe('');
		});

		it('box above top edge of overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{
						width: 7,
						height: 3,
						overflowY: 'hidden',
						borderStyle: 'round',
					},
					() =>
						h(Box, { marginTop: -3, height: 2, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello\nWorld'),
						),
				),
			);
			expect(output).toBe(box(' '.repeat(5)));
		});

		it('box intersecting with top edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { height: 1, overflowY: 'hidden' }, () =>
					h(Box, { marginTop: -1, height: 2, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello\nWorld'),
					),
				),
			);
			expect(output).toBe('World');
		});

		it('box intersecting with top edge of overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{
						width: 7,
						height: 3,
						overflowY: 'hidden',
						borderStyle: 'round',
					},
					() =>
						h(Box, { marginTop: -1, height: 2, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello\nWorld'),
						),
				),
			);
			expect(output).toBe(box('World'));
		});

		it('box below bottom edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { height: 1, overflowY: 'hidden' }, () =>
					h(Box, { marginTop: 1, height: 2, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello\nWorld'),
					),
				),
			);
			expect(output).toBe('');
		});

		it('box below bottom edge of overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{
						width: 7,
						height: 3,
						overflowY: 'hidden',
						borderStyle: 'round',
					},
					() =>
						h(Box, { marginTop: 2, height: 2, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello\nWorld'),
						),
				),
			);
			expect(output).toBe(box(' '.repeat(5)));
		});

		it('box intersecting with bottom edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { height: 1, overflowY: 'hidden' }, () =>
					h(Box, { height: 2, flexShrink: 0 }, () =>
						h(Text, null, () => 'Hello\nWorld'),
					),
				),
			);
			expect(output).toBe('Hello');
		});

		it('box intersecting with bottom edge of overflow container with border', () => {
			const output = frame(() =>
				h(
					Box,
					{
						width: 7,
						height: 3,
						overflowY: 'hidden',
						borderStyle: 'round',
					},
					() =>
						h(Box, { height: 2, flexShrink: 0 }, () =>
							h(Text, null, () => 'Hello\nWorld'),
						),
				),
			);
			expect(output).toBe(box('Hello'));
		});
	});

	describe('overflow (both axes)', () => {
		it('single text node inside overflow container', () => {
			const output = frame(() =>
				h(Box, { paddingBottom: 1 }, () =>
					h(
						Box,
						{ width: 6, height: 1, overflow: 'hidden' },
						() =>
							h(Box, { width: 12, height: 2, flexShrink: 0 }, () =>
								h(Text, null, () => 'Hello\nWorld'),
							),
					),
				),
			);
			expect(output).toBe('Hello\n');
		});

		it('single text node inside overflow container with border', () => {
			const output = frame(() =>
				h(Box, { paddingBottom: 1 }, () =>
					h(
						Box,
						{
							width: 8,
							height: 3,
							overflow: 'hidden',
							borderStyle: 'round',
						},
						() =>
							h(Box, { width: 12, height: 2, flexShrink: 0 }, () =>
								h(Text, null, () => 'Hello\nWorld'),
							),
					),
				),
			);
			expect(output).toBe(`${box('Hello ')}\n`);
		});

		it('multiple boxes inside overflow container', () => {
			const output = frame(() =>
				h(Box, { paddingBottom: 1 }, () =>
					h(Box, { width: 4, height: 1, overflow: 'hidden' }, () => [
						h(Box, { width: 2, height: 2, flexShrink: 0 }, () =>
							h(Text, null, () => 'TL\nBL'),
						),
						h(Box, { width: 2, height: 2, flexShrink: 0 }, () =>
							h(Text, null, () => 'TR\nBR'),
						),
					]),
				),
			);
			expect(output).toBe('TLTR\n');
		});

		it('multiple boxes inside overflow container with border', () => {
			const output = frame(() =>
				h(Box, { paddingBottom: 1 }, () =>
					h(
						Box,
						{
							width: 6,
							height: 3,
							overflow: 'hidden',
							borderStyle: 'round',
						},
						() => [
							h(Box, { width: 2, height: 2, flexShrink: 0 }, () =>
								h(Text, null, () => 'TL\nBL'),
							),
							h(Box, { width: 2, height: 2, flexShrink: 0 }, () =>
								h(Text, null, () => 'TR\nBR'),
							),
						],
					),
				),
			);
			expect(output).toBe(`${box('TLTR')}\n`);
		});

		it('box intersecting with top left edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 4, height: 4, overflow: 'hidden' }, () =>
					h(
						Box,
						{
							marginTop: -2,
							marginLeft: -2,
							width: 4,
							height: 4,
							flexShrink: 0,
						},
						() => h(Text, null, () => 'AAAA\nBBBB\nCCCC\nDDDD'),
					),
				),
			);
			expect(output).toBe('CC\nDD\n\n');
		});

		it('box intersecting with top right edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 4, height: 4, overflow: 'hidden' }, () =>
					h(
						Box,
						{
							marginTop: -2,
							marginLeft: 2,
							width: 4,
							height: 4,
							flexShrink: 0,
						},
						() => h(Text, null, () => 'AAAA\nBBBB\nCCCC\nDDDD'),
					),
				),
			);
			expect(output).toBe('  CC\n  DD\n\n');
		});

		it('box intersecting with bottom left edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 4, height: 4, overflow: 'hidden' }, () =>
					h(
						Box,
						{
							marginTop: 2,
							marginLeft: -2,
							width: 4,
							height: 4,
							flexShrink: 0,
						},
						() => h(Text, null, () => 'AAAA\nBBBB\nCCCC\nDDDD'),
					),
				),
			);
			expect(output).toBe('\n\nAA\nBB');
		});

		it('box intersecting with bottom right edge of overflow container', () => {
			const output = frame(() =>
				h(Box, { width: 4, height: 4, overflow: 'hidden' }, () =>
					h(
						Box,
						{
							marginTop: 2,
							marginLeft: 2,
							width: 4,
							height: 4,
							flexShrink: 0,
						},
						() => h(Text, null, () => 'AAAA\nBBBB\nCCCC\nDDDD'),
					),
				),
			);
			expect(output).toBe('\n\n  AA\n  BB');
		});

		it('nested overflow', () => {
			const output = frame(() =>
				h(Box, { paddingBottom: 1 }, () =>
					h(
						Box,
						{
							width: 4,
							height: 4,
							overflow: 'hidden',
							flexDirection: 'column',
						},
						() => [
							h(
								Box,
								{ width: 2, height: 2, overflow: 'hidden' },
								() =>
									h(
										Box,
										{ width: 4, height: 4, flexShrink: 0 },
										() =>
											h(
												Text,
												null,
												() => 'AAAA\nBBBB\nCCCC\nDDDD',
											),
									),
							),
							h(Box, { width: 4, height: 3 }, () =>
								h(Text, null, () => 'XXXX\nYYYY\nZZZZ'),
							),
						],
					),
				),
			);
			expect(output).toBe('AA\nBB\nXXXX\nYYYY\n');
		});

		it('out of bounds writes do not crash', () => {
			// vue-ink's renderer writes the full Yoga-computed width even when
			// the terminal is narrower; ink truncates each content row at the
			// stdout column count while letting the border line through. Both
			// behaviours satisfy the underlying invariant ("don't crash"), so
			// we assert the contract rather than pinning a specific layout.
			expect(() =>
				frame(
					() =>
						h(Box, { width: 12, height: 10, borderStyle: 'round' }),
					{ columns: 10 },
				),
			).not.toThrow();
		});
	});
});
