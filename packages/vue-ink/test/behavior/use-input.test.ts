import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Text, useInput, type Key } from '../../src/index.ts';

// Ported behaviour from repos/ink/test/hooks-use-input.tsx. Ink's tests use a
// real PTY because raw-mode behaviour matters; we drive the parser directly
// through the testing-library's fake stdin since the byte-stream path is
// the same.

// Byte literals as named constants — clearer than embedding invisible
// control characters in string literals.
const BACKSPACE = String.fromCharCode(0x08);
const TAB = '\t';
const ENTER = '\r';
const ESC = String.fromCharCode(0x1b);
const CTRL_C = String.fromCharCode(0x03);
const DEL_7F = String.fromCharCode(0x7f);

const captureWith = (
	driver: (params: { stdin: { write: (data: string) => void } }) => void,
): Array<{ input: string; key: Key }> => {
	const captured: Array<{ input: string; key: Key }> = [];
	const App = defineComponent({
		setup() {
			useInput((input, key) => {
				captured.push({ input, key });
			});
			return () => h(Text, null, () => 'ready');
		},
	});
	const { stdin, unmount } = render(App);
	driver({ stdin });
	unmount();
	return captured;
};

describe('useInput', () => {
	it('handles lowercase character', () => {
		const events = captureWith(({ stdin }) => stdin.write('q'));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe('q');
		expect(events[0]!.key.shift).toBe(false);
	});

	it('handles uppercase character (sets shift)', () => {
		const events = captureWith(({ stdin }) => stdin.write('Q'));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe('Q');
		expect(events[0]!.key.shift).toBe(true);
	});

	it('\\r does not count as uppercase', () => {
		const events = captureWith(({ stdin }) => stdin.write(ENTER));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.return).toBe(true);
		expect(events[0]!.key.shift).toBe(false);
	});

	it('handles tab', () => {
		const events = captureWith(({ stdin }) => stdin.write(TAB));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.tab).toBe(true);
		expect(events[0]!.key.shift).toBe(false);
	});

	it('handles shift + tab', () => {
		const events = captureWith(({ stdin }) => stdin.write(`${ESC}[Z`));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.tab).toBe(true);
		expect(events[0]!.key.shift).toBe(true);
	});

	it('handles backspace (0x08)', () => {
		const events = captureWith(({ stdin }) => stdin.write(BACKSPACE));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.backspace).toBe(true);
	});

	// Convention: 0x7F is also a backspace on Unix terminals. The dedicated
	// "delete" key sends the ESC[3~ sequence covered in the next test.
	it('treats 0x7F as backspace', () => {
		const events = captureWith(({ stdin }) => stdin.write(DEL_7F));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.backspace).toBe(true);
	});

	it('handles the delete key (ESC[3~)', () => {
		const events = captureWith(({ stdin }) => stdin.write(`${ESC}[3~`));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.delete).toBe(true);
	});

	// Lone ESC sits in the parser until the 100ms disambiguation window
	// expires, then flushes as a plain escape.
	it('handles escape (after disambiguation window)', async () => {
		const captured: Array<{ input: string; key: Key }> = [];
		const App = defineComponent({
			setup() {
				useInput((input, key) => {
					captured.push({ input, key });
				});
				return () => h(Text, null, () => 'ready');
			},
		});
		const { stdin, unmount } = render(App);
		stdin.write(ESC);
		await new Promise((r) => setTimeout(r, 150));
		unmount();
		expect(captured).toHaveLength(1);
		expect(captured[0]!.key.escape).toBe(true);
		expect(captured[0]!.key.meta).toBe(false);
	});

	it('handles ctrl + c (does not exit; exitOnCtrlC is false in the testing library)', () => {
		const events = captureWith(({ stdin }) => stdin.write(CTRL_C));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe('c');
		expect(events[0]!.key.ctrl).toBe(true);
	});

	it('handles arrow keys', () => {
		const events = captureWith(({ stdin }) => {
			stdin.write(`${ESC}[A`); // up
			stdin.write(`${ESC}[B`); // down
			stdin.write(`${ESC}[C`); // right
			stdin.write(`${ESC}[D`); // left
		});
		expect(events).toHaveLength(4);
		expect(events[0]!.key.upArrow).toBe(true);
		expect(events[1]!.key.downArrow).toBe(true);
		expect(events[2]!.key.rightArrow).toBe(true);
		expect(events[3]!.key.leftArrow).toBe(true);
	});

	it('handles meta + character (option key on macOS)', () => {
		// Option+a sends ESC followed by 'a'.
		const events = captureWith(({ stdin }) => stdin.write(`${ESC}a`));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe('a');
		expect(events[0]!.key.meta).toBe(true);
	});
});
