import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/text.tsx. Subset focused on user-visible
// behaviour; deep ANSI-stripping cases live in sanitize-ansi tests already.

describe('<Text>', () => {
	it('renders empty for undefined children', () => {
		expect(frame(() => h(Text))).toBe('');
	});

	it('renders empty for null/undefined slot return', () => {
		expect(frame(() => h(Text, null, () => undefined))).toBe('');
	});

	it('renders standard color', () => {
		const output = frame(() => h(Text, { color: 'green' }, () => 'Test'));
		expect(output).toBe(chalk.green('Test'));
	});

	it('renders dim+bold (preserves ANSI)', () => {
		const originalLevel = chalk.level;
		chalk.level = 3;
		try {
			const output = frame(() =>
				h(Text, { dimColor: true, bold: true }, () => 'Test'),
			);
			expect(stripAnsi(output)).toBe('Test');
			expect(output).not.toBe('Test');
		} finally {
			chalk.level = originalLevel;
		}
	});

	it('renders dimmed color', () => {
		const output = frame(() =>
			h(Text, { dimColor: true, color: 'green' }, () => 'Test'),
		);
		expect(output).toBe(chalk.green.dim('Test'));
	});

	it('renders hex color', () => {
		const output = frame(() => h(Text, { color: '#FF8800' }, () => 'Test'));
		expect(output).toBe(chalk.hex('#FF8800')('Test'));
	});

	it('renders rgb color', () => {
		const output = frame(() =>
			h(Text, { color: 'rgb(255, 136, 0)' }, () => 'Test'),
		);
		expect(output).toBe(chalk.rgb(255, 136, 0)('Test'));
	});

	it('renders ansi256 color', () => {
		const output = frame(() =>
			h(Text, { color: 'ansi256(194)' }, () => 'Test'),
		);
		expect(output).toBe(chalk.ansi256(194)('Test'));
	});

	it('renders standard background color', () => {
		const output = frame(() =>
			h(Text, { backgroundColor: 'green' }, () => 'Test'),
		);
		expect(output).toBe(chalk.bgGreen('Test'));
	});

	it('renders hex background color', () => {
		const output = frame(() =>
			h(Text, { backgroundColor: '#FF8800' }, () => 'Test'),
		);
		expect(output).toBe(chalk.bgHex('#FF8800')('Test'));
	});

	it('renders rgb background color', () => {
		const output = frame(() =>
			h(Text, { backgroundColor: 'rgb(255, 136, 0)' }, () => 'Test'),
		);
		expect(output).toBe(chalk.bgRgb(255, 136, 0)('Test'));
	});

	it('renders ansi256 background color', () => {
		const output = frame(() =>
			h(Text, { backgroundColor: 'ansi256(194)' }, () => 'Test'),
		);
		expect(output).toBe(chalk.bgAnsi256(194)('Test'));
	});

	it('renders inverse', () => {
		const output = frame(() => h(Text, { inverse: true }, () => 'Test'));
		expect(output).toBe(chalk.inverse('Test'));
	});

	// https://github.com/vadimdemedes/ink/issues/743 — "constructor" used to
	// be lost because of a prototype lookup leak.
	it('renders content "constructor" without dropping characters', () => {
		expect(frame(() => h(Text, null, () => 'constructor'))).toBe(
			'constructor',
		);
	});

	it('remeasures text after a reactive change', async () => {
		const add = ref(false);
		const App = defineComponent({
			setup: () => () =>
				h(Box, null, () => h(Text, null, () => (add.value ? 'abcx' : 'abc'))),
		});

		const { lastFrame, waitUntilFlush } = render(App);
		expect(lastFrame()).toBe('abc');

		add.value = true;
		await waitUntilFlush();
		expect(lastFrame()).toBe('abcx');
	});

	// https://github.com/vadimdemedes/ink/issues/867
	it('empty-to-nonempty interpolation does not wrap', async () => {
		const show = ref(false);
		const App = defineComponent({
			setup: () => () =>
				h(Box, null, () =>
					h(Text, null, () => `${show.value ? 'x' : ''}hello`),
				),
		});

		const { lastFrame, waitUntilFlush } = render(App);
		expect(lastFrame()).toBe('hello');

		show.value = true;
		await waitUntilFlush();
		expect(lastFrame()).toBe('xhello');
	});
});
