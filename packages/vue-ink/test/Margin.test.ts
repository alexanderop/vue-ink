import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/margin.tsx.

describe('margin', () => {
	it('margin', () => {
		const output = frame(() =>
			h(Box, { margin: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('\n\n  X\n\n');
	});

	it('margin X', () => {
		const output = frame(() =>
			h(Box, null, () => [
				h(Box, { marginX: 2 }, () => h(Text, null, () => 'X')),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('  X  Y');
	});

	it('margin Y', () => {
		const output = frame(() =>
			h(Box, { marginY: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('\n\nX\n\n');
	});

	it('margin top', () => {
		const output = frame(() =>
			h(Box, { marginTop: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('\n\nX');
	});

	it('margin bottom', () => {
		const output = frame(() =>
			h(Box, { marginBottom: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('X\n\n');
	});

	it('margin left', () => {
		const output = frame(() =>
			h(Box, { marginLeft: 2 }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('  X');
	});

	it('margin right', () => {
		const output = frame(() =>
			h(Box, null, () => [
				h(Box, { marginRight: 2 }, () => h(Text, null, () => 'X')),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('X  Y');
	});

	it('nested margin', () => {
		const output = frame(() =>
			h(Box, { margin: 2 }, () =>
				h(Box, { margin: 2 }, () => h(Text, null, () => 'X')),
			),
		);
		expect(output).toBe('\n\n\n\n    X\n\n\n\n');
	});

	it('margin with multiline string', () => {
		const output = frame(() =>
			h(Box, { margin: 2 }, () => h(Text, null, () => 'A\nB')),
		);
		expect(output).toBe('\n\n  A\n  B\n\n');
	});

	it('apply margin to text with newlines', () => {
		const output = frame(() =>
			h(Box, { margin: 1 }, () => h(Text, null, () => 'Hello\nWorld')),
		);
		expect(output).toBe('\n Hello\n World\n');
	});

	it('apply margin to wrapped text', () => {
		const output = frame(() =>
			h(Box, { margin: 1, width: 6 }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);
		expect(output).toBe('\n Hello\n World\n');
	});
});
