import { describe, it, expect } from 'vitest';
import { sanitizeAnsi } from '@vue-ink/core';

// Unit-level coverage for the branches `<Text>` doesn't easily exercise:
// malformed CSI sequences and CRLF preservation.

describe('sanitizeAnsi (unit)', () => {
	it('returns the input unchanged when no control characters are present', () => {
		expect(sanitizeAnsi('hello world')).toBe('hello world');
	});

	it('preserves SGR color escapes', () => {
		expect(sanitizeAnsi('\x1b[31mred\x1b[39m')).toBe('\x1b[31mred\x1b[39m');
	});

	it('strips CSI SGR-looking sequences with invalid parameter bytes', () => {
		expect(sanitizeAnsi('a\x1b[31?mb')).toBe('ab');
		expect(sanitizeAnsi('a\x1b[?31mb')).toBe('ab');
	});

	it('preserves OSC control strings', () => {
		const osc = '\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\';
		expect(sanitizeAnsi(osc)).toBe(osc);
	});

	it('strips lone bell, backspace, and other C0 controls', () => {
		expect(sanitizeAnsi('a\x07b\x08c\x01d')).toBe('abcd');
	});

	it('preserves tab and newline while stripping other C0 controls', () => {
		expect(sanitizeAnsi('a\tb\nc\x07d')).toBe('a\tb\ncd');
	});

	it('strips DEL (0x7F)', () => {
		expect(sanitizeAnsi('a\x7Fb')).toBe('ab');
	});

	it('preserves CRLF as \\r\\n', () => {
		expect(sanitizeAnsi('a\r\nb')).toBe('a\r\nb');
	});

	it('drops a lone CR that is not followed by LF', () => {
		expect(sanitizeAnsi('a\rb')).toBe('ab');
	});

	it('drops a malformed CSI ESC and the rest of the buffer', () => {
		// ESC [ 1 — string ends before a final char arrives. The tokenizer
		// treats the remainder from the ESC onward as a single `invalid` token
		// (matches ink semantics), and the sanitizer drops it whole.
		expect(sanitizeAnsi('a\x1b[1')).toBe('a');
	});

	it('drops an ESC + final-byte form as a complete escape sequence', () => {
		// ESC b — 'b' is in the final-byte range (0x30..0x7E), so the tokenizer
		// reads it as a valid `esc` token. The sanitizer drops esc tokens.
		expect(sanitizeAnsi('a\x1bb')).toBe('a');
	});

	it('drops a CSI with non-m final (cursor moves)', () => {
		// ESC [ 2 A — cursor up. Final char isn't 'm' so the whole sequence drops.
		expect(sanitizeAnsi('a\x1b[2Ab')).toBe('ab');
	});

	it('preserves tab and newline literally', () => {
		expect(sanitizeAnsi('a\tb\nc')).toBe('a\tb\nc');
	});

	it('handles CSI sequences with intermediate bytes', () => {
		// ESC [ 1 ! m — has an intermediate byte. Final byte is 'm', but the
		// intermediate path is exercised by the state machine.
		expect(sanitizeAnsi('a\x1b[1 mb')).toBe('ab');
	});
});
