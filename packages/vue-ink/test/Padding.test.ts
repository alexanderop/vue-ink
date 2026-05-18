import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/padding.tsx.

describe('padding', () => {
	it('padding', () => {
		const output = frame(() =>
			h(Box, { padding: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('\n\n  X\n\n');
	});

	it('padding X', () => {
		const output = frame(() =>
			h(Box, null, () => [
				h(Box, { paddingX: 2 }, () => h(Text, null, () => 'X')),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('  X  Y');
	});

	it('padding Y', () => {
		const output = frame(() =>
			h(Box, { paddingY: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('\n\nX\n\n');
	});

	it('padding top', () => {
		const output = frame(() =>
			h(Box, { paddingTop: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('\n\nX');
	});

	it('padding bottom', () => {
		const output = frame(() =>
			h(Box, { paddingBottom: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('X\n\n');
	});

	it('padding left', () => {
		const output = frame(() =>
			h(Box, { paddingLeft: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('  X');
	});

	it('padding right', () => {
		const output = frame(() =>
			h(Box, null, () => [
				h(Box, { paddingRight: 2 }, () => h(Text, null, () => 'X')),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('X  Y');
	});

	it('nested padding', () => {
		const output = frame(() =>
			h(Box, { padding: 2 }, () =>
				h(Box, { padding: 2 }, () => h(Text, null, () => 'X')),
			),
		);
		expect(output).toBe('\n\n\n\n    X\n\n\n\n');
	});

	it('padding with multiline string', () => {
		const output = frame(() =>
			h(Box, { padding: 2 }, () => h(Text, null, () => 'A\nB')),
		);
		expect(output).toBe('\n\n  A\n  B\n\n');
	});

	it('apply padding to text with newlines', () => {
		const output = frame(() =>
			h(Box, { padding: 1 }, () => h(Text, null, () => 'Hello\nWorld')),
		);
		expect(output).toBe('\n Hello\n World\n');
	});

	it('apply padding to wrapped text', () => {
		const output = frame(() =>
			h(Box, { padding: 1, width: 5 }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);
		expect(output).toBe('\n Hel\n lo\n Wor\n ld\n');
	});

	// https://github.com/vadimdemedes/ink/issues/584
	it('text wrapping respects paddingX with flexGrow', () => {
		const output = frame(() =>
			h(Box, { width: 40, borderStyle: 'round' }, () =>
				h(Box, { paddingX: 2 }, () =>
					h(Box, { marginLeft: 2 }, () => [
						h(Text, null, () => '•'),
						h(Box, { flexGrow: 1, marginLeft: 1 }, () =>
							h(Text, null, () =>
								'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
							),
						),
					]),
				),
			),
		);
		for (const line of output.split('\n')) {
			expect(
				line.length,
				`Line "${line}" exceeds container width of 40 (got ${line.length})`,
			).toBeLessThanOrEqual(40);
		}
	});
});
