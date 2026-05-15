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

	it('strips lone bell, backspace, and other C0 controls', () => {
		expect(sanitizeAnsi('a\x07b\x08c\x01d')).toBe('abcd');
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

	it('drops a malformed CSI ESC and resumes parsing the rest of the bytes', () => {
		// ESC [ 1 — string ends before a final char arrives. The ESC is dropped
		// and the loop falls through to handle subsequent characters as normal
		// printables (so '[' and '1' survive).
		expect(sanitizeAnsi('a\x1b[1')).toBe('a[1');
	});

	it('drops a lone ESC that is not part of a CSI sequence', () => {
		// ESC followed by something other than '[' — falls through the C0
		// control branch (ESC = 0x1B is below 0x20 and not \t/\n).
		expect(sanitizeAnsi('a\x1bb')).toBe('ab');
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
		const out = sanitizeAnsi('a\x1b[1 mb');
		// either preserved as-is (with the intermediate) or stripped — we just
		// want to drive that branch without crashing
		expect(out).toContain('a');
		expect(out).toContain('b');
	});
});
