import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render } from '../../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	flush,
} from '../helpers.ts';
import { Text, useInput } from '../../src/index.ts';
import type { Key } from '@vue-ink/renderer';

// Ported from repos/ink/test/hooks-use-input-navigation.tsx. ink drives a
// node-pty fixture; vue-ink can stay in-process by emitting raw CSI
// sequences on a fake stdin and asserting on the parsed `key` flags.

const ESC = String.fromCharCode(0x1b);

const runWithSequence = async (sequence: string): Promise<Key> => {
	const captured: Key[] = [];
	const App = defineComponent({
		setup() {
			useInput((_input, key) => {
				captured.push(key);
			});
			return () => h(Text, null, () => 'ready');
		},
	});

	const stdin = createFakeStdin();
	const stdout = createCaptureStream();
	const instance = render(App, { stdout, stdin });
	stdin.emitData(sequence);
	await flush();
	instance.unmount();
	expect(captured.length).toBeGreaterThan(0);
	return captured.at(-1)!;
};

describe('useInput - navigation', () => {
	it('handle up arrow', async () => {
		const key = await runWithSequence(`${ESC}[A`);
		expect(key.upArrow).toBe(true);
	});

	it('handle down arrow', async () => {
		const key = await runWithSequence(`${ESC}[B`);
		expect(key.downArrow).toBe(true);
	});

	it('handle left arrow', async () => {
		const key = await runWithSequence(`${ESC}[D`);
		expect(key.leftArrow).toBe(true);
	});

	it('handle right arrow', async () => {
		const key = await runWithSequence(`${ESC}[C`);
		expect(key.rightArrow).toBe(true);
	});

	it('handle meta + up arrow', async () => {
		const key = await runWithSequence(`${ESC}${ESC}[A`);
		expect(key.upArrow).toBe(true);
		expect(key.meta).toBe(true);
	});

	it('handle meta + down arrow', async () => {
		const key = await runWithSequence(`${ESC}${ESC}[B`);
		expect(key.downArrow).toBe(true);
		expect(key.meta).toBe(true);
	});

	it('handle meta + left arrow', async () => {
		const key = await runWithSequence(`${ESC}${ESC}[D`);
		expect(key.leftArrow).toBe(true);
		expect(key.meta).toBe(true);
	});

	it('handle meta + right arrow', async () => {
		const key = await runWithSequence(`${ESC}${ESC}[C`);
		expect(key.rightArrow).toBe(true);
		expect(key.meta).toBe(true);
	});

	it('handle ctrl + up arrow', async () => {
		const key = await runWithSequence(`${ESC}[1;5A`);
		expect(key.upArrow).toBe(true);
		expect(key.ctrl).toBe(true);
	});

	it('handle ctrl + down arrow', async () => {
		const key = await runWithSequence(`${ESC}[1;5B`);
		expect(key.downArrow).toBe(true);
		expect(key.ctrl).toBe(true);
	});

	it('handle ctrl + left arrow', async () => {
		const key = await runWithSequence(`${ESC}[1;5D`);
		expect(key.leftArrow).toBe(true);
		expect(key.ctrl).toBe(true);
	});

	it('handle ctrl + right arrow', async () => {
		const key = await runWithSequence(`${ESC}[1;5C`);
		expect(key.rightArrow).toBe(true);
		expect(key.ctrl).toBe(true);
	});

	it('handle page down', async () => {
		const key = await runWithSequence(`${ESC}[6~`);
		expect(key.pageDown).toBe(true);
	});

	it('handle page up', async () => {
		const key = await runWithSequence(`${ESC}[5~`);
		expect(key.pageUp).toBe(true);
	});

	it('handle home', async () => {
		const key = await runWithSequence(`${ESC}[H`);
		expect(key.home).toBe(true);
	});

	it('handle end', async () => {
		const key = await runWithSequence(`${ESC}[F`);
		expect(key.end).toBe(true);
	});
});
