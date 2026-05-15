import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent } from 'vue';
import {
	render,
	useInput,
	kittyFlags,
	kittyModifiers,
	type Key,
} from '../src/index.ts';
import { createCaptureStream, createFakeStdin } from './helpers.ts';

describe('kitty keyboard — exports', () => {
	it('exports kittyFlags bitmask constants', () => {
		expect(kittyFlags.disambiguateEscapeCodes).toBe(1);
		expect(kittyFlags.reportEventTypes).toBe(2);
		expect(kittyFlags.reportAlternateKeys).toBe(4);
		expect(kittyFlags.reportAllKeysAsEscapeCodes).toBe(8);
		expect(kittyFlags.reportAssociatedText).toBe(16);
	});

	it('exports kittyModifiers bitmask constants', () => {
		expect(kittyModifiers.shift).toBe(1);
		expect(kittyModifiers.alt).toBe(2);
		expect(kittyModifiers.ctrl).toBe(4);
		expect(kittyModifiers.super).toBe(8);
		expect(kittyModifiers.hyper).toBe(16);
	});
});

describe('kitty keyboard — render integration', () => {
	it('writes the push-keyboard-mode escape on mount when kittyKeyboard is configured', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: {
				mode: 'enabled',
				flags: ['disambiguateEscapeCodes', 'reportEventTypes'],
			},
		});
		const joined = stdout.frames.join('');
		// disambiguateEscapeCodes (1) | reportEventTypes (2) = 3
		expect(joined).toContain('\x1b[>3u');
		instance.unmount();
	});

	it('writes the pop-keyboard-mode escape on unmount', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'enabled' },
		});
		const beforeUnmount = stdout.frames.join('');
		expect(beforeUnmount).not.toContain('\x1b[<u');
		instance.unmount();
		const afterUnmount = stdout.frames.join('');
		expect(afterUnmount).toContain('\x1b[<u');
	});

	it('defaults to disambiguateEscapeCodes when flags are omitted', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'enabled' },
		});
		// Just disambiguateEscapeCodes = 1
		expect(stdout.frames.join('')).toContain('\x1b[>1u');
		instance.unmount();
	});

	it('does NOT write the escape when kittyKeyboard option is omitted', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
		});
		const joined = stdout.frames.join('');
		expect(joined).not.toMatch(/\x1b\[>\d+u/);
		instance.unmount();
		const after = stdout.frames.join('');
		expect(after).not.toContain('\x1b[<u');
	});

	it('does NOT write the escape when mode is disabled', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'disabled' },
		});
		const joined = stdout.frames.join('');
		expect(joined).not.toMatch(/\x1b\[>\d+u/);
		instance.unmount();
	});
});

describe('kitty keyboard — key delivery', () => {
	it('delivers eventType: "release" through useInput', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const captured: Key[] = [];
		const Demo = defineComponent({
			setup() {
				useInput((_input, key) => captured.push(key));
				return () => h('ink-text', null, 'x');
			},
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: {
				mode: 'enabled',
				flags: ['disambiguateEscapeCodes', 'reportEventTypes'],
			},
		});
		// kitty CSI-u: codepoint 97 ('a'), modifier 1 (no mods, wire=1), eventType 3 (release)
		fakeStdin.emitData('\x1b[97;1:3u');
		expect(captured.at(-1)!.eventType).toBe('release');
		instance.unmount();
	});

	it('populates Key.super for a kitty super-modified key', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const captured: Key[] = [];
		const Demo = defineComponent({
			setup() {
				useInput((_input, key) => captured.push(key));
				return () => h('ink-text', null, 'x');
			},
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'enabled' },
		});
		// modifier = super(8)+1 = 9
		fakeStdin.emitData('\x1b[97;9u');
		expect(captured.at(-1)!.super).toBe(true);
		expect(captured.at(-1)!.hyper).toBe(false);
		instance.unmount();
	});

	it('populates Key.hyper for a kitty hyper-modified key', () => {
		const fakeStdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const captured: Key[] = [];
		const Demo = defineComponent({
			setup() {
				useInput((_input, key) => captured.push(key));
				return () => h('ink-text', null, 'x');
			},
		});
		const instance = render(Demo, {
			stdout,
			stdin: fakeStdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'enabled' },
		});
		// modifier = hyper(16)+1 = 17
		fakeStdin.emitData('\x1b[97;17u');
		expect(captured.at(-1)!.hyper).toBe(true);
		instance.unmount();
	});
});
