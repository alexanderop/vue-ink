import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { render } from '../src/index.ts';
import { createCaptureStream, createFakeStdin, flush } from './helpers.ts';

// Ported from repos/ink/src/ink.tsx → initKittyKeyboard + confirmKittySupport.
// vue-ink's renderer treats `mode: 'auto'` the same as `mode: 'enabled'`
// today (see packages/renderer/src/render.ts:596 and the porting gap noted
// in brain/porting/from-react-ink.md). These tests document the desired
// auto-detect protocol and currently fail.
//
// The wire contract for ink's auto-detect:
//   1. On mount, write the query `ESC [ ? u` to stdout.
//   2. Listen on stdin for a `ESC [ ? <digits> u` response, with a 200ms timeout.
//   3. If a response arrives, write the push-mode escape `ESC [ > <flags> u`.
//   4. If the timeout fires first, leave the protocol off.

const ESC = String.fromCharCode(0x1b);
const queryEscape = `${ESC}[?u`;
const pushModeRegex = new RegExp(`${'\\u001b'}\\[>\\d+u`);

describe("kitty keyboard — mode: 'auto'", () => {
	it('writes the detection query (ESC [ ? u) on mount, NOT the push-mode escape', async () => {
		const stdin = createFakeStdin({ isTTY: true });
		const stdout = createCaptureStream(20, { isTTY: true });
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'auto' },
		});
		await flush();
		const joined = stdout.frames.join('');
		expect(joined).toContain(queryEscape);
		// The push-mode escape must NOT appear yet — we haven't received a
		// response from the (fake) terminal.
		expect(joined).not.toMatch(pushModeRegex);
		instance.unmount();
	});

	it('writes the push-mode escape after the terminal answers the query', async () => {
		const stdin = createFakeStdin({ isTTY: true });
		const stdout = createCaptureStream(20, { isTTY: true });
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'auto', flags: ['disambiguateEscapeCodes'] },
		});
		await flush();

		const framesBeforeResponse = stdout.frames.length;
		// Emit the kitty query response: ESC [ ? 1 u (protocol supported with
		// disambiguateEscapeCodes already active).
		stdin.emitData(`${ESC}[?1u`);
		await flush();

		const tail = stdout.frames.slice(framesBeforeResponse).join('');
		// disambiguateEscapeCodes = 1
		expect(tail).toContain(`${ESC}[>1u`);
		instance.unmount();
	});

	it('does NOT write the push-mode escape if no response arrives (silent timeout)', async () => {
		const stdin = createFakeStdin({ isTTY: true });
		const stdout = createCaptureStream(20, { isTTY: true });
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'auto' },
		});
		await flush();
		// Wait beyond ink's 200ms detection window so the timeout fires.
		await new Promise((resolve) => setTimeout(resolve, 250));
		const joined = stdout.frames.join('');
		expect(joined).toContain(queryEscape);
		expect(joined).not.toMatch(pushModeRegex);
		instance.unmount();
		// And no pop-mode escape either, since we never enabled it.
		expect(stdout.frames.join('')).not.toContain(`${ESC}[<u`);
	});

	it('skips auto-detect entirely when interactive is false', async () => {
		const stdin = createFakeStdin({ isTTY: true });
		const stdout = createCaptureStream(20, { isTTY: true });
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, 'x'),
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			interactive: false,
			kittyKeyboard: { mode: 'auto' },
		});
		await flush();
		const joined = stdout.frames.join('');
		expect(joined).not.toContain(queryEscape);
		expect(joined).not.toMatch(pushModeRegex);
		instance.unmount();
	});
});
