import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import boxen from 'boxen';
import indentString from 'indent-string';
import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/borders.tsx. The boxen/indent-string/cli-boxes/
// chalk libraries serve as oracles — if the underlying ANSI semantics shift,
// the test fails alongside whatever vue-ink/ink would have produced.

describe('borders', () => {
	it('single node - full width box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round' }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(boxen('Hello World', { width: 100, borderStyle: 'round' }));
	});

	it('single node - full width box with colorful border', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', borderColor: 'green' }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(
			boxen('Hello World', {
				width: 100,
				borderStyle: 'round',
				borderColor: 'green',
			}),
		);
	});

	it('single node - fit-content box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(boxen('Hello World', { borderStyle: 'round' }));
	});

	it('single node - fit-content box with wide characters', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () =>
				h(Text, null, () => 'こんにちは'),
			),
		);

		expect(output).toBe(boxen('こんにちは', { borderStyle: 'round' }));
	});

	it('single node - fit-content box with emojis', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () =>
				h(Text, null, () => '🌊🌊'),
			),
		);

		expect(output).toBe(boxen('🌊🌊', { borderStyle: 'round' }));
	});

	it('single node - fit-content box with variation selector emojis', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () =>
				h(Text, null, () => '🌡️⚠️✅'),
			),
		);

		expect(output).toBe(boxen('🌡️⚠️✅', { borderStyle: 'round' }));
	});

	it('single node - fixed width box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 20 }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(
			boxen('Hello World'.padEnd(18, ' '), { borderStyle: 'round' }),
		);
	});

	it('single node - fixed width and height box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 20, height: 20 }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(
			boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
				borderStyle: 'round',
			}),
		);
	});

	it('single node - box with padding', () => {
		const output = frame(() =>
			h(
				Box,
				{ borderStyle: 'round', padding: 1, alignSelf: 'flex-start' },
				() => h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(boxen('\n Hello World \n', { borderStyle: 'round' }));
	});

	it('single node - box with horizontal alignment', () => {
		const output = frame(() =>
			h(
				Box,
				{ borderStyle: 'round', width: 20, justifyContent: 'center' },
				() => h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(boxen('   Hello World    ', { borderStyle: 'round' }));
	});

	it('single node - box with vertical alignment', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'round',
					height: 20,
					alignItems: 'center',
					alignSelf: 'flex-start',
				},
				() => h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(
			boxen(`${'\n'.repeat(8)  }Hello World${  '\n'.repeat(9)}`, {
				borderStyle: 'round',
			}),
		);
	});

	it('single node - box with wrapping', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 10 }, () =>
				h(Text, null, () => 'Hello World'),
			),
		);

		expect(output).toBe(boxen('Hello   \nWorld', { borderStyle: 'round' }));
	});

	it('multiple nodes - full width box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round' }, () =>
				h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(boxen('Hello World', { width: 100, borderStyle: 'round' }));
	});

	it('multiple nodes - full width box with colorful border', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', borderColor: 'green' }, () =>
				h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(
			boxen('Hello World', {
				width: 100,
				borderStyle: 'round',
				borderColor: 'green',
			}),
		);
	});

	it('multiple nodes - fit-content box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () =>
				h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(boxen('Hello World', { borderStyle: 'round' }));
	});

	it('multiple nodes - fixed width box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 20 }, () =>
				h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(
			boxen('Hello World'.padEnd(18, ' '), { borderStyle: 'round' }),
		);
	});

	it('multiple nodes - fixed width and height box', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 20, height: 20 }, () =>
				h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(
			boxen('Hello World'.padEnd(18, ' ') + '\n'.repeat(17), {
				borderStyle: 'round',
			}),
		);
	});

	it('multiple nodes - box with padding', () => {
		const output = frame(() =>
			h(
				Box,
				{ borderStyle: 'round', padding: 1, alignSelf: 'flex-start' },
				() => h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(boxen('\n Hello World \n', { borderStyle: 'round' }));
	});

	it('multiple nodes - box with horizontal alignment', () => {
		const output = frame(() =>
			h(
				Box,
				{ borderStyle: 'round', width: 20, justifyContent: 'center' },
				() => h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(boxen('   Hello World    ', { borderStyle: 'round' }));
	});

	it('multiple nodes - box with vertical alignment', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'round',
					height: 20,
					alignItems: 'center',
					alignSelf: 'flex-start',
				},
				() => h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(
			boxen(`${'\n'.repeat(8)  }Hello World${  '\n'.repeat(9)}`, {
				borderStyle: 'round',
			}),
		);
	});

	it('multiple nodes - box with wrapping', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 10 }, () =>
				h(Text, null, () => ['Hello ', 'World']),
			),
		);

		expect(output).toBe(boxen('Hello   \nWorld', { borderStyle: 'round' }));
	});

	it('multiple nodes - box with wrapping and long first node', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 10 }, () =>
				h(Text, null, () => ['Helloooooo', ' World']),
			),
		);

		expect(output).toBe(boxen('Helloooo\noo World', { borderStyle: 'round' }));
	});

	it('multiple nodes - box with wrapping and very long first node', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 10 }, () =>
				h(Text, null, () => ['Hellooooooooooooo', ' World']),
			),
		);

		expect(output).toBe(
			boxen('Helloooo\noooooooo\no World', { borderStyle: 'round' }),
		);
	});

	it('nested boxes', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', width: 40, padding: 1 }, () =>
				h(
					Box,
					{ borderStyle: 'round', justifyContent: 'center', padding: 1 },
					() => h(Text, null, () => 'Hello World'),
				),
			),
		);

		const nestedBox = indentString(
			boxen('\n Hello World \n', { borderStyle: 'round' }),
			1,
		);

		expect(output).toBe(
			boxen(`${' '.repeat(38)}\n${nestedBox}\n`, { borderStyle: 'round' }),
		);
	});

	it('nested boxes - fit-content box with wide characters on flex-direction row', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () => [
				h(Box, { borderStyle: 'round' }, () =>
					h(Text, null, () => 'ミスター'),
				),
				h(Box, { borderStyle: 'round' }, () =>
					h(Text, null, () => 'スポック'),
				),
				h(Box, { borderStyle: 'round' }, () =>
					h(Text, null, () => 'カーク船長'),
				),
			]),
		);

		const box1 = boxen('ミスター', { borderStyle: 'round' });
		const box2 = boxen('スポック', { borderStyle: 'round' });
		const box3 = boxen('カーク船長', { borderStyle: 'round' });

		const expected = boxen(
			box1
				.split('\n')
				.map(
					(line, index) =>
						line + box2.split('\n')[index]! + box3.split('\n')[index]!,
				)
				.join('\n'),
			{ borderStyle: 'round' },
		);

		expect(output).toBe(expected);
	});

	it('nested boxes - fit-content box with emojis on flex-direction row', () => {
		const output = frame(() =>
			h(Box, { borderStyle: 'round', alignSelf: 'flex-start' }, () => [
				h(Box, { borderStyle: 'round' }, () => h(Text, null, () => '🦾')),
				h(Box, { borderStyle: 'round' }, () => h(Text, null, () => '🌏')),
				h(Box, { borderStyle: 'round' }, () => h(Text, null, () => '😋')),
			]),
		);

		const box1 = boxen('🦾', { borderStyle: 'round' });
		const box2 = boxen('🌏', { borderStyle: 'round' });
		const box3 = boxen('😋', { borderStyle: 'round' });

		const expected = boxen(
			box1
				.split('\n')
				.map(
					(line, index) =>
						line + box2.split('\n')[index]! + box3.split('\n')[index]!,
				)
				.join('\n'),
			{ borderStyle: 'round' },
		);

		expect(output).toBe(expected);
	});

	it('nested boxes - fit-content box with wide characters on flex-direction column', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'round',
					alignSelf: 'flex-start',
					flexDirection: 'column',
				},
				() => [
					h(Box, { borderStyle: 'round' }, () =>
						h(Text, null, () => 'ミスター'),
					),
					h(Box, { borderStyle: 'round' }, () =>
						h(Text, null, () => 'スポック'),
					),
					h(Box, { borderStyle: 'round' }, () =>
						h(Text, null, () => 'カーク船長'),
					),
				],
			),
		);

		const expected = boxen(
			`${boxen('ミスター  ', { borderStyle: 'round' }) 
				}\n${ 
				boxen('スポック  ', { borderStyle: 'round' }) 
				}\n${ 
				boxen('カーク船長', { borderStyle: 'round' })}`,
			{ borderStyle: 'round' },
		);

		expect(output).toBe(expected);
	});

	it('nested boxes - fit-content box with emojis on flex-direction column', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: 'round',
					alignSelf: 'flex-start',
					flexDirection: 'column',
				},
				() => [
					h(Box, { borderStyle: 'round' }, () =>
						h(Text, null, () => '🦾'),
					),
					h(Box, { borderStyle: 'round' }, () =>
						h(Text, null, () => '🌏'),
					),
					h(Box, { borderStyle: 'round' }, () =>
						h(Text, null, () => '😋'),
					),
				],
			),
		);

		const expected = boxen(
			`${boxen('🦾', { borderStyle: 'round' }) 
				}\n${ 
				boxen('🌏', { borderStyle: 'round' }) 
				}\n${ 
				boxen('😋', { borderStyle: 'round' })}`,
			{ borderStyle: 'round' },
		);

		expect(output).toBe(expected);
	});

	it('render border after update', async () => {
		const borderColor = ref<string | undefined>(undefined);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { borderStyle: 'round', borderColor: borderColor.value }, () =>
					h(Text, null, () => 'Hello World'),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);

		expect(lastFrame()).toBe(
			boxen('Hello World', { width: 100, borderStyle: 'round' }),
		);

		borderColor.value = 'green';
		await waitUntilFlush();

		expect(lastFrame()).toBe(
			boxen('Hello World', {
				width: 100,
				borderStyle: 'round',
				borderColor: 'green',
			}),
		);

		borderColor.value = undefined;
		await waitUntilFlush();

		expect(lastFrame()).toBe(
			boxen('Hello World', { width: 100, borderStyle: 'round' }),
		);

		unmount();
	});

	it('render border edge changes after update when borderStyle is unchanged', async () => {
		const borderTop = ref<boolean | undefined>(undefined);
		const Test = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						borderStyle: 'round',
						borderTop: borderTop.value,
						alignSelf: 'flex-start',
					},
					() => h(Text, null, () => 'Content'),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);

		expect(lastFrame()).toBe(boxen('Content', { borderStyle: 'round' }));

		borderTop.value = false;
		await waitUntilFlush();

		expect(lastFrame()).toBe(
			[
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
			].join('\n'),
		);

		borderTop.value = undefined;
		await waitUntilFlush();

		expect(lastFrame()).toBe(boxen('Content', { borderStyle: 'round' }));

		unmount();
	});

	it('hide top border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderTop: false }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	it('hide bottom border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderBottom: false }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				'Below',
			].join('\n'),
		);
	});

	it('hide top and bottom borders', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(
					Box,
					{
						borderStyle: 'round',
						borderTop: false,
						borderBottom: false,
					},
					() => h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				'Below',
			].join('\n'),
		);
	});

	it('hide left border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderLeft: false }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.top.repeat(7)}${cliBoxes.round.topRight}`,
				`Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottom.repeat(7)}${cliBoxes.round.bottomRight}`,
				'Below',
			].join('\n'),
		);
	});

	it('hide right border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderRight: false }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}`,
				`${cliBoxes.round.left}Content`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}`,
				'Below',
			].join('\n'),
		);
	});

	it('hide left and right border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(
					Box,
					{
						borderStyle: 'round',
						borderLeft: false,
						borderRight: false,
					},
					() => h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				cliBoxes.round.top.repeat(7),
				'Content',
				cliBoxes.round.bottom.repeat(7),
				'Below',
			].join('\n'),
		);
	});

	it('hide all borders', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(
					Box,
					{
						borderStyle: 'round',
						borderTop: false,
						borderBottom: false,
						borderLeft: false,
						borderRight: false,
					},
					() => h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(['Above', 'Content', 'Below'].join('\n'));
	});

	it('change color of top border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderTopColor: 'green' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				chalk.green(
					`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
						cliBoxes.round.topRight
					}`,
				),
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	it('change color of bottom border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderBottomColor: 'green' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				chalk.green(
					`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
						cliBoxes.round.bottomRight
					}`,
				),
				'Below',
			].join('\n'),
		);
	});

	it('change color of left border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderLeftColor: 'green' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${chalk.green(cliBoxes.round.left)}Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	it('change color of right border', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderStyle: 'round', borderRightColor: 'green' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${cliBoxes.round.left}Content${chalk.green(cliBoxes.round.right)}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	it('custom border style', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderStyle: {
						topLeft: '↘',
						top: '↓',
						topRight: '↙',
						left: '→',
						bottomLeft: '↗',
						bottom: '↑',
						bottomRight: '↖',
						right: '←',
					},
				},
				() => h(Text, null, () => 'Content'),
			),
		);

		expect(output).toBe(boxen('Content', { width: 100, borderStyle: 'arrow' }));
	});

	it('dim border color', () => {
		const output = frame(() =>
			h(Box, { borderDimColor: true, borderStyle: 'round' }, () =>
				h(Text, null, () => 'Content'),
			),
		);

		expect(output).toBe(
			boxen('Content', {
				width: 100,
				borderStyle: 'round',
				dimBorder: true,
			}),
		);
	});

	it('dim top border color', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderTopDimColor: true, borderStyle: 'round' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				chalk.dim(
					`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
						cliBoxes.round.topRight
					}`,
				),
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	it('dim bottom border color', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderBottomDimColor: true, borderStyle: 'round' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${cliBoxes.round.left}Content${cliBoxes.round.right}`,
				chalk.dim(
					`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
						cliBoxes.round.bottomRight
					}`,
				),
				'Below',
			].join('\n'),
		);
	});

	it('dim left border color', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderLeftDimColor: true, borderStyle: 'round' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${chalk.dim(cliBoxes.round.left)}Content${cliBoxes.round.right}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	it('dim right border color', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column', alignItems: 'flex-start' }, () => [
				h(Text, null, () => 'Above'),
				h(Box, { borderRightDimColor: true, borderStyle: 'round' }, () =>
					h(Text, null, () => 'Content'),
				),
				h(Text, null, () => 'Below'),
			]),
		);

		expect(output).toBe(
			[
				'Above',
				`${cliBoxes.round.topLeft}${cliBoxes.round.top.repeat(7)}${
					cliBoxes.round.topRight
				}`,
				`${cliBoxes.round.left}Content${chalk.dim(cliBoxes.round.right)}`,
				`${cliBoxes.round.bottomLeft}${cliBoxes.round.bottom.repeat(7)}${
					cliBoxes.round.bottomRight
				}`,
				'Below',
			].join('\n'),
		);
	});

	// Regression for ink #840 — dimBorder should not bleed into styled children.
	it('borderDimColor does not dim styled child Text touching left edge', () => {
		const output = frame(() =>
			h(
				Box,
				{
					borderDimColor: true,
					borderStyle: 'round',
					alignSelf: 'flex-start',
				},
				() =>
					h(Text, { bold: true, color: 'blue' }, () => 'styled text'),
			),
		);

		const styledText = chalk.bold(chalk.blue('styled text'));
		expect(output.includes(styledText)).toBe(true);

		const dimmedTopBorder = chalk.dim(
			cliBoxes.round.topLeft +
				cliBoxes.round.top.repeat(11) +
				cliBoxes.round.topRight,
		);
		expect(output.includes(dimmedTopBorder)).toBe(true);
	});
});
