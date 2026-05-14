import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, ref, type Ref } from 'vue';
import { render, useApp, useStdin, useInput } from '../src/index.ts';
import {
	renderReusable,
	createCaptureStream,
	createFakeStdin,
} from './helpers.ts';

describe('useApp', () => {
	it('exposes exit() that unmounts the app', async () => {
		let appExit: (() => void) | null = null;
		const Demo = defineComponent({
			setup() {
				const app = useApp();
				appExit = () => app.exit();
				return () => h('ink-text');
			},
		});

		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, exitOnCtrlC: false });
		expect(appExit).not.toBeNull();
		const waitPromise = instance.waitUntilExit();
		appExit!();
		await waitPromise;
	});

	it('propagates an error passed to exit() through waitUntilExit', async () => {
		let appExit: ((err?: Error) => void) | null = null;
		const Demo = defineComponent({
			setup() {
				const app = useApp();
				appExit = (err) => app.exit(err);
				return () => h('ink-text');
			},
		});

		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, exitOnCtrlC: false });
		const waitPromise = instance.waitUntilExit();
		appExit!(new Error('boom'));
		await expect(waitPromise).rejects.toThrow(/boom/);
	});

	it('throws when no AppContext is provided', () => {
		// Direct call — inject() returns undefined and requireApp() throws.
		expect(() => useApp()).toThrow(/useApp\(\)/);
	});
});

describe('useStdin', () => {
	it('exposes the stdin stream and raw mode controls', async () => {
		const fakeStdin = createFakeStdin();
		let captured: ReturnType<typeof useStdin> | null = null;
		const Demo = defineComponent({
			setup() {
				captured = useStdin();
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(captured).not.toBeNull();
		expect(captured!.stdin).toBe(fakeStdin);
		expect(captured!.isRawModeSupported).toBe(true);
		expect(typeof captured!.setRawMode).toBe('function');
		instance.unmount();
	});

	it('throws when no StdinContext is provided', () => {
		expect(() => useStdin()).toThrow(/useStdin/);
	});
});

describe('useInput', () => {
	it('throws when stdin does not support raw mode', () => {
		const fakeStdin = createFakeStdin({ isTTY: false });
		let caught: Error | null = null;
		const Demo = defineComponent({
			setup() {
				try {
					useInput(() => {});
				} catch (err) {
					caught = err as Error;
				}
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		// errorHandler swallows render errors — useInput throws synchronously
		// from setup, so we still see it via our catch above.
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(caught).toBeInstanceOf(Error);
		expect(caught!.message).toMatch(/raw mode/i);
		instance.unmount();
	});

	it('invokes the handler when input is emitted', async () => {
		const fakeStdin = createFakeStdin({ isTTY: true });
		const onInput = vi.fn();
		const Demo = defineComponent({
			setup() {
				useInput(onInput);
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });

		// Simulate a keypress through the same channel the real input manager uses.
		fakeStdin.emitData('a');

		expect(onInput).toHaveBeenCalledWith('a', expect.objectContaining({ ctrl: false }));
		instance.unmount();
	});

	it('respects isActive ref by gating the handler', async () => {
		const fakeStdin = createFakeStdin({ isTTY: true });
		const onInput = vi.fn();
		const isActive: Ref<boolean> = ref(true);
		const Demo = defineComponent({
			setup() {
				useInput(onInput, { isActive });
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const { instance, flush } = await renderReusable(Demo, { columns: 20, stdin: fakeStdin });

		fakeStdin.emitData('a');
		expect(onInput).toHaveBeenCalledTimes(1);

		isActive.value = false;
		await flush();
		fakeStdin.emitData('b');
		expect(onInput).toHaveBeenCalledTimes(1);

		isActive.value = true;
		await flush();
		fakeStdin.emitData('c');
		expect(onInput).toHaveBeenCalledTimes(2);

		instance.unmount();
		// keep stdout reference live so vitest doesn't gc it before unmount
		void stdout;
	});

	it('respects a plain boolean isActive', () => {
		const fakeStdin = createFakeStdin({ isTTY: true });
		const onInput = vi.fn();
		const Demo = defineComponent({
			setup() {
				useInput(onInput, { isActive: false });
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		fakeStdin.emitData('a');
		expect(onInput).not.toHaveBeenCalled();
		instance.unmount();
	});

	it('throws when no StdinContext is provided', () => {
		expect(() => useInput(() => {})).toThrow(/useStdin|useInput/);
	});

	it('stops listening on unmount', () => {
		const fakeStdin = createFakeStdin({ isTTY: true });
		const onInput = vi.fn();
		const Demo = defineComponent({
			setup() {
				useInput(onInput);
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });

		fakeStdin.emitData('a');
		expect(onInput).toHaveBeenCalledTimes(1);

		instance.unmount();
		fakeStdin.emitData('b');
		// After unmount the input handler is detached.
		expect(onInput).toHaveBeenCalledTimes(1);
	});
});
