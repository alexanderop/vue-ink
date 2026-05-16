// Ported from repos/ink/test/ansi-tokenizer.ts (MIT — https://github.com/vadimdemedes/ink)
import { describe, expect, test } from 'vitest';
import { tokenizeAnsi } from '@vue-ink/core';

describe('tokenizeAnsi', () => {
	test('plain text', () => {
		expect(tokenizeAnsi('hello')).toEqual([{ type: 'text', value: 'hello' }]);
	});

	test('ESC CSI SGR sequence', () => {
		const tokens = tokenizeAnsi('A\u001b[31mB');

		expect(tokens.map((token) => token.type)).toEqual(['text', 'csi', 'text']);
		expect(tokens[0]).toEqual({ type: 'text', value: 'A' });
		expect(tokens[2]).toEqual({ type: 'text', value: 'B' });

		const [, csiToken] = tokens;
		if (csiToken?.type !== 'csi') throw new Error('expected csi token');

		expect(csiToken.value).toBe('\u001b[31m');
		expect(csiToken.parameterString).toBe('31');
		expect(csiToken.intermediateString).toBe('');
		expect(csiToken.finalCharacter).toBe('m');
	});

	test('C1 CSI sequence', () => {
		const tokens = tokenizeAnsi('A\u009b2 qB');
		const [, csiToken] = tokens;

		if (csiToken?.type !== 'csi') throw new Error('expected csi token');

		expect(csiToken.value).toBe('\u009b2 q');
		expect(csiToken.parameterString).toBe('2');
		expect(csiToken.intermediateString).toBe(' ');
		expect(csiToken.finalCharacter).toBe('q');
	});

	test('OSC control string with ST terminator', () => {
		const tokens = tokenizeAnsi('A\u001b]8;;https://example.com\u001b\\B');
		const [, oscToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'osc', 'text']);
		if (oscToken?.type !== 'osc') throw new Error('expected osc token');

		expect(oscToken.value).toBe('\u001b]8;;https://example.com\u001b\\');
	});

	test('tmux DCS passthrough as one control string token', () => {
		const tokens = tokenizeAnsi(
			'A\u001bPtmux;\u001b\u001b]8;;https://example.com\u001b\u001b\\\u001b\\B',
		);
		const [, dcsToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'dcs', 'text']);
		if (dcsToken?.type !== 'dcs') throw new Error('expected dcs token');

		expect(dcsToken.value.startsWith('\u001bPtmux;')).toBe(true);
		expect(dcsToken.value.endsWith('\u001b\\')).toBe(true);
	});

	test('incomplete CSI is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u001b[');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u001b[' },
		]);
	});

	test('incomplete ESC intermediate sequence is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u001b#');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u001b#' },
		]);
	});

	test('ignore lone ESC before non-final byte', () => {
		const tokens = tokenizeAnsi('A\u001b\u0007B');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'text', value: '\u0007B' },
		]);
	});

	test('ESC ST sequence as ESC token', () => {
		const tokens = tokenizeAnsi('A\u001b\\B');
		const [, escToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'esc', 'text']);
		if (escToken?.type !== 'esc') throw new Error('expected esc token');

		expect(escToken.value).toBe('\u001b\\');
		expect(escToken.intermediateString).toBe('');
		expect(escToken.finalCharacter).toBe('\\');
	});

	test('C1 OSC with C1 ST terminator', () => {
		const tokens = tokenizeAnsi('A\u009d8;;https://example.com\u009cB');
		const [, oscToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'osc', 'text']);
		if (oscToken?.type !== 'osc') throw new Error('expected osc token');

		expect(oscToken.value).toBe('\u009d8;;https://example.com\u009c');
	});

	test('C1 OSC with ESC ST terminator', () => {
		const tokens = tokenizeAnsi('A\u009d8;;https://example.com\u001b\\B');
		const [, oscToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'osc', 'text']);
		if (oscToken?.type !== 'osc') throw new Error('expected osc token');

		expect(oscToken.value).toBe('\u009d8;;https://example.com\u001b\\');
	});

	test('C1 SGR CSI sequence', () => {
		const tokens = tokenizeAnsi('A\u009b31mB');
		const [, csiToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'csi', 'text']);
		if (csiToken?.type !== 'csi') throw new Error('expected csi token');

		expect(csiToken.value).toBe('\u009b31m');
		expect(csiToken.parameterString).toBe('31');
		expect(csiToken.intermediateString).toBe('');
		expect(csiToken.finalCharacter).toBe('m');
	});

	test('incomplete C1 CSI is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u009b31');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u009b31' },
		]);
	});

	test('incomplete C1 OSC is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u009d8;;https://example.com');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u009d8;;https://example.com' },
		]);
	});

	test('DCS with BEL in payload runs until ST terminator', () => {
		const tokens = tokenizeAnsi(
			'A\u001bPpayload\u0007still-payload\u001b\\B',
		);
		const [, dcsToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'dcs', 'text']);
		if (dcsToken?.type !== 'dcs') throw new Error('expected dcs token');

		expect(dcsToken.value.includes('\u0007')).toBe(true);
		expect(dcsToken.value.endsWith('\u001b\\')).toBe(true);
	});

	test('C1 OSC control string with BEL terminator', () => {
		const tokens = tokenizeAnsi('A\u009d8;;https://example.com\u0007B');
		const [, oscToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'osc', 'text']);
		if (oscToken?.type !== 'osc') throw new Error('expected osc token');

		expect(oscToken.value).toBe('\u009d8;;https://example.com\u0007');
	});

	test('ESC SOS control string with ST terminator', () => {
		const tokens = tokenizeAnsi('A\u001bXpayload\u001b\\B');
		const [, sosToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'sos', 'text']);
		if (sosToken?.type !== 'sos') throw new Error('expected sos token');

		expect(sosToken.value).toBe('\u001bXpayload\u001b\\');
	});

	test('ESC SOS control string with C1 ST terminator', () => {
		const tokens = tokenizeAnsi('A\u001bXpayload\u009cB');
		const [, sosToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'sos', 'text']);
		if (sosToken?.type !== 'sos') throw new Error('expected sos token');

		expect(sosToken.value).toBe('\u001bXpayload\u009c');
	});

	test('C1 SOS control string with C1 ST terminator', () => {
		const tokens = tokenizeAnsi('A\u0098payload\u009cB');
		const [, sosToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'sos', 'text']);
		if (sosToken?.type !== 'sos') throw new Error('expected sos token');

		expect(sosToken.value).toBe('\u0098payload\u009c');
	});

	test('C1 SOS control string with ESC ST terminator', () => {
		const tokens = tokenizeAnsi('A\u0098payload\u001b\\B');
		const [, sosToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'sos', 'text']);
		if (sosToken?.type !== 'sos') throw new Error('expected sos token');

		expect(sosToken.value).toBe('\u0098payload\u001b\\');
	});

	test('ESC SOS with BEL terminator is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u001bXpayload\u0007B');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u001bXpayload\u0007B' },
		]);
	});

	test('C1 SOS with BEL terminator is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u0098payload\u0007B');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u0098payload\u0007B' },
		]);
	});

	test('incomplete C1 SOS is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u0098payload');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u0098payload' },
		]);
	});

	test('incomplete ESC SOS is invalid and stops', () => {
		const tokens = tokenizeAnsi('A\u001bXpayload');
		expect(tokens).toEqual([
			{ type: 'text', value: 'A' },
			{ type: 'invalid', value: '\u001bXpayload' },
		]);
	});

	test('SOS with escaped ESC in payload runs until final ST terminator', () => {
		const tokens = tokenizeAnsi('A\u001bXfoo\u001b\u001b\\bar\u001b\\B');
		const [, sosToken] = tokens;

		expect(tokens.map((token) => token.type)).toEqual(['text', 'sos', 'text']);
		if (sosToken?.type !== 'sos') throw new Error('expected sos token');

		expect(sosToken.value.includes('\u001b\u001b\\')).toBe(true);
		expect(sosToken.value.endsWith('\u001b\\')).toBe(true);
	});

	test('standalone C1 controls as c1 tokens', () => {
		const tokens = tokenizeAnsi('A\u0085B\u008eC');
		const [, c1Token1, , c1Token2] = tokens;

		expect(tokens.map((token) => token.type)).toEqual([
			'text',
			'c1',
			'text',
			'c1',
			'text',
		]);
		if (c1Token1?.type !== 'c1') throw new Error('expected c1 token');
		if (c1Token2?.type !== 'c1') throw new Error('expected c1 token');

		expect(c1Token1.value).toBe('\u0085');
		expect(c1Token2.value).toBe('\u008e');
	});
});
