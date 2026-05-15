import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { render } from '../../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	flush,
} from '../helpers.ts';
import { Box, Text, usePaste, useInput } from '../../src/index.ts';

// Ported from repos/ink/test/hooks-use-paste.tsx. ink drives bracketed paste
// through a node-pty fixture; vue-ink can stay in-process — the input pipeline
// reads raw 'data' events from any stdin-shaped EventEmitter, so a fake stdin
// (createFakeStdin) is enough to exercise the paste codepath end-to-end.

const ESC = String.fromCharCode(0x1b);
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

const mount = (App: ReturnType<typeof defineComponent>) => {
	const stdin = createFakeStdin();
	const stdout = createCaptureStream();
	const instance = render(App, { stdout, stdin });
	return { stdin, stdout, instance };
};

describe('usePaste', () => {
	it('receives bracketed paste as single text blob', async () => {
		const received = ref('');
		const App = defineComponent({
			setup() {
				usePaste((text) => {
					received.value = text;
				});
				return () =>
					h(Box, null, () =>
						h(Text, null, () => `received: ${received.value}`),
					);
			},
		});

		const { stdin, instance } = mount(App);
		stdin.emitData(`${PASTE_START}hello world${PASTE_END}`);
		await flush();

		expect(received.value).toBe('hello world');
		instance.unmount();
	});

	it('paste content with escape sequences is delivered verbatim', async () => {
		const received = ref('');
		const App = defineComponent({
			setup() {
				usePaste((text) => {
					received.value = text;
				});
				return () => h(Box, null, () => h(Text, null, () => 'ready'));
			},
		});

		const { stdin, instance } = mount(App);
		// Inner escape sequence (ESC[A) must pass through unchanged, not be
		// interpreted as a keypress.
		stdin.emitData(`${PASTE_START}hello${ESC}[Aworld${PASTE_END}`);
		await flush();

		expect(received.value).toBe(`hello${ESC}[Aworld`);
		instance.unmount();
	});

	it('useInput does not receive bracketed paste content', async () => {
		const onPaste = vi.fn();
		const onInput = vi.fn();
		const App = defineComponent({
			setup() {
				usePaste(onPaste);
				useInput((input) => {
					onInput(input);
				});
				return () => h(Box, null, () => h(Text, null, () => 'ready'));
			},
		});

		const { stdin, instance } = mount(App);
		stdin.emitData(`${PASTE_START}hello${PASTE_END}`);
		await flush();

		expect(onPaste).toHaveBeenCalledWith('hello');
		expect(onInput).not.toHaveBeenCalled();
		instance.unmount();
	});

	it('multiple simultaneous composables both receive the same paste event', async () => {
		const onPasteA = vi.fn();
		const onPasteB = vi.fn();
		const App = defineComponent({
			setup() {
				usePaste(onPasteA);
				usePaste(onPasteB);
				return () => h(Box, null, () => h(Text, null, () => 'ready'));
			},
		});

		const { stdin, instance } = mount(App);
		stdin.emitData(`${PASTE_START}hello${PASTE_END}`);
		await flush();

		expect(onPasteA).toHaveBeenCalledWith('hello');
		expect(onPasteB).toHaveBeenCalledWith('hello');
		instance.unmount();
	});
});
