import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Text, useInput, type Key } from '../src/index.ts';

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

	// ── Ported gap-filling cases from repos/ink/test/hooks-use-input.tsx ──

	it('handles ctrl + non-c character (e.g. ctrl+F = 0x06)', () => {
		const events = captureWith(({ stdin }) => stdin.write(String.fromCharCode(0x06)));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe('f');
		expect(events[0]!.key.ctrl).toBe(true);
	});

	it('handles meta + backspace (ESC + 0x7F)', () => {
		const events = captureWith(({ stdin }) => stdin.write(`${ESC}${DEL_7F}`));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.backspace).toBe(true);
		expect(events[0]!.key.meta).toBe(true);
	});

	// ESC + O is the SS3 prefix used for F1–F4 in some terminals, so the
	// parser holds the ESC pending more bytes. Once the disambiguation window
	// expires it flushes as a meta+O event.
	it('handles meta + O (ESC + O) after disambiguation window', async () => {
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
		stdin.write(`${ESC}O`);
		await new Promise((r) => setTimeout(r, 150));
		unmount();
		expect(captured.length).toBeGreaterThan(0);
		expect(captured.at(-1)!.input).toBe('O');
	});

	it('handles option + return (ESC + \\r) as meta+return', () => {
		const events = captureWith(({ stdin }) => stdin.write(`${ESC}${ENTER}`));
		expect(events).toHaveLength(1);
		expect(events[0]!.key.return).toBe(true);
		expect(events[0]!.key.meta).toBe(true);
	});

	// vue-ink's parser delivers a multi-byte buffer that starts with \r as one
	// chunk (input: "\rtest") rather than splitting it into a return event +
	// literal characters the way ink does. This pins the current contract;
	// matching ink's split would require parser changes.
	it('delivers a pasted-buffer-with-leading-CR as a single chunk', () => {
		const events = captureWith(({ stdin }) => stdin.write(`${ENTER}test`));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe(`${ENTER}test`);
		expect(events[0]!.key.return).toBe(false);
	});

	// Same divergence as the CR case — multi-byte buffer with a control byte
	// is delivered verbatim rather than split.
	it('delivers a pasted-buffer-with-leading-tab as a single chunk', () => {
		const events = captureWith(({ stdin }) => stdin.write(`${TAB}test`));
		expect(events).toHaveLength(1);
		expect(events[0]!.input).toBe(`${TAB}test`);
		expect(events[0]!.key.tab).toBe(false);
	});

	// When no usePaste handler is mounted the input manager forwards the
	// bracketed-paste payload to useInput as a regular keypress, matching ink.
	it('useInput receives bracketed paste content when no usePaste handler is active', async () => {
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
		stdin.write(`${ESC}[200~hello${ESC}[201~`);
		await new Promise((r) => setTimeout(r, 150));
		unmount();
		expect(captured).toHaveLength(1);
		expect(captured[0]!.input).toBe('hello');
	});

	// Negative tests — these used to crash the parser before the unknown-CSI
	// branches were added. Asserting "no throw + at least one event" is enough
	// to lock the regression.
	it('does not crash on Ctrl+F1 (ESC[1;5P)', () => {
		expect(() =>
			captureWith(({ stdin }) => stdin.write(`${ESC}[1;5P`)),
		).not.toThrow();
	});

	it('does not crash on an unmapped ctrl escape sequence (ESC[1;5I)', () => {
		expect(() =>
			captureWith(({ stdin }) => stdin.write(`${ESC}[1;5I`)),
		).not.toThrow();
	});

	// Standalone ESC[ with no terminator: the parser flushes "[" as a literal
	// input event after the disambiguation window expires (the leading ESC is
	// consumed as a meta prefix and discarded since [ doesn't combine into a
	// known sequence).
	it('flushes a lone ESC[ prefix as literal "[" after the disambiguation window', async () => {
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
		stdin.write(`${ESC}[`);
		await new Promise((r) => setTimeout(r, 150));
		unmount();
		expect(captured).toHaveLength(1);
		expect(captured[0]!.input).toBe('[');
	});
});
