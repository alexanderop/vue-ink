// Ported from repos/ink/test/reconciler.tsx (MIT — https://github.com/vadimdemedes/ink)
//
// The "two renders must match" trick: render the same final state two ways
// (one via an initial→rerender, one via a fresh render of the final tree) and
// assert that the byte output is identical. This sidesteps having to write
// expected ANSI by hand and catches reconciler bugs that mutate intermediate
// state but happen to look right at first glance.
//
// Skipped (React-only): the two `Suspense` cases. Vue's scheduler has no
// Suspense equivalent in the renderer flow — async setup() + a fallback ref
// covers the same use case at the app level.
import { describe, expect, test } from 'vitest';
import { defineComponent, h, type Component } from 'vue';
import chalk from 'chalk';
import { Box, Text } from '../src/index.ts';
import { renderReusable, flush } from './helpers.ts';

const lastFrame = (frames: string[]): string => frames[frames.length - 1] ?? '';

const matchAfterRerender = async (
	makeInitial: () => Component,
	makeUpdated: () => Component,
	expectedFinal: Component,
	expectedInitial: Component,
): Promise<void> => {
	const actual = await renderReusable(makeInitial(), { debug: true });
	const expected = await renderReusable(expectedInitial, { debug: true });

	expect(lastFrame(actual.stdout.frames)).toBe(
		lastFrame(expected.stdout.frames),
	);

	actual.instance.rerender(makeUpdated());
	expected.instance.rerender(expectedFinal);
	await flush();

	expect(lastFrame(actual.stdout.frames)).toBe(
		lastFrame(expected.stdout.frames),
	);

	actual.instance.unmount();
	expected.instance.unmount();
};

describe('reconciler', () => {
	test('update child', async () => {
		const Test = defineComponent({
			props: { update: { type: Boolean, default: false } },
			setup: (props) => () => h(Text, null, () => (props.update ? 'B' : 'A')),
		});

		await matchAfterRerender(
			() => h(Test),
			() => h(Test, { update: true }),
			h(Text, null, () => 'B'),
			h(Text, null, () => 'A'),
		);
	});

	test('update text node', async () => {
		const Test = defineComponent({
			props: { update: { type: Boolean, default: false } },
			setup: (props) => () =>
				h(Box, null, () => [
					h(Text, null, () => 'Hello '),
					h(Text, null, () => (props.update ? 'B' : 'A')),
				]),
		});

		await matchAfterRerender(
			() => h(Test),
			() => h(Test, { update: true }),
			h(Text, null, () => 'Hello B'),
			h(Text, null, () => 'Hello A'),
		);
	});

	test('remove style prop', async () => {
		const Test = defineComponent({
			props: { withStyle: { type: Boolean, default: true } },
			setup: (props) => () =>
				h(
					Box,
					props.withStyle ? { marginLeft: 1 } : {},
					() => h(Text, null, () => 'X'),
				),
		});

		const result = await renderReusable(h(Test, { withStyle: true }), {
			debug: true,
		});
		expect(lastFrame(result.stdout.frames)).toBe(' X\n');

		result.instance.rerender(h(Test, { withStyle: false }));
		await flush();
		expect(lastFrame(result.stdout.frames)).toBe('X\n');

		result.instance.unmount();
	});

	test('append child', async () => {
		const Test = defineComponent({
			props: { append: { type: Boolean, default: false } },
			setup: (props) => () => {
				if (props.append) {
					return h(Box, { flexDirection: 'column' }, () => [
						h(Text, null, () => 'A'),
						h(Text, null, () => 'B'),
					]);
				}
				return h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'A'),
				]);
			},
		});

		await matchAfterRerender(
			() => h(Test),
			() => h(Test, { append: true }),
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
			h(Box, { flexDirection: 'column' }, () => [h(Text, null, () => 'A')]),
		);
	});

	test('insert child between other children', async () => {
		const Test = defineComponent({
			props: { insert: { type: Boolean, default: false } },
			setup: (props) => () => {
				if (props.insert) {
					return h(Box, { flexDirection: 'column' }, () => [
						h(Text, { key: 'a' }, () => 'A'),
						h(Text, { key: 'b' }, () => 'B'),
						h(Text, { key: 'c' }, () => 'C'),
					]);
				}
				return h(Box, { flexDirection: 'column' }, () => [
					h(Text, { key: 'a' }, () => 'A'),
					h(Text, { key: 'c' }, () => 'C'),
				]);
			},
		});

		await matchAfterRerender(
			() => h(Test),
			() => h(Test, { insert: true }),
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
				h(Text, null, () => 'C'),
			]),
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'C'),
			]),
		);
	});

	test('remove child', async () => {
		const Test = defineComponent({
			props: { remove: { type: Boolean, default: false } },
			setup: (props) => () => {
				if (props.remove) {
					return h(Box, { flexDirection: 'column' }, () => [
						h(Text, null, () => 'A'),
					]);
				}
				return h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'A'),
					h(Text, null, () => 'B'),
				]);
			},
		});

		await matchAfterRerender(
			() => h(Test),
			() => h(Test, { remove: true }),
			h(Box, { flexDirection: 'column' }, () => [h(Text, null, () => 'A')]),
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
	});

	test('reorder children', async () => {
		const Test = defineComponent({
			props: { reorder: { type: Boolean, default: false } },
			setup: (props) => () => {
				if (props.reorder) {
					return h(Box, { flexDirection: 'column' }, () => [
						h(Text, { key: 'b' }, () => 'B'),
						h(Text, { key: 'a' }, () => 'A'),
					]);
				}
				return h(Box, { flexDirection: 'column' }, () => [
					h(Text, { key: 'a' }, () => 'A'),
					h(Text, { key: 'b' }, () => 'B'),
				]);
			},
		});

		await matchAfterRerender(
			() => h(Test),
			() => h(Test, { reorder: true }),
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'B'),
				h(Text, null, () => 'A'),
			]),
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, null, () => 'A'),
				h(Text, null, () => 'B'),
			]),
		);
	});

	test('replace child node with text', async () => {
		const Dynamic = defineComponent({
			props: { replace: { type: Boolean, default: false } },
			setup: (props) => () =>
				props.replace
					? h(Text, null, () => 'x')
					: h(Text, { color: 'green' }, () => 'test'),
		});

		const result = await renderReusable(h(Dynamic), { debug: true });
		expect(lastFrame(result.stdout.frames)).toBe(`${chalk.green('test')}\n`);

		result.instance.rerender(h(Dynamic, { replace: true }));
		await flush();
		expect(lastFrame(result.stdout.frames)).toBe('x\n');

		result.instance.unmount();
	});
});
