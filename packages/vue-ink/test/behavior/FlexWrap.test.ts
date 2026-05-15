import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex-wrap.tsx.

describe('flex-wrap', () => {
	it('row - no wrap', () => {
		const output = frame(() =>
			h(Box, { width: 2 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'BC'),
			]),
		);
		expect(output).toBe('BC\n');
	});

	it('column - no wrap', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', height: 2 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
				h(Text, null, () => 'C'),
			]),
		);
		expect(output).toBe('B\nC');
	});

	it('row - wrap content', () => {
		const output = frame(() =>
			h(Box, { width: 2, flexWrap: 'wrap' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'BC'),
			]),
		);
		expect(output).toBe('A\nBC');
	});

	it('column - wrap content', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', height: 2, flexWrap: 'wrap' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
				h(Text, null, () => 'C'),
			]),
		);
		expect(output).toBe('AC\nB');
	});

	it('column - wrap content reverse', () => {
		const output = frame(() =>
			h(
				Box,
				{
					flexDirection: 'column',
					height: 2,
					width: 3,
					flexWrap: 'wrap-reverse',
				},
				() => [
					h(Text, null, () => 'A'),
					h(Text, null, () => 'B'),
					h(Text, null, () => 'C'),
				],
			),
		);
		expect(output).toBe(' CA\n  B');
	});

	it('row - wrap content reverse', () => {
		const output = frame(() =>
			h(Box, { height: 3, width: 2, flexWrap: 'wrap-reverse' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
				h(Text, null, () => 'C'),
			]),
		);
		expect(output).toBe('\nC\nAB');
	});
});
