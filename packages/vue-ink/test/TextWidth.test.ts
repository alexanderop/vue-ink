import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';
import { Box, Text } from '../src/index.ts';
import { renderToString, renderToStringRaw } from './helpers.ts';

// Ported from repos/ink/test/text-width.tsx. Wide-character (CJK, emoji)
// layout regressions tend to be invisible to unit-level stringWidth tests —
// these go through the real Box/Text pipeline so a layout miscount or
// boundary-cleanup bug surfaces here.

describe('text-width — wide characters in fixed-width Box', () => {
	it('wide characters do not add extra space inside fixed-width Box', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Box, null, () => [
						h(Box, { width: 2 }, () => h(Text, null, () => '🍔')),
						h(Text, null, () => '|'),
					]),
					h(Box, null, () => [
						h(Box, { width: 2 }, () => h(Text, null, () => '⏳')),
						h(Text, null, () => '|'),
					]),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		expect(lines).toHaveLength(2);
		expect(lines[0]).toBe('🍔|');
		expect(lines[1]).toBe('⏳|');
	});

	it('CJK characters occupy correct width in fixed-width Box', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, null, () => [
					h(Box, { width: 4 }, () => h(Text, null, () => '你好')),
					h(Text, null, () => '|'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('你好|');
	});

	it('mixed ASCII and wide characters align correctly', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Box, null, () => [
						h(Box, { width: 6 }, () => h(Text, null, () => 'ab🍔cd')),
						h(Text, null, () => '|'),
					]),
					h(Box, null, () => [
						h(Box, { width: 6 }, () => h(Text, null, () => 'abcdef')),
						h(Text, null, () => '|'),
					]),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		const lines = out.split('\n');
		expect(lines).toHaveLength(2);
		expect(lines[0]).toBe('ab🍔cd|');
		expect(lines[1]).toBe('abcdef|');
	});

	it('ANSI styled text does not affect layout width', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, null, () => [
					h(Box, { width: 5 }, () => h(Text, { color: 'red' }, () => 'hello')),
					h(Text, null, () => '|'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('hello|');
	});

	it('empty Text does not affect sibling layout', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Box, null, () => [h(Text), h(Text, null, () => 'hello')]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('hello');
	});
});

describe('text-width — CJK truncation', () => {
	it('truncates CJK text at end', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 20 }, () => h(Text, { wrap: 'truncate' }, () => 'あいうえおかきくけこ|end')),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(stringWidth(out)).toBeLessThanOrEqual(20);
	});

	it('truncates CJK text in the middle', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 20 }, () =>
					h(Text, { wrap: 'truncate-middle' }, () => 'あいうえおかきくけこ|end'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(stringWidth(out)).toBeLessThanOrEqual(20);
	});

	it('truncates CJK text at start', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 20 }, () =>
					h(Text, { wrap: 'truncate-start' }, () => 'あいうえおかきくけこ|end'),
				),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(stringWidth(out)).toBeLessThanOrEqual(20);
	});

	it('truncated CJK text does not push sibling past Box width', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, null, () => [
					h(Box, { width: 20 }, () =>
						h(Text, { wrap: 'truncate' }, () => 'あいうえおかきくけこ|end'),
					),
					h(Text, null, () => '|'),
				]),
		});
		const out = await renderToString(Demo, { columns: 40 });
		const lines = out.split('\n');
		expect(lines).toHaveLength(1);
		expect(lines[0]!.endsWith('|')).toBe(true);
	});
});

describe('text-width — absolute overlay over wide characters', () => {
	// Boundary cleanup: when an overlay lands on one cell of a wide char,
	// the other half-cell must be cleared so the terminal doesn't render
	// a malformed glyph.

	it('overlay on 2nd cell of CJK character clears the full character', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 20, height: 1 }, () => [
					h(Text, null, () => 'あいうえおかきくけこ'),
					h(Box, { position: 'absolute', left: 9 }, () => h(Text, null, () => 'XYZ')),
				]),
		});
		const out = stripAnsi(await renderToStringRaw(Demo, { columns: 20 })).replace(
			/\n+$/,
			'',
		);
		const lines = out.split('\n');
		expect(stringWidth(lines[0]!)).toBe(20);
		expect(lines[0]).toBe('あいうえ XYZきくけこ');
	});

	it('overlay on 1st cell of CJK character clears trailing placeholder', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 20, height: 1 }, () => [
					h(Text, null, () => 'あいうえおかきくけこ'),
					h(Box, { position: 'absolute', left: 10 }, () => h(Text, null, () => 'X')),
				]),
		});
		const out = stripAnsi(await renderToStringRaw(Demo, { columns: 20 })).replace(
			/\n+$/,
			'',
		);
		const lines = out.split('\n');
		expect(stringWidth(lines[0]!)).toBe(20);
		expect(lines[0]).toBe('あいうえおX きくけこ');
	});

	it('CJK overlay on 2nd cell of CJK clears both sides', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 20, height: 1 }, () => [
					h(Text, null, () => 'あいうえおかきくけこ'),
					h(Box, { position: 'absolute', left: 5 }, () => h(Text, null, () => '漢字テスト')),
				]),
		});
		const out = stripAnsi(await renderToStringRaw(Demo, { columns: 20 })).replace(
			/\n+$/,
			'',
		);
		const lines = out.split('\n');
		expect(stringWidth(lines[0]!)).toBe(20);
		expect(lines[0]).toBe('あい 漢字テスト けこ');
	});

	it('clipped empty write does not corrupt existing wide characters', async () => {
		// When a write is clipped to an empty string, the boundary cleanup
		// must not run, otherwise it would destroy a wide character that
		// isn't actually being overwritten.
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: 4, height: 1, overflowX: 'hidden' }, () => [
					h(Text, null, () => 'あい'),
					h(Box, { position: 'absolute', left: -1, width: 1 }, () =>
						h(Text, null, () => 'Z'),
					),
				]),
		});
		const out = await renderToString(Demo, { columns: 4 });
		expect(out).toBe('あい');
	});
});
