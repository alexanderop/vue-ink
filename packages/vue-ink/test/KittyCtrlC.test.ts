import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render, useInput, type Key } from '../src/index.ts';
import { createCaptureStream, createFakeStdin } from './helpers.ts';

describe('kitty keyboard — Ctrl+C handling', () => {
	it('unmounts the app when kitty Ctrl+C (\\x1b[99;5u) arrives with exitOnCtrlC=true', async () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20, { isTTY: true });
		// useInput claims raw mode so the input manager starts listening for
		// stdin data — without it, kitty CSI-u sequences are never parsed and
		// exitOnCtrlC has nothing to react to. Mirrors real-world apps where
		// kitty mode is paired with at least one keystroke consumer.
		const Demo = defineComponent({
			setup() {
				useInput(() => {});
				return () => h('ink-text', null, 'x');
			},
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: true,
			kittyKeyboard: { mode: 'enabled' },
		});

		// Kitty CSI-u Ctrl+C: codepoint 99 ('c'), ctrl(4)+1 = wire 5
		stdin.emitData('\x1b[99;5u');

		await instance.waitUntilExit();
		// waitUntilExit() resolving is the assertion — if it never resolves the
		// test times out. Nothing else to check.
		expect(true).toBe(true);
	});

	it('forwards kitty Ctrl+C as input when exitOnCtrlC=false', () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20, { isTTY: true });
		const captured: Array<{ input: string; key: Key }> = [];
		const Demo = defineComponent({
			setup() {
				useInput((input, key) => captured.push({ input, key }));
				return () => h('ink-text', null, 'x');
			},
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'enabled' },
		});

		stdin.emitData('\x1b[99;5u');

		expect(captured).toHaveLength(1);
		expect(captured[0]!.input).toBe('c');
		expect(captured[0]!.key.ctrl).toBe(true);
		instance.unmount();
	});
});
