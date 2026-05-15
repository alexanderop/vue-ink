import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex-direction.tsx.

describe('flex-direction', () => {
	it('direction row', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'row' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('AB');
	});

	it('direction row reverse', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'row-reverse', width: 4 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('  BA');
	});

	it('direction column', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\nB');
	});

	it('direction column reverse', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column-reverse', height: 4 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('\n\nB\nA');
	});

	it('do not squash text nodes when column direction is applied', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\nB');
	});
});
