import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/gap.tsx. Concurrent-mode duplicates omitted
// (Vue's reactivity has a single rendering pipeline).

describe('gap', () => {
	it('gap wraps when row overflows width', () => {
		const output = frame(() =>
			h(Box, { gap: 1, width: 3, flexWrap: 'wrap' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
				h(Text, null, () => 'C'),
			]),
		);
		expect(output).toBe('A B\n\nC');
	});

	it('column gap', () => {
		const output = frame(() =>
			h(Box, { gap: 1 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A B');
	});

	it('row gap', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', gap: 1 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\n\nB');
	});
});
