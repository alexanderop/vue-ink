import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { Box, Text } from '../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex.tsx.

describe('flex', () => {
	it('grow equally', () => {
		const output = frame(() =>
			h(Box, { width: 6 }, () => [
				h(Box, { flexGrow: 1 }, () => h(Text, null, () => 'A')),
				h(Box, { flexGrow: 1 }, () => h(Text, null, () => 'B')),
			]),
		);
		expect(output).toBe('A  B');
	});

	it('grow one element', () => {
		const output = frame(() =>
			h(Box, { width: 6 }, () => [
				h(Box, { flexGrow: 1 }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A    B');
	});

	it('do not shrink', () => {
		const output = frame(() =>
			h(Box, { width: 16 }, () => [
				h(Box, { flexShrink: 0, width: 6 }, () => h(Text, null, () => 'A')),
				h(Box, { flexShrink: 0, width: 6 }, () => h(Text, null, () => 'B')),
				h(Box, { width: 6 }, () => h(Text, null, () => 'C')),
			]),
		);
		expect(output).toBe('A     B     C');
	});

	it('shrink equally', () => {
		const output = frame(() =>
			h(Box, { width: 10 }, () => [
				h(Box, { flexShrink: 1, width: 6 }, () => h(Text, null, () => 'A')),
				h(Box, { flexShrink: 1, width: 6 }, () => h(Text, null, () => 'B')),
				h(Text, null, () => 'C'),
			]),
		);
		expect(output).toBe('A    B   C');
	});

	it('set flex basis with flexDirection="row" container', () => {
		const output = frame(() =>
			h(Box, { width: 6 }, () => [
				h(Box, { flexBasis: 3 }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A  B');
	});

	it('set flex basis in percent with flexDirection="row" container', () => {
		const output = frame(() =>
			h(Box, { width: 6 }, () => [
				h(Box, { flexBasis: '50%' }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A  B');
	});

	it('set flex basis with flexDirection="column" container', () => {
		const output = frame(() =>
			h(Box, { height: 6, flexDirection: 'column' }, () => [
				h(Box, { flexBasis: 3 }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\n\n\nB\n\n');
	});

	it('set flex basis in percent with flexDirection="column" container', () => {
		const output = frame(() =>
			h(Box, { height: 6, flexDirection: 'column' }, () => [
				h(Box, { flexBasis: '50%' }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\n\n\nB\n\n');
	});
});
