import { describe, it, expect } from 'vitest';
import parseKeypress from '../../renderer/src/parse-keypress.ts';

describe('parseKeypress', () => {
	it('parses lowercase letters', () => {
		const key = parseKeypress('a');
		expect(key.name).toBe('a');
		expect(key.ctrl).toBe(false);
		expect(key.shift).toBe(false);
		expect(key.meta).toBe(false);
	});

	it('parses uppercase letters with shift flag', () => {
		const key = parseKeypress('A');
		expect(key.name).toBe('a');
		expect(key.shift).toBe(true);
	});

	it('parses ctrl+letter as ctrl=true with the letter name', () => {
		const key = parseKeypress('\x01');
		expect(key.name).toBe('a');
		expect(key.ctrl).toBe(true);
	});

	it('parses Escape then f as meta+f (single combined key)', () => {
		const key = parseKeypress('\x1bf');
		expect(key.name).toBe('f');
		expect(key.meta).toBe(true);
	});

	it('parses Escape then F as meta+shift+f', () => {
		const key = parseKeypress('\x1bF');
		expect(key.name).toBe('f');
		expect(key.meta).toBe(true);
		expect(key.shift).toBe(true);
	});

	it('parses arrow keys', () => {
		expect(parseKeypress('\x1b[A').name).toBe('up');
		expect(parseKeypress('\x1b[B').name).toBe('down');
		expect(parseKeypress('\x1b[C').name).toBe('right');
		expect(parseKeypress('\x1b[D').name).toBe('left');
	});

	it('parses Shift+Tab as tab + shift', () => {
		const key = parseKeypress('\x1b[Z');
		expect(key.name).toBe('tab');
		expect(key.shift).toBe(true);
	});

	it('parses tab', () => {
		expect(parseKeypress('\t').name).toBe('tab');
	});

	it('parses return / enter / backspace / escape', () => {
		expect(parseKeypress('\r').name).toBe('return');
		expect(parseKeypress('\n').name).toBe('enter');
		expect(parseKeypress('\x7f').name).toBe('backspace');
		expect(parseKeypress('\x1b').name).toBe('escape');
	});

	it('parses page up/down, home, end, delete, insert', () => {
		expect(parseKeypress('\x1b[5~').name).toBe('pageup');
		expect(parseKeypress('\x1b[6~').name).toBe('pagedown');
		expect(parseKeypress('\x1b[H').name).toBe('home');
		expect(parseKeypress('\x1b[F').name).toBe('end');
		expect(parseKeypress('\x1b[3~').name).toBe('delete');
		expect(parseKeypress('\x1b[2~').name).toBe('insert');
	});

	it('parses function keys f1-f4', () => {
		expect(parseKeypress('\x1bOP').name).toBe('f1');
		expect(parseKeypress('\x1bOQ').name).toBe('f2');
		expect(parseKeypress('\x1bOR').name).toBe('f3');
		expect(parseKeypress('\x1bOS').name).toBe('f4');
	});

	it('parses Ctrl+Arrow', () => {
		const key = parseKeypress('\x1b[1;5A');
		expect(key.name).toBe('up');
		expect(key.ctrl).toBe(true);
	});

	it('parses meta+Arrow with double-escape', () => {
		const key = parseKeypress('\x1b\x1b[A');
		expect(key.name).toBe('up');
		expect(key.meta).toBe(true);
	});

	it('parses multi-byte unicode (emoji) as a single key', () => {
		const key = parseKeypress('😀');
		expect(key.sequence).toBe('😀');
	});

	it('parses Uint8Array input', () => {
		const buf = new TextEncoder().encode('a');
		const key = parseKeypress(buf);
		expect(key.name).toBe('a');
	});

	it('parses Uint8Array with meta bit high', () => {
		// 0x80 + 'a' (0x61) = 0xe1 — high bit indicates meta prefix
		const buf = new Uint8Array([0xe1]);
		const key = parseKeypress(buf);
		expect(key.meta).toBe(true);
		expect(key.name).toBe('a');
	});

	it('parses kitty CSI-u sequence with eventType', () => {
		const key = parseKeypress('\x1b[97;1:3u');
		expect(key.name).toBe('a');
		expect(key.eventType).toBe('release');
		expect(key.isKittyProtocol).toBe(true);
	});

	it('parses kitty modifier — super', () => {
		// modifiers = super(8)+1 = 9
		const key = parseKeypress('\x1b[97;9u');
		expect(key.super).toBe(true);
		expect(key.name).toBe('a');
	});

	it('parses kitty modifier — hyper', () => {
		// modifiers = hyper(16)+1 = 17
		const key = parseKeypress('\x1b[97;17u');
		expect(key.hyper).toBe(true);
	});

	it('parses kitty special letter key with eventType', () => {
		// CSI 1 ; 1 : 1 A → up arrow press
		const key = parseKeypress('\x1b[1;1:1A');
		expect(key.name).toBe('up');
		expect(key.eventType).toBe('press');
		expect(key.isKittyProtocol).toBe(true);
	});

	it('parses kitty special number key (delete release)', () => {
		// CSI 3 ; 1 : 3 ~ → delete release
		const key = parseKeypress('\x1b[3;1:3~');
		expect(key.name).toBe('delete');
		expect(key.eventType).toBe('release');
	});
});
