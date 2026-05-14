import { describe, it, expect, vi } from 'vitest';
import { createInputManager } from '../../renderer/src/input.ts';
import { createFakeStdin } from './helpers.ts';

describe('createInputManager', () => {
	it('reports isRawModeSupported=false when stdin is not a TTY', () => {
		const stdin = createFakeStdin({ isTTY: false });
		const mgr = createInputManager({
			stdin,
			exitOnCtrlC: false,
			onCtrlC: () => {},
		});
		expect(mgr.isRawModeSupported).toBe(false);
		mgr.destroy();
	});

	it('reports isRawModeSupported=false when setRawMode is not a function', () => {
		const stdin = createFakeStdin({ isTTY: true, supportsRawMode: false });
		const mgr = createInputManager({
			stdin,
			exitOnCtrlC: false,
			onCtrlC: () => {},
		});
		expect(mgr.isRawModeSupported).toBe(false);
		mgr.destroy();
	});

	it('throws when setRawMode is called and raw mode is not supported', () => {
		const stdin = createFakeStdin({ isTTY: false });
		const mgr = createInputManager({
			stdin,
			exitOnCtrlC: false,
			onCtrlC: () => {},
		});
		expect(() => mgr.setRawMode(true)).toThrow(/Raw mode is not supported/);
		mgr.destroy();
	});

	it('calls onCtrlC when ctrl+c is received and exitOnCtrlC is true', () => {
		const stdin = createFakeStdin();
		const onCtrlC = vi.fn();
		const mgr = createInputManager({ stdin, exitOnCtrlC: true, onCtrlC });
		mgr.setRawMode(true);
		stdin.emitKeypress('c', { name: 'c', ctrl: true });
		expect(onCtrlC).toHaveBeenCalledTimes(1);
		mgr.destroy();
	});

	it('does not call onCtrlC when exitOnCtrlC is false', () => {
		const stdin = createFakeStdin();
		const onCtrlC = vi.fn();
		const events: Array<{ input: string; ctrl: boolean }> = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string, key) =>
			events.push({ input, ctrl: key.ctrl }),
		);
		stdin.emitKeypress('c', { name: 'c', ctrl: true });
		expect(onCtrlC).not.toHaveBeenCalled();
		expect(events.at(-1)).toEqual({ input: 'c', ctrl: true });
		mgr.destroy();
	});

	it('maps arrow keys to the right Key fields with empty input', () => {
		const stdin = createFakeStdin();
		const seen: Array<{ input: string; key: Record<string, unknown> }> = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string, key) => seen.push({ input, key }));

		stdin.emitKeypress(undefined, { name: 'up' });
		stdin.emitKeypress(undefined, { name: 'down' });
		stdin.emitKeypress(undefined, { name: 'left' });
		stdin.emitKeypress(undefined, { name: 'right' });

		expect(seen.map((e) => e.input)).toEqual(['', '', '', '']);
		expect(seen[0]!.key.upArrow).toBe(true);
		expect(seen[1]!.key.downArrow).toBe(true);
		expect(seen[2]!.key.leftArrow).toBe(true);
		expect(seen[3]!.key.rightArrow).toBe(true);
		mgr.destroy();
	});

	it('maps tab/return/escape/backspace/delete/home/end/pageup/pagedown', () => {
		const stdin = createFakeStdin();
		const seen: Array<Record<string, unknown>> = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (_input: string, key) => seen.push(key));

		for (const name of [
			'tab',
			'return',
			'escape',
			'backspace',
			'delete',
			'home',
			'end',
			'pageup',
			'pagedown',
		]) {
			stdin.emitKeypress(undefined, { name });
		}

		expect(seen[0]!.tab).toBe(true);
		expect(seen[1]!.return).toBe(true);
		expect(seen[2]!.escape).toBe(true);
		expect(seen[3]!.backspace).toBe(true);
		expect(seen[4]!.delete).toBe(true);
		expect(seen[5]!.home).toBe(true);
		expect(seen[6]!.end).toBe(true);
		expect(seen[7]!.pageUp).toBe(true);
		expect(seen[8]!.pageDown).toBe(true);
		mgr.destroy();
	});

	it('passes printable input through unchanged', () => {
		const stdin = createFakeStdin();
		const seen: string[] = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string) => seen.push(input));

		stdin.emitKeypress('a', { name: 'a' });
		stdin.emitKeypress('B', { name: 'b', shift: true });
		stdin.emitKeypress('!', undefined);

		expect(seen).toEqual(['a', 'B', '!']);
		mgr.destroy();
	});

	it('uses the key name when ctrl is held (so ctrl+a -> "a")', () => {
		const stdin = createFakeStdin();
		const seen: Array<{ input: string; ctrl: boolean }> = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string, key) =>
			seen.push({ input, ctrl: key.ctrl }),
		);

		stdin.emitKeypress('\x01', { name: 'a', ctrl: true });
		expect(seen.at(-1)).toEqual({ input: 'a', ctrl: true });
		mgr.destroy();
	});

	it('reference-counts setRawMode so concurrent users do not flap the TTY', () => {
		const stdin = createFakeStdin();
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		const spy = stdin.setRawMode as unknown as ReturnType<typeof vi.fn>;

		mgr.setRawMode(true);
		mgr.setRawMode(true);
		// Two enables → only one underlying setRawMode(true) call.
		expect(spy.mock.calls.filter((c) => c[0] === true).length).toBe(1);

		mgr.setRawMode(false);
		// One disable while another caller still holds it — stays on.
		expect(spy.mock.calls.filter((c) => c[0] === false).length).toBe(0);

		mgr.setRawMode(false);
		expect(spy.mock.calls.filter((c) => c[0] === false).length).toBe(1);

		mgr.destroy();
	});

	it('destroy() turns off raw mode if it was on', () => {
		const stdin = createFakeStdin();
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.destroy();
		const spy = stdin.setRawMode as unknown as ReturnType<typeof vi.fn>;
		expect(spy.mock.calls.some((c) => c[0] === false)).toBe(true);
	});

	it('handles a keypress with no raw object (defaults all fields to false)', () => {
		const stdin = createFakeStdin();
		const seen: Array<Record<string, unknown>> = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (_input: string, key) => seen.push(key));

		stdin.emitKeypress('z', undefined);
		expect(seen.at(-1)!.ctrl).toBe(false);
		expect(seen.at(-1)!.shift).toBe(false);
		expect(seen.at(-1)!.meta).toBe(false);
		mgr.destroy();
	});

	it('does not double-start listening when setRawMode(true) is called twice', () => {
		const stdin = createFakeStdin();
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		const seen: string[] = [];
		mgr.setRawMode(true);
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string) => seen.push(input));
		stdin.emitKeypress('x', { name: 'x' });
		expect(seen).toEqual(['x']);
		mgr.destroy();
	});
});
