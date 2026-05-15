import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Box, Text } from '../../src/index.ts';
import { frame } from './helpers.ts';

// Ported from repos/ink/test/position.tsx.

describe('position', () => {
	it('absolute position with top and left offsets', () => {
		const output = frame(() =>
			h(Box, { width: 5, height: 3 }, () =>
				h(Box, { position: 'absolute', top: 1, left: 2 }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('\n  X\n');
	});

	it('absolute position with bottom and right offsets', () => {
		const output = frame(() =>
			h(Box, { width: 6, height: 4 }, () =>
				h(Box, { position: 'absolute', bottom: 1, right: 1 }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('\n\n    X\n');
	});

	it('absolute position with percentage offsets', () => {
		const output = frame(() =>
			h(Box, { width: 6, height: 4 }, () =>
				h(Box, { position: 'absolute', top: '50%', left: '50%' }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('\n\n   X\n');
	});

	it('absolute position with percentage bottom and right offsets', () => {
		const output = frame(() =>
			h(Box, { width: 6, height: 4 }, () =>
				h(Box, { position: 'absolute', bottom: '50%', right: '50%' }, () =>
					h(Text, null, () => 'X'),
				),
			),
		);
		expect(output).toBe('\n  X\n\n');
	});

	it('relative position offsets visual position while keeping flow', () => {
		const output = frame(() =>
			h(Box, { width: 5 }, () => [
				h(Box, { position: 'relative', left: 2 }, () =>
					h(Text, null, () => 'A'),
				),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe(' BA');
	});

	it('static position ignores offsets', () => {
		const output = frame(() =>
			h(Box, { width: 5 }, () => [
				h(Box, { position: 'static', left: 2 }, () =>
					h(Text, null, () => 'A'),
				),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('AB');
	});

	it('static position ignores percentage offsets', () => {
		const output = frame(() =>
			h(Box, { width: 5 }, () => [
				h(Box, { position: 'static', left: '50%' }, () =>
					h(Text, null, () => 'A'),
				),
				h(Text, null, () => 'B'),
			]),
		);
		expect(output).toBe('AB');
	});

	it('clears top offset on rerender', async () => {
		const top = ref<number | undefined>(1);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { width: 5, height: 3 }, () =>
					h(
						Box,
						{ position: 'absolute', top: top.value, left: 2 },
						() => h(Text, null, () => 'X'),
					),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('\n  X\n');

		top.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('  X\n\n');

		unmount();
	});

	it('clears percentage top and left offsets on rerender', async () => {
		const top = ref<string | undefined>('50%');
		const left = ref<string | undefined>('50%');
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { width: 6, height: 4 }, () =>
					h(
						Box,
						{ position: 'absolute', top: top.value, left: left.value },
						() => h(Text, null, () => 'X'),
					),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('\n\n   X\n');

		top.value = undefined;
		left.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('X\n\n\n');

		unmount();
	});

	it('clears percentage top and left offsets when props are omitted on rerender', async () => {
		const showOffsets = ref(true);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { width: 6, height: 4 }, () =>
					h(
						Box,
						{
							position: 'absolute',
							...(showOffsets.value
								? { top: '50%' as const, left: '50%' as const }
								: {}),
						},
						() => h(Text, null, () => 'X'),
					),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('\n\n   X\n');

		showOffsets.value = false;
		await waitUntilFlush();
		expect(lastFrame()).toBe('X\n\n\n');

		unmount();
	});

	it('clears bottom and right offsets on rerender', async () => {
		const bottom = ref<number | undefined>(1);
		const right = ref<number | undefined>(1);
		const Test = defineComponent({
			setup: () => () =>
				h(Box, { width: 6, height: 4 }, () =>
					h(
						Box,
						{
							position: 'absolute',
							bottom: bottom.value,
							right: right.value,
						},
						() => h(Text, null, () => 'X'),
					),
				),
		});

		const { lastFrame, waitUntilFlush, unmount } = render(Test);
		expect(lastFrame()).toBe('\n\n    X\n');

		bottom.value = undefined;
		right.value = undefined;
		await waitUntilFlush();
		expect(lastFrame()).toBe('X\n\n\n');

		unmount();
	});
});
