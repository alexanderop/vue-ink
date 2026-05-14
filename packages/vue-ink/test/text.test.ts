import { describe, it, expect } from 'vitest';
import { h, defineComponent, nextTick } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text } from '../src/index.ts';
import { createCaptureStream } from './helpers.ts';

const renderComponent = async (component: ReturnType<typeof defineComponent>) => {
	const stdout = createCaptureStream();
	const instance = render(component, { stdout });
	await nextTick();
	await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
	const output = stdout.frames.join('');
	instance.unmount();
	return output;
};

describe('Text', () => {
	it('renders plain text', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'hello world'),
		});
		const output = await renderComponent(Demo);
		expect(stripAnsi(output)).toContain('hello world');
	});

	it('applies color (green)', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { color: 'green' }, () => 'colored'),
		});
		const output = await renderComponent(Demo);
		// ANSI green foreground = [32m
		expect(output).toMatch(/\[32m.*colored.*\[39m/);
		expect(stripAnsi(output)).toContain('colored');
	});

	it('applies backgroundColor (red)', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { backgroundColor: 'red' }, () => 'bg'),
		});
		const output = await renderComponent(Demo);
		expect(output).toMatch(/\[41m.*bg.*\[49m/);
	});

	it('applies bold', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { bold: true }, () => 'bold'),
		});
		const output = await renderComponent(Demo);
		expect(output).toMatch(/\[1m.*bold.*\[22m/);
	});

	it('applies dimColor', async () => {
		const Demo = defineComponent({
			setup: () => () => h(Text, { dimColor: true }, () => 'dim'),
		});
		const output = await renderComponent(Demo);
		expect(output).toMatch(/\[2m.*dim.*\[22m/);
	});
});
