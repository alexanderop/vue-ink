import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text, Newline } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex-align-items.tsx.

describe('flex-align-items', () => {
	it('row - align text to center', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'center', height: 3 }, () =>
				h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('\nTest\n');
	});

	it('row - align multiple text nodes to center', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'center', height: 3 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('\nAB\n');
	});

	it('row - align text to bottom', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'flex-end', height: 3 }, () =>
				h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('\n\nTest');
	});

	it('row - align multiple text nodes to bottom', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'flex-end', height: 3 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('\n\nAB');
	});

	it('column - align text to center', () => {
		const output = frame(() =>
			h(
				Box,
				{ flexDirection: 'column', alignItems: 'center', width: 10 },
				() => h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('   Test');
	});

	it('column - align text to right', () => {
		const output = frame(() =>
			h(
				Box,
				{ flexDirection: 'column', alignItems: 'flex-end', width: 10 },
				() => h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('      Test');
	});

	it('row - align items stretch', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'stretch', height: 5 }, () =>
				h(Box, { borderStyle: 'single' }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('┌─┐\n│X│\n│ │\n│ │\n└─┘');
	});

	it('row - default align items stretches children', () => {
		const output = frame(() =>
			h(Box, { height: 5 }, () =>
				h(Box, { borderStyle: 'single' }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('┌─┐\n│X│\n│ │\n│ │\n└─┘');
	});

	it('row - align text to baseline', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'baseline', height: 3 }, () => [
				h(Text, null, () => ['A', h(Newline), 'B']),
				h(Text, null, () => 'X'),
			]),
		);
		expect(output).toBe('A\nBX\n');
	});
});
