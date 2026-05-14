import { describe, it, expect } from 'vitest';
import { Output } from '@vue-ink/core';
import stripAnsi from 'strip-ansi';
import chalk from 'chalk';

describe('Output', () => {
	it('returns blank canvas of the requested size', () => {
		const out = new Output({ width: 4, height: 2 });
		const { output, height } = out.get();
		expect(output).toBe('\n');
		expect(height).toBe(2);
	});

	it('writes plain text at coordinates', () => {
		const out = new Output({ width: 10, height: 1 });
		out.write(2, 0, 'hi', { transformers: [] });
		expect(out.get().output).toBe('  hi');
	});

	it('does nothing when writing empty text', () => {
		const out = new Output({ width: 4, height: 1 });
		out.write(0, 0, '', { transformers: [] });
		expect(out.get().output).toBe('');
	});

	it('clips writes outside the horizontal clip region', () => {
		const out = new Output({ width: 10, height: 1 });
		out.clip({ x1: 2, x2: 6, y1: undefined, y2: undefined });
		out.write(0, 0, 'hello world', { transformers: [] });
		out.unclip();
		const visible = stripAnsi(out.get().output);
		expect(visible.trimEnd()).toBe('  llo');
	});

	it('clips writes outside the vertical clip region', () => {
		const out = new Output({ width: 5, height: 4 });
		out.clip({ x1: undefined, x2: undefined, y1: 1, y2: 3 });
		out.write(0, 0, 'a\nb\nc\nd', { transformers: [] });
		out.unclip();
		const lines = out.get().output.split('\n');
		expect(lines).toEqual(['', 'b', 'c', '']);
	});

	it('drops a write entirely outside the clip', () => {
		const out = new Output({ width: 10, height: 1 });
		out.clip({ x1: 8, x2: 9, y1: undefined, y2: undefined });
		out.write(0, 0, 'hi', { transformers: [] });
		out.unclip();
		expect(out.get().output).toBe('');
	});

	it('drops a write entirely outside the vertical clip', () => {
		const out = new Output({ width: 5, height: 3 });
		out.clip({ x1: undefined, x2: undefined, y1: 0, y2: 0 });
		out.write(0, 2, 'a\nb', { transformers: [] });
		out.unclip();
		expect(out.get().output).toBe('\n\n');
	});

	it('runs transformers on each line with the right index', () => {
		const out = new Output({ width: 10, height: 2 });
		out.write(0, 0, 'a\nb', {
			transformers: [(line: string, i: number) => `${i}:${line}`],
		});
		expect(out.get().output).toBe('0:a\n1:b');
	});

	it('preserves SGR escapes through the rendering pipeline', () => {
		const out = new Output({ width: 5, height: 1 });
		out.write(0, 0, chalk.red('hi'), { transformers: [] });
		const { output } = out.get();
		expect(stripAnsi(output)).toBe('hi');
		expect(output).toMatch(/\x1b\[31m/);
	});

	it('handles full-width characters (e.g. CJK)', () => {
		const out = new Output({ width: 4, height: 1 });
		out.write(0, 0, '漢字', { transformers: [] });
		const { output } = out.get();
		expect(output).toContain('漢');
		expect(output).toContain('字');
	});

	it('skips lines that fall outside the canvas height', () => {
		const out = new Output({ width: 5, height: 1 });
		out.write(0, 0, 'a\nb\nc', { transformers: [] });
		// only first line is rendered (others fall off the canvas)
		expect(out.get().output).toBe('a');
	});

	it('treats an empty rendered line as a row advance', () => {
		const out = new Output({ width: 5, height: 2 });
		out.write(0, 0, '\nhi', { transformers: [] });
		expect(out.get().output).toBe('\nhi');
	});
});
