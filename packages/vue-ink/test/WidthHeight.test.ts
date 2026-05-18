import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/width-height.tsx.

describe('width-height', () => {
	it('set width', () => {
		const output = frame(() =>
			h(Box, null, () => [
				h(Box, { width: 5 }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A    B');
	});

	it('set width in percent', () => {
		const output = frame(() =>
			h(Box, { width: 10 }, () => [
				h(Box, { width: '50%' }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A    B');
	});

	it('set min width', () => {
		const smallerOutput = frame(() =>
			h(Box, null, () => [
				h(Box, { minWidth: 5 }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(smallerOutput).toBe('A    B');

		const largerOutput = frame(() =>
			h(Box, null, () => [
				h(Box, { minWidth: 2 }, () => h(Text, null, () => 'AAAAA')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(largerOutput).toBe('AAAAAB');
	});

	it('set height', () => {
		const output = frame(() =>
			h(Box, { height: 4 }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('AB\n\n\n');
	});

	it('set height in percent', () => {
		const output = frame(() =>
			h(Box, { height: 6, flexDirection: 'column' }, () => [
				h(Box, { height: '50%' }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\n\n\nB\n\n');
	});

	it('cut text over the set height', () => {
		const output = frame(
			() =>
				h(Box, { height: 2 }, () =>
					h(Text, null, () => 'AAAABBBBCCCC'),
				),
			{ columns: 4 },
		);
		expect(output).toBe('AAAA\nBBBB');
	});

	it('set min height', () => {
		const smallerOutput = frame(() =>
			h(Box, { minHeight: 4 }, () => h(Text, null, () => 'A')),
		);
		expect(smallerOutput).toBe('A\n\n\n');

		const largerOutput = frame(() =>
			h(Box, { minHeight: 2 }, () =>
				h(Box, { height: 4 }, () => h(Text, null, () => 'A')),
			),
		);
		expect(largerOutput).toBe('A\n\n\n');
	});

	it('set min height in percent', () => {
		const output = frame(() =>
			h(Box, { height: 6, flexDirection: 'column' }, () => [
				h(Box, { minHeight: '50%' }, () => h(Text, null, () => 'A')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\n\n\nB\n\n');
	});

	it('set max width', () => {
		const constrainedOutput = frame(
			() =>
				h(Box, null, () => [
					h(Box, { maxWidth: 3 }, () =>
						h(Text, null, () => 'AAAAA'),
					),
					h(Text, null, () => 'B'),
				]),
			{ columns: 10 },
		);
		expect(constrainedOutput).toBe('AAAB\nAA');

		const unconstrainedOutput = frame(() =>
			h(Box, null, () => [
				h(Box, { maxWidth: 10 }, () => h(Text, null, () => 'AAA')),
				h(Text, null, () => 'B'),
			]),
		);
		expect(unconstrainedOutput).toBe('AAAB');
	});

	it('clears maxWidth on rerender', async () => {
		const maxWidth = ref<number | undefined>(3);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, null, () => [
					h(Box, { maxWidth: maxWidth.value }, () =>
						h(Text, null, () => 'AAAAA'),
					),
					h(Text, null, () => 'B'),
				]),
		});

		const { lastFrame, waitUntilFlush, stdout, unmount } = render(Test);
		stdout.columns = 10;
		stdout.emit('resize');
		await waitUntilFlush();
		expect(lastFrame()).toBe('AAAB\nAA');

		maxWidth.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('AAAAAB');

		unmount();
	});

	it('set max height', () => {
		const constrainedOutput = frame(() =>
			h(Box, { maxHeight: 2 }, () =>
				h(Box, { height: 4 }, () => h(Text, null, () => 'A')),
			),
		);
		expect(constrainedOutput).toBe('A\n');

		const unconstrainedOutput = frame(() =>
			h(Box, { maxHeight: 4 }, () => h(Text, null, () => 'A')),
		);
		expect(unconstrainedOutput).toBe('A');
	});

	it('clears maxHeight on rerender', async () => {
		const maxHeight = ref<number | undefined>(2);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { maxHeight: maxHeight.value }, () =>
					h(Box, { height: 4 }, () => h(Text, null, () => 'A')),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('A\n');

		maxHeight.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('A\n\n\n');

		unmount();
	});

	it('set aspect ratio with width', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(
					Box,
					{ width: 8, aspectRatio: 2, borderStyle: 'single' },
					() => h(Text, null, () => 'X'),
				),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('┌──────┐\n│X     │\n│      │\n└──────┘\nY');
	});

	it('set aspect ratio with height', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(
					Box,
					{ height: 3, aspectRatio: 2, borderStyle: 'single' },
					() => h(Text, null, () => 'X'),
				),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('┌────┐\n│X   │\n└────┘\nY');
	});

	it('set aspect ratio with width and height', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(
					Box,
					{
						width: 8,
						height: 3,
						aspectRatio: 2,
						borderStyle: 'single',
					},
					() => h(Text, null, () => 'X'),
				),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('┌────┐\n│X   │\n└────┘\nY');
	});

	it('set aspect ratio with maxHeight constraint', () => {
		const output = frame(() =>
			h(Box, { flexDirection: 'column' }, () => [
				h(
					Box,
					{
						width: 10,
						maxHeight: 3,
						aspectRatio: 2,
						borderStyle: 'single',
					},
					() => h(Text, null, () => 'X'),
				),
				h(Text, null, () => 'Y'),
			]),
		);
		expect(output).toBe('┌────┐\n│X   │\n└────┘\nY');
	});

	it('clears aspectRatio on rerender', async () => {
		const aspectRatio = ref<number | undefined>(2);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(
						Box,
						{
							width: 8,
							aspectRatio: aspectRatio.value,
							borderStyle: 'single',
						},
						() => h(Text, null, () => 'X'),
					),
					h(Text, null, () => 'Y'),
				]),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('┌──────┐\n│X     │\n│      │\n└──────┘\nY');

		aspectRatio.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('┌──────┐\n│X     │\n└──────┘\nY');

		unmount();
	});

	it('set max height in percent', () => {
		const output = frame(() =>
			h(Box, { height: 6, flexDirection: 'column' }, () => [
				h(Box, { maxHeight: '50%' }, () =>
					h(Box, { height: 6 }, () => h(Text, null, () => 'A')),
				),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('A\n\n\nB\n\n');
	});
});
