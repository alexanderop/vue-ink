import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/display.tsx.

describe('display', () => {
	it('display flex renders children', () => {
		const output = frame(() =>
			h(Box, { display: 'flex' }, () => h(Text, null, () => 'X')),
		);
		expect(output).toBe('X');
	});

	it('display none hides subtree', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(Box, { display: 'none' }, () => h(Text, null, () => 'Kitty!')),
				h(Text, null, () => 'Doggo'),
			]),
		);
		expect(output).toBe('Doggo');
	});
});
