import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { StdinContext } from '../../context.ts';
import { createFakeStdin, withSetup } from '../_test/with-setup.ts';
import { usePaste } from './index.ts';

type TestStdinCtx = StdinContext & {
	emitter: EventEmitter;
	setRawMode: ReturnType<typeof vi.fn<(enable: boolean) => void>>;
	setBracketedPasteMode: ReturnType<typeof vi.fn<(enable: boolean) => void>>;
};

const buildStdin = (overrides: Partial<TestStdinCtx> = {}): TestStdinCtx => ({
	stdin: createFakeStdin(),
	isRawModeSupported: true,
	setRawMode: vi.fn<(enable: boolean) => void>(),
	setBracketedPasteMode: vi.fn<(enable: boolean) => void>(),
	emitter: new EventEmitter(),
	...overrides,
});

describe('usePaste', () => {
	it('should be defined', () => {
		expect(usePaste).toBeDefined();
	});

	it('throws when stdin does not support raw mode', () => {
		const stdin = buildStdin({ isRawModeSupported: false });
		expect(() => withSetup(() => usePaste(() => {}), { stdin })).toThrow(/raw mode/i);
	});

	it('does NOT throw when isRawModeSupported is false but isActive is false', () => {
		const stdin = buildStdin({ isRawModeSupported: false });
		expect(() =>
			withSetup(() => usePaste(() => {}, { isActive: false }), { stdin }),
		).not.toThrow();
	});

	it('does NOT throw when isRawModeSupported is false but isActive getter is false', () => {
		const stdin = buildStdin({ isRawModeSupported: false });
		expect(() =>
			withSetup(() => usePaste(() => {}, { isActive: () => false }), { stdin }),
		).not.toThrow();
	});

	it('throws when isActive flips from false to true on unsupported stdin', async () => {
		const stdin = buildStdin({ isRawModeSupported: false });
		const isActive = ref(false);
		const { flush } = withSetup(() => usePaste(() => {}, { isActive }), { stdin });
		isActive.value = true;
		await expect(flush()).rejects.toThrow(/raw mode/i);
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => usePaste(() => {}))).toThrow(/usePaste/);
	});

	it('enables bracketed paste mode and raw mode on attach', () => {
		const stdin = buildStdin();
		const { unmount } = withSetup(() => usePaste(() => {}), { stdin });
		expect(stdin.setRawMode).toHaveBeenCalledWith(true);
		expect(stdin.setBracketedPasteMode).toHaveBeenCalledWith(true);
		unmount();
	});

	it('invokes the handler on a paste event', () => {
		const stdin = buildStdin();
		const onPaste = vi.fn();
		const { unmount } = withSetup(() => usePaste(onPaste), { stdin });
		stdin.emitter.emit('paste', 'hello world');
		expect(onPaste).toHaveBeenCalledWith('hello world');
		unmount();
	});

	it('returns a stop() that disables bracketed paste + raw mode', () => {
		const stdin = buildStdin();
		const onPaste = vi.fn();
		const { result, unmount } = withSetup(() => usePaste(onPaste), { stdin });

		stdin.emitter.emit('paste', 'a');
		expect(onPaste).toHaveBeenCalledTimes(1);

		result();
		stdin.emitter.emit('paste', 'b');
		expect(onPaste).toHaveBeenCalledTimes(1);
		expect(stdin.setBracketedPasteMode).toHaveBeenLastCalledWith(false);
		expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
		unmount();
	});

	it('detaches on scope dispose', () => {
		const stdin = buildStdin();
		const onPaste = vi.fn();
		const { unmount } = withSetup(() => usePaste(onPaste), { stdin });
		unmount();
		stdin.emitter.emit('paste', 'a');
		expect(onPaste).not.toHaveBeenCalled();
	});

	it('respects a ref-based isActive', async () => {
		const stdin = buildStdin();
		const onPaste = vi.fn();
		const isActive = ref(true);
		const { unmount, flush } = withSetup(() => usePaste(onPaste, { isActive }), { stdin });

		stdin.emitter.emit('paste', 'a');
		expect(onPaste).toHaveBeenCalledTimes(1);

		isActive.value = false;
		await flush();
		stdin.emitter.emit('paste', 'b');
		expect(onPaste).toHaveBeenCalledTimes(1);
		expect(stdin.setBracketedPasteMode).toHaveBeenLastCalledWith(false);
		unmount();
	});

	it('respects a getter-based isActive', async () => {
		const stdin = buildStdin();
		const onPaste = vi.fn();
		const state = ref(true);
		const { unmount, flush } = withSetup(
			() => usePaste(onPaste, { isActive: () => state.value }),
			{ stdin },
		);
		state.value = false;
		await flush();
		stdin.emitter.emit('paste', 'a');
		expect(onPaste).not.toHaveBeenCalled();
		unmount();
	});

	it('respects a plain `isActive: false`', () => {
		const stdin = buildStdin();
		const onPaste = vi.fn();
		const { unmount } = withSetup(() => usePaste(onPaste, { isActive: false }), {
			stdin,
		});
		stdin.emitter.emit('paste', 'a');
		expect(onPaste).not.toHaveBeenCalled();
		expect(stdin.setBracketedPasteMode).not.toHaveBeenCalledWith(true);
		unmount();
	});
});
