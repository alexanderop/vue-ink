import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, ref, type Ref } from 'vue';
import { render, usePaste, useInput } from '../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	renderReusable,
} from './helpers.ts';

describe('usePaste', () => {
	it('throws when stdin does not support raw mode', () => {
		const fakeStdin = createFakeStdin({ isTTY: false });
		let caught: Error | null = null;
		const Demo = defineComponent({
			setup() {
				try {
					usePaste(() => {});
				} catch (err) {
					caught = err as Error;
				}
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(caught).toBeInstanceOf(Error);
		expect(caught!.message).toMatch(/raw mode/i);
		instance.unmount();
	});

	it('enables bracketed-paste mode on mount and disables on unmount', () => {
		const fakeStdin = createFakeStdin();
		const Demo = defineComponent({
			setup() {
				usePaste(() => {});
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(stdout.frames.some((f) => f.includes('\x1b[?2004h'))).toBe(true);
		instance.unmount();
		expect(stdout.frames.some((f) => f.includes('\x1b[?2004l'))).toBe(true);
	});

	it('invokes the handler with the pasted string when a bracketed paste arrives', () => {
		const fakeStdin = createFakeStdin();
		const onPaste = vi.fn();
		const Demo = defineComponent({
			setup() {
				usePaste(onPaste);
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		fakeStdin.emitData('\x1b[200~hello world\x1b[201~');
		expect(onPaste).toHaveBeenCalledWith('hello world');
		instance.unmount();
	});

	it('handles multi-line paste as a single call', () => {
		const fakeStdin = createFakeStdin();
		const onPaste = vi.fn();
		const Demo = defineComponent({
			setup() {
				usePaste(onPaste);
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		fakeStdin.emitData('\x1b[200~line1\nline2\nline3\x1b[201~');
		expect(onPaste).toHaveBeenCalledTimes(1);
		expect(onPaste).toHaveBeenCalledWith('line1\nline2\nline3');
		instance.unmount();
	});

	it('respects an isActive ref by gating the handler', async () => {
		const fakeStdin = createFakeStdin();
		const onPaste = vi.fn();
		const isActive: Ref<boolean> = ref(true);
		const Demo = defineComponent({
			setup() {
				usePaste(onPaste, { isActive });
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		fakeStdin.emitData('\x1b[200~one\x1b[201~');
		expect(onPaste).toHaveBeenCalledTimes(1);

		isActive.value = false;
		await flush();
		fakeStdin.emitData('\x1b[200~two\x1b[201~');
		expect(onPaste).toHaveBeenCalledTimes(1);

		isActive.value = true;
		await flush();
		fakeStdin.emitData('\x1b[200~three\x1b[201~');
		expect(onPaste).toHaveBeenCalledTimes(2);
		expect(onPaste).toHaveBeenLastCalledWith('three');
		instance.unmount();
	});

	it('coexists with useInput — paste content is not forwarded to input', () => {
		const fakeStdin = createFakeStdin();
		const onPaste = vi.fn();
		const onInput = vi.fn();
		const Demo = defineComponent({
			setup() {
				useInput(onInput);
				usePaste(onPaste);
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		fakeStdin.emitData('a\x1b[200~pasted\x1b[201~b');
		expect(onPaste).toHaveBeenCalledWith('pasted');
		expect(onInput).toHaveBeenCalledTimes(2);
		expect(onInput.mock.calls[0]![0]).toBe('a');
		expect(onInput.mock.calls[1]![0]).toBe('b');
		instance.unmount();
	});
});
