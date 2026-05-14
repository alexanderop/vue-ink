import {describe, it, expect} from 'vitest';
import {h, defineComponent, nextTick} from 'vue';
import stripAnsi from 'strip-ansi';
import {render, Box, Text} from '../src/index.ts';
import {createCaptureStream} from './helpers.ts';

const renderOnce = async (
	component: ReturnType<typeof defineComponent>,
): Promise<string> => {
	const stdout = createCaptureStream(20);
	const instance = render(component, {stdout});
	await nextTick();
	await new Promise(resolve => queueMicrotask(() => resolve(undefined)));
	const output = stdout.frames.join('');
	instance.unmount();
	return stripAnsi(output).replace(/\n+$/, '');
};

describe('Box layout', () => {
	it('lays out children in a row with justifyContent space-between', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 20,
						flexDirection: 'row',
						justifyContent: 'space-between',
					},
					() => [
						h(Text, null, () => 'A'),
						h(Text, null, () => 'B'),
					],
				),
		});
		const out = await renderOnce(Demo);
		expect(out).toBe('A                  B');
	});

	it('applies padding and width', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{width: 10, paddingLeft: 2},
					() => h(Text, null, () => 'hi'),
				),
		});
		const out = await renderOnce(Demo);
		expect(out).toBe('  hi');
	});

	it('stacks column with margin', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{flexDirection: 'column'},
					() => [
						h(Text, null, () => 'one'),
						h(Text, null, () => 'two'),
					],
				),
		});
		const out = await renderOnce(Demo);
		expect(out).toMatchInlineSnapshot(`
			"one
			two"
		`);
	});

	it('alignItems flex-end pushes text to the right edge', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 10,
						flexDirection: 'column',
						alignItems: 'flex-end',
					},
					() => h(Text, null, () => 'X'),
				),
		});
		const out = await renderOnce(Demo);
		expect(out).toBe('         X');
	});

	it('height fills with empty lines', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, {height: 3, flexDirection: 'column'}, () => [
					h(Text, null, () => 'a'),
				]),
		});
		const out = await renderOnce(Demo);
		expect(out.split('\n').length).toBeGreaterThanOrEqual(1);
		expect(out).toContain('a');
	});
});
