import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { h } from 'vue';
import chalk from 'chalk';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/border-backgrounds.tsx.

let originalLevel: typeof chalk.level;
beforeAll(() => {
	originalLevel = chalk.level;
	chalk.level = 3;
});
afterAll(() => {
	chalk.level = originalLevel;
});

const ESC = '';

const escapeRegex = (s: string): string =>
	s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('border-backgrounds', () => {
	it('border with background color', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'single',
					borderColor: 'white',
					borderBackgroundColor: 'blue',
				},
				() =>
					h(Box, { width: 4 }, () => h(Text, null, () => 'Test')),
			),
		);
		expect(output).toContain('┌');
		expect(output).toContain('┐');
		expect(output).toContain('└');
		expect(output).toContain('┘');
		expect(output).toContain('Test');
		expect(output).toContain(`${ESC}[44m`);
	});

	it('border with different background colors per side', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'single',
					borderTopBackgroundColor: 'red',
					borderBottomBackgroundColor: 'blue',
					borderLeftBackgroundColor: 'green',
					borderRightBackgroundColor: 'yellow',
				},
				() => h(Box, { width: 4 }, () => h(Text, null, () => 'Test')),
			),
		);
		expect(output).toContain('┌');
		expect(output).toContain('┐');
		expect(output).toContain('└');
		expect(output).toContain('┘');
		expect(output).toContain('Test');
		expect(output).toContain(`${ESC}[41m`);
		expect(output).toContain(`${ESC}[42m`);
		expect(output).toContain(`${ESC}[43m`);
		expect(output).toContain(`${ESC}[44m`);
	});

	it('border background color fallback to general borderBackgroundColor', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'single',
					borderBackgroundColor: 'magenta',
					borderTopBackgroundColor: 'cyan',
				},
				() => h(Box, { width: 4 }, () => h(Text, null, () => 'Test')),
			),
		);
		expect(output).toContain('┌');
		expect(output).toContain('┐');
		expect(output).toContain('└');
		expect(output).toContain('┘');
		expect(output).toContain('Test');
		expect(output).toContain(`${ESC}[46m`);
		expect(output).toContain(`${ESC}[45m`);
	});

	it('vertical border background does not bleed into content rows', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'classic',
					borderBackgroundColor: 'cyan',
					alignSelf: 'flex-start',
					width: 12,
				},
				() =>
					h(Text, null, () =>
						'Text longer than the Box width, so will definitely wrap.',
					),
			),
		);
		const tableBorderPattern = `${escapeRegex(`${ESC}[46m`)}\\|${escapeRegex(`${ESC}[49m`)}`;
		const contentRowPattern = new RegExp(
			`^${tableBorderPattern}.*${tableBorderPattern}$`,
		);
		const tableRows = output.split('\n');
		const contentRows = tableRows.slice(1, -1);
		expect(contentRows.length).toBeGreaterThan(0);
		for (const contentRow of contentRows) {
			expect(contentRow).toMatch(contentRowPattern);
		}
	});

	it('foreground, background and dim combine correctly', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderTopDimColor: true,
					borderStyle: 'single',
					borderTopColor: 'red',
					borderTopBackgroundColor: 'cyan',
					alignSelf: 'flex-start',
				},
				() => h(Text, null, () => 'Hi'),
			),
		);
		expect(output).toContain(`${ESC}[31m`);
		expect(output).toContain(`${ESC}[46m`);
		expect(output).toContain(`${ESC}[2m`);
	});
});
