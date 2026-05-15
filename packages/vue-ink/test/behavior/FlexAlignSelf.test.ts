import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text, Newline } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex-align-self.tsx.

describe('flex-align-self', () => {
	it('row - align text to center', () => {
		const output = frame(() =>
			h(Box, { height: 3 }, () =>
				h(Box, { alignSelf: 'center' }, () =>
					h(Text, null, () => 'Test'),
				),
			),
		);
		expect(output).toBe('\nTest\n');
	});

	it('row - align multiple text nodes to center', () => {
		const output = frame(() =>
			h(Box, { height: 3 }, () =>
				h(Box, { alignSelf: 'center' }, () => [
					h(Text, null, () => 'A'),
					h(Text, null, () => 'B'),
				]),
			),
		);
		expect(output).toBe('\nAB\n');
	});

	it('row - align text to bottom', () => {
		const output = frame(() =>
			h(Box, { height: 3 }, () =>
				h(Box, { alignSelf: 'flex-end' }, () =>
					h(Text, null, () => 'Test'),
				),
			),
		);
		expect(output).toBe('\n\nTest');
	});

	it('row - align multiple text nodes to bottom', () => {
		const output = frame(() =>
			h(Box, { height: 3 }, () =>
				h(Box, { alignSelf: 'flex-end' }, () => [
					h(Text, null, () => 'A'),
					h(Text, null, () => 'B'),
				]),
			),
		);
		expect(output).toBe('\n\nAB');
	});

	it('column - align text to center', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', width: 10 }, () =>
				h(Box, { alignSelf: 'center' }, () =>
					h(Text, null, () => 'Test'),
				),
			),
		);
		expect(output).toBe('   Test');
	});

	it('column - align text to right', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', width: 10 }, () =>
				h(Box, { alignSelf: 'flex-end' }, () =>
					h(Text, null, () => 'Test'),
				),
			),
		);
		expect(output).toBe('      Test');
	});

	it('column - align self stretch', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', width: 7 }, () =>
				h(Box, { alignSelf: 'stretch', borderStyle: 'single' }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('┌─────┐\n│X    │\n└─────┘');
	});

	it('row - align self stretch', () => {
		const output = frame(() =>
			h(Box, { height: 5 }, () =>
				h(Box, { alignSelf: 'stretch', borderStyle: 'single' }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('┌─┐\n│X│\n│ │\n│ │\n└─┘');
	});

	it('row - align self baseline', () => {
		const output = frame(() =>
			h(Box, { alignItems: 'flex-end', height: 3 }, () => [
				h(Text, null, () => ['A', h(Newline), 'B']),
				h(Box, { alignSelf: 'baseline' }, () =>
					h(Text, null, () => 'X'),
				),
			]),
		);
		expect(output).toBe('AX\nB\n');
	});
});
