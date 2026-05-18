import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/flex-align-content.tsx.

type AlignContent =
	| 'flex-start'
	| 'flex-end'
	| 'center'
	| 'space-between'
	| 'space-around'
	| 'space-evenly'
	| 'stretch';

const four = () => [
	h(Text, null, () => 'A'),
	h(Text, null, () => 'B'),
	h(Text, null, () => 'C'),
	h(Text, null, () => 'D'),
];

const renderWithAlignContent = (alignContent: AlignContent): string =>
	frame(() =>
		h(Box, { width: 2, height: 6, flexWrap: 'wrap', alignContent }, four),
	);

describe('flex-align-content', () => {
	for (const [alignContent, expected] of [
		['flex-start', 'AB\nCD\n\n\n\n'],
		['center', '\n\nAB\nCD\n\n'],
		['flex-end', '\n\n\n\nAB\nCD'],
		['space-between', 'AB\n\n\n\n\nCD'],
		['space-around', '\nAB\n\n\nCD\n'],
		['space-evenly', '\nAB\n\nCD\n\n'],
		['stretch', 'AB\n\n\nCD\n\n'],
	] as const) {
		it(`align content ${alignContent}`, () => {
			expect(renderWithAlignContent(alignContent)).toBe(expected);
		});
	}

	it('align content defaults to flex-start', () => {
		const output = frame(() =>
			h(Box, { width: 2, height: 6, flexWrap: 'wrap' }, four),
		);
		expect(output).toBe('AB\nCD\n\n\n\n');
	});

	it('align content does not add extra spacing when there is no free cross-axis space', () => {
		const output = frame(() =>
			h(
				Box,
				{ width: 2, height: 2, flexWrap: 'wrap', alignContent: 'center' },
				four,
			),
		);
		expect(output).toBe('AB\nCD');
	});

	it('clears alignContent on rerender to default flex-start', async () => {
		const alignContent = ref<AlignContent | undefined>('center');
		const Test = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 2,
						height: 6,
						flexWrap: 'wrap',
						alignContent: alignContent.value,
					},
					four,
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('\n\nAB\nCD\n\n');

		alignContent.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('AB\nCD\n\n\n\n');

		unmount();
	});

	it('clears alignContent from stretch on rerender to default flex-start', async () => {
		const alignContent = ref<AlignContent | undefined>('stretch');
		const Test = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 2,
						height: 6,
						flexWrap: 'wrap',
						alignContent: alignContent.value,
					},
					four,
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('AB\n\n\nCD\n\n');

		alignContent.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('AB\nCD\n\n\n\n');

		unmount();
	});

	it('clears alignContent when prop is omitted on rerender', async () => {
		const showAlignContent = ref(true);
		const Test = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 2,
						height: 6,
						flexWrap: 'wrap',
						...(showAlignContent.value
							? { alignContent: 'center' as const }
							: {}),
					},
					four,
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('\n\nAB\nCD\n\n');

		showAlignContent.value = false;
		await waitUntilFlush();
		expect(lastFrame()).toBe('AB\nCD\n\n\n\n');

		unmount();
	});
});
