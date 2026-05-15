import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { StdinContext } from '../../context.ts';
import type { Key } from '../../input.ts';
import { createFakeStdin, withSetup } from '../_test/with-setup.ts';
import { useInput } from './index.ts';

// Inline stdin context builder — tests need to spy on setRawMode and emit
// events on the internal emitter directly, so we don't use the generic
// fakeStdinContext helper here.
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

const fakeKey = (partial: Partial<Key> = {}): Key =>
	({
		upArrow: false,
		downArrow: false,
		leftArrow: false,
		rightArrow: false,
		pageDown: false,
		pageUp: false,
		home: false,
		end: false,
		return: false,
		escape: false,
		ctrl: false,
		shift: false,
		tab: false,
		backspace: false,
		delete: false,
		meta: false,
		fn: false,
		super: false,
		hyper: false,
		capsLock: false,
		numLock: false,
		...partial,
	}) as Key;

describe('useInput', () => {
	it('should be defined', () => {
		expect(useInput).toBeDefined();
	});

	it('throws when stdin does not support raw mode', () => {
		const stdin = buildStdin({ isRawModeSupported: false });
		expect(() => withSetup(() => useInput(() => {}), { stdin })).toThrow(/raw mode/i);
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useInput(() => {}))).toThrow(/useInput/);
	});

	it('attaches on mount and invokes the handler on input', () => {
		const stdin = buildStdin();
		const onInput = vi.fn();
		const { unmount } = withSetup(() => useInput(onInput), { stdin });

		expect(stdin.setRawMode).toHaveBeenCalledWith(true);
		stdin.emitter.emit('input', 'a', fakeKey());
		expect(onInput).toHaveBeenCalledWith('a', expect.objectContaining({ ctrl: false }));
		unmount();
	});

	it('returns a stop() function that detaches manually', () => {
		const stdin = buildStdin();
		const onInput = vi.fn();
		const { result, unmount } = withSetup(() => useInput(onInput), { stdin });

		stdin.emitter.emit('input', 'a', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);

		result();
		stdin.emitter.emit('input', 'b', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);
		expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
		unmount();
	});

	it('detaches automatically on scope dispose', () => {
		const stdin = buildStdin();
		const onInput = vi.fn();
		const { unmount } = withSetup(() => useInput(onInput), { stdin });
		stdin.emitter.emit('input', 'a', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);

		unmount();
		stdin.emitter.emit('input', 'b', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);
	});

	it('respects a ref-based isActive', async () => {
		const stdin = buildStdin();
		const onInput = vi.fn();
		const isActive = ref(true);
		const { unmount, flush } = withSetup(() => useInput(onInput, { isActive }), {
			stdin,
		});

		stdin.emitter.emit('input', 'a', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);

		isActive.value = false;
		await flush();
		stdin.emitter.emit('input', 'b', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);

		isActive.value = true;
		await flush();
		stdin.emitter.emit('input', 'c', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(2);
		unmount();
	});

	it('respects a getter-based isActive (MaybeRefOrGetter)', async () => {
		const stdin = buildStdin();
		const onInput = vi.fn();
		const state = ref({ editing: true });
		const { unmount, flush } = withSetup(
			() => useInput(onInput, { isActive: () => state.value.editing }),
			{ stdin },
		);

		stdin.emitter.emit('input', 'a', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);

		state.value = { editing: false };
		await flush();
		stdin.emitter.emit('input', 'b', fakeKey());
		expect(onInput).toHaveBeenCalledTimes(1);
		unmount();
	});

	it('respects a plain `isActive: false`', () => {
		const stdin = buildStdin();
		const onInput = vi.fn();
		const { unmount } = withSetup(() => useInput(onInput, { isActive: false }), {
			stdin,
		});
		stdin.emitter.emit('input', 'a', fakeKey());
		expect(onInput).not.toHaveBeenCalled();
		expect(stdin.setRawMode).not.toHaveBeenCalledWith(true);
		unmount();
	});
});
