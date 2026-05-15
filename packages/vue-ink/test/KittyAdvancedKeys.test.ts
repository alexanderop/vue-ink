import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render, useInput, type Key } from '../src/index.ts';
import { createCaptureStream, createFakeStdin } from './helpers.ts';

// Kitty CSI-u modifier wire value is (bitmask - 1) inverted, i.e. the
// terminal sends `(modifiers + 1)` so the parser subtracts 1 to recover the
// bitmask. We construct sequences with the +1 offset throughout.
//
// kittyModifiers bitmask:
//   shift=1 alt=2 ctrl=4 super=8 hyper=16 meta=32 capsLock=64 numLock=128

const captureKeys = (
	stdin: ReturnType<typeof createFakeStdin>,
	stdout: NodeJS.WriteStream,
	emit: (s: ReturnType<typeof createFakeStdin>) => void,
): Key[] => {
	const captured: Key[] = [];
	const Demo = defineComponent({
		setup() {
			useInput((_input, key) => captured.push(key));
			return () => h('ink-text', null, 'x');
		},
	});
	const instance = render(Demo, {
		stdout,
		stdin,
		exitOnCtrlC: false,
		kittyKeyboard: { mode: 'enabled' },
	});
	emit(stdin);
	instance.unmount();
	return captured;
};

describe('kitty keyboard — advanced modifier flags', () => {
	it('reports key.capsLock=true when the capsLock modifier bit is set', () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20, { isTTY: true });
		// capsLock bitmask = 64 → wire = 65; codepoint 97 ('a')
		const keys = captureKeys(stdin, stdout, (s) => s.emitData('\x1b[97;65u'));
		expect(keys.at(-1)!.capsLock).toBe(true);
		expect(keys.at(-1)!.numLock).toBe(false);
	});

	it('reports key.numLock=true when the numLock modifier bit is set', () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20, { isTTY: true });
		// numLock bitmask = 128 → wire = 129; codepoint 97 ('a')
		const keys = captureKeys(stdin, stdout, (s) => s.emitData('\x1b[97;129u'));
		expect(keys.at(-1)!.numLock).toBe(true);
		expect(keys.at(-1)!.capsLock).toBe(false);
	});

	it("reports eventType='repeat' (kitty event type 2)", () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20, { isTTY: true });
		// codepoint 97 ('a'), no modifiers (wire=1), eventType=2 (repeat)
		const keys = captureKeys(stdin, stdout, (s) => s.emitData('\x1b[97;1:2u'));
		expect(keys.at(-1)!.eventType).toBe('repeat');
	});

	it('disambiguated bare Escape (\\x1b[27u) sets key.escape=true', () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20, { isTTY: true });
		const keys = captureKeys(stdin, stdout, (s) => s.emitData('\x1b[27u'));
		expect(keys.at(-1)!.escape).toBe(true);
	});
});
