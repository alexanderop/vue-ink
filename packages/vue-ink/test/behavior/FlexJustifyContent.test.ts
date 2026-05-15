import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import chalk from 'chalk';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex-justify-content.tsx.

describe('flex-justify-content', () => {
	it('row - align text to center', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'center', width: 10 }, () =>
				h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('   Test');
	});

	it('row - align multiple text nodes to center', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'center', width: 10 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('    AB');
	});

	it('row - align text to right', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'flex-end', width: 10 }, () =>
				h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('      Test');
	});

	it('row - align multiple text nodes to right', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'flex-end', width: 10 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('        AB');
	});

	it('row - align two text nodes on the edges', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'space-between', width: 4 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A  B');
	});

	it('row - space evenly two text nodes', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'space-evenly', width: 10 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('  A   B');
	});

	it('row - align colored text node when text is squashed', () => {
		const output = frame(() =>
			h(Box, { justifyContent: 'flex-end', width: 5 }, () =>
				h(Text, { color: 'green' }, () => 'X'),
			),
		);
		expect(output).toBe(`    ${chalk.green('X')}`);
	});

	it('column - align text to center', () => {
		const output = frame(() =>
			h(
				Box,
				{ flexDirection: 'column', justifyContent: 'center', height: 3 },
				() => h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('\nTest\n');
	});

	it('column - align text to bottom', () => {
		const output = frame(() =>
			h(
				Box,
				{ flexDirection: 'column', justifyContent: 'flex-end', height: 3 },
				() => h(Text, null, () => 'Test'),
			),
		);
		expect(output).toBe('\n\nTest');
	});

	it('column - align two text nodes on the edges', () => {
		const output = frame(() =>
			h(
				Box,
				{
					flexDirection: 'column',
					justifyContent: 'space-between',
					height: 4,
				},
				() => [h(Text, null, () => 'A'), h(Text, null, () => 'B')],
			),
		);
		expect(output).toBe('A\n\n\nB');
	});
});
