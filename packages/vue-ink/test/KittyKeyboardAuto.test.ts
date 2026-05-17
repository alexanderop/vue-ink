import { describe, it, expect } from 'vitest';
import { defineComponent, h, onMounted, ref } from 'vue';
import { render, useInput } from '../src/index.ts';
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

	it('delivers user keystrokes typed during the detection window to a useInput handler that mounts after', async () => {
		const stdin = createFakeStdin({ isTTY: true });
		const stdout = createCaptureStream(20, { isTTY: true });
		const seen: string[] = [];
		const Listener = defineComponent({
			setup: () => {
				useInput((input) => {
					seen.push(input);
				});
				return () => h('ink-text', null, 'ready');
			},
		});
		// Defer useInput registration past the kitty detection window so the
		// cleanup path has nowhere to deliver the user's keystroke unless it
		// goes through inputManager's buffer. Mirrors the slow `async setup()`
		// boundary that makes the original `stdin.unshift()` strategy drop
		// input. See brain/renderer/kitty-detection.md.
		const Demo = defineComponent({
			setup: () => {
				const ready = ref(false);
				onMounted(() => {
					setTimeout(() => {
						ready.value = true;
					}, 300);
				});
				return () =>
					h('ink-box', null, ready.value ? [h(Listener)] : [h('ink-text', null, 'wait')]);
			},
		});
		const instance = render(Demo, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			kittyKeyboard: { mode: 'auto' },
		});
		await flush();

		// User presses a key inside the 200ms detection window. The listener
		// is not mounted yet, so the byte lands in the kitty detection buffer.
		stdin.emitData('q');
		expect(seen).toEqual([]);

		// Wait past both the 200ms detection timeout (cleanup hands 'q' to
		// inputManager.bufferInput) and the 300ms listener-mount delay.
		await new Promise((resolve) => setTimeout(resolve, 400));
		await flush();

		expect(seen).toEqual(['q']);
		instance.unmount();
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
