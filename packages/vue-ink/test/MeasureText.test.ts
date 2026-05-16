import { describe, it, expect } from 'vitest';
import measureText from '../../core/src/measure-text.ts';

// Ported from repos/ink/test/measure-text.tsx. Pure-function tests of the
// width/height oracle that Yoga's measure-fn delegates to.

const ESC = String.fromCharCode(0x1b);

describe('measureText', () => {
	it('measures a single word', () => {
		expect(measureText('constructor')).toEqual({ width: 11, height: 1 });
	});

	it('treats an empty string as zero dimensions', () => {
		expect(measureText('')).toEqual({ width: 0, height: 0 });
	});

	it('measures multiline text', () => {
		const result = measureText('hello\nworld');
		expect(result.width).toBe(5);
		expect(result.height).toBe(2);
	});

	it('measures multiline text with varying line lengths', () => {
		const result = measureText('a\nfoo\nhi');
		expect(result.width).toBe(3);
		expect(result.height).toBe(3);
	});

	it('measures text with a trailing newline', () => {
		const result = measureText('hello\n');
		expect(result.width).toBe(5);
		expect(result.height).toBe(2);
	});

	it('measures text containing only newlines', () => {
		const result = measureText('\n\n');
		expect(result.width).toBe(0);
		expect(result.height).toBe(3);
	});

	it('returns the cached result on repeated calls', () => {
		const first = measureText('cached-test');
		expect(first.width).toBe(11);
		expect(first.height).toBe(1);
		const second = measureText('cached-test');
		// Identity check: the cache returns the same object literal, not a copy.
		expect(first).toBe(second);
	});

	it('strips ANSI escape sequences from the width', () => {
		const result = measureText(`${ESC}[31mred${ESC}[0m`);
		expect(result.width).toBe(3);
		expect(result.height).toBe(1);
	});

	it('strips 256-color ANSI escapes from the width', () => {
		const result = measureText(`${ESC}[38;5;196mred${ESC}[0m`);
		expect(result.width).toBe(3);
		expect(result.height).toBe(1);
	});

	it('counts CJK characters as width 2', () => {
		const result = measureText('你好');
		expect(result.width).toBe(4);
		expect(result.height).toBe(1);
	});

	it('counts emoji as width 2', () => {
		const result = measureText('🍔');
		expect(result.width).toBe(2);
		expect(result.height).toBe(1);
	});

	it('measures multiline text with wide characters', () => {
		const result = measureText('🍔🍟\nabc');
		expect(result.width).toBe(4);
		expect(result.height).toBe(2);
	});
});
