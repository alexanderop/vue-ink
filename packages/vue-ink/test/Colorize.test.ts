import { describe, it, expect } from 'vitest';
import { colorize } from '@vue-ink/core';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

describe('colorize', () => {
	it('returns the string unchanged when color is undefined', () => {
		expect(colorize('hi', undefined, 'foreground')).toBe('hi');
	});

	it('applies a named foreground color via chalk', () => {
		const out = colorize('hi', 'green', 'foreground');
		expect(out).toBe(chalk.green('hi'));
	});

	it('applies a named background color via chalk', () => {
		const out = colorize('hi', 'red', 'background');
		expect(out).toBe(chalk.bgRed('hi'));
	});

	it('applies a hex foreground color', () => {
		const out = colorize('hi', '#ff8800', 'foreground');
		expect(stripAnsi(out)).toBe('hi');
		expect(out).toBe(chalk.hex('#ff8800')('hi'));
	});

	it('applies a hex background color', () => {
		const out = colorize('hi', '#ff8800', 'background');
		expect(out).toBe(chalk.bgHex('#ff8800')('hi'));
	});

	it('applies an ansi256 foreground color', () => {
		const out = colorize('hi', 'ansi256(196)', 'foreground');
		expect(out).toBe(chalk.ansi256(196)('hi'));
	});

	it('applies an ansi256 foreground color with optional inner whitespace', () => {
		const out = colorize('hi', 'ansi256(196 )', 'foreground');
		expect(out).toBe(chalk.ansi256(196)('hi'));
	});

	it('applies an ansi256 background color', () => {
		const out = colorize('hi', 'ansi256(21)', 'background');
		expect(out).toBe(chalk.bgAnsi256(21)('hi'));
	});

	it('returns the string unchanged for a malformed ansi256 spec', () => {
		expect(colorize('hi', 'ansi256(notanumber)', 'foreground')).toBe('hi');
		expect(colorize('hi', 'xansi256(196)', 'foreground')).toBe('hi');
		expect(colorize('hi', 'ansi256(196)x', 'foreground')).toBe('hi');
	});

	it('applies an rgb() foreground color', () => {
		const out = colorize('hi', 'rgb(255, 128, 0)', 'foreground');
		expect(out).toBe(chalk.rgb(255, 128, 0)('hi'));
	});

	it('applies an rgb() foreground color without spaces', () => {
		const out = colorize('hi', 'rgb(255,128,0)', 'foreground');
		expect(out).toBe(chalk.rgb(255, 128, 0)('hi'));
	});

	it('applies an rgb() foreground color with optional trailing inner whitespace', () => {
		const out = colorize('hi', 'rgb(255,128,0 )', 'foreground');
		expect(out).toBe(chalk.rgb(255, 128, 0)('hi'));
	});

	it('applies an rgb() background color', () => {
		const out = colorize('hi', 'rgb(10, 20, 30)', 'background');
		expect(out).toBe(chalk.bgRgb(10, 20, 30)('hi'));
	});

	it('returns the string unchanged for a malformed rgb() spec', () => {
		expect(colorize('hi', 'rgb(no, way, jose)', 'foreground')).toBe('hi');
		expect(colorize('hi', 'xrgb(255,128,0)', 'foreground')).toBe('hi');
		expect(colorize('hi', 'rgb(255,128,0)x', 'foreground')).toBe('hi');
	});

	it('returns the string unchanged for an unrecognised color string', () => {
		expect(colorize('hi', 'not-a-color', 'foreground')).toBe('hi');
	});
});
