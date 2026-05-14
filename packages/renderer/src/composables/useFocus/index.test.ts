import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { createFocusManager } from '../../focus-context.ts';
import type { StdinContext } from '../../context.ts';
import { createFakeStdin, withSetup } from '../_test/with-setup.ts';
import { useFocus } from './index.ts';

const buildContexts = () => {
	const emitter = new EventEmitter();
	const focus = createFocusManager(emitter);
	const stdin: StdinContext = {
		stdin: createFakeStdin(),
		isRawModeSupported: true,
		setRawMode: vi.fn(),
		setBracketedPasteMode: vi.fn(),
		emitter,
	};
	return { emitter, focus, stdin };
};

// Helper to drive a tab keypress through the real focus manager's emitter.
const pressTab = (emitter: EventEmitter, shift = false): void => {
	emitter.emit('input', '', {
		tab: true,
		shift,
		ctrl: false,
		meta: false,
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
		backspace: false,
		delete: false,
		fn: false,
		super: false,
		hyper: false,
		capsLock: false,
		numLock: false,
	});
};

describe('useFocus', () => {
	it('should be defined', () => {
		expect(useFocus).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useFocus())).toThrow(/useFocus/);
	});

	it('starts unfocused when autoFocus is not set', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(() => useFocus(), { focus, stdin });
		expect(result.isFocused.value).toBe(false);
		unmount();
	});

	it('autoFocus claims focus on mount when no one else is active', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(() => useFocus({ autoFocus: true }), {
			focus,
			stdin,
		});
		expect(result.isFocused.value).toBe(true);
		unmount();
	});

	it('autoFocus does not steal focus when another focusable already has it', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => {
				const first = useFocus({ autoFocus: true, id: 'first' });
				const second = useFocus({ autoFocus: true, id: 'second' });
				return { first, second };
			},
			{ focus, stdin },
		);
		expect(result.first.isFocused.value).toBe(true);
		expect(result.second.isFocused.value).toBe(false);
		unmount();
	});

	it('cycles focus forward on Tab in registration order', () => {
		const { emitter, focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
				c: useFocus({ id: 'c' }),
			}),
			{ focus, stdin },
		);
		expect(result.a.isFocused.value).toBe(true);

		pressTab(emitter);
		expect(result.b.isFocused.value).toBe(true);

		pressTab(emitter);
		expect(result.c.isFocused.value).toBe(true);

		pressTab(emitter);
		expect(result.a.isFocused.value).toBe(true);
		unmount();
	});

	it('cycles focus backwards on Shift+Tab', () => {
		const { emitter, focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
				c: useFocus({ id: 'c' }),
			}),
			{ focus, stdin },
		);
		pressTab(emitter, true);
		expect(result.c.isFocused.value).toBe(true);
		unmount();
	});

	it('skips entries whose isActive is false during cycling', () => {
		const { emitter, focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b', isActive: false }),
				c: useFocus({ id: 'c' }),
			}),
			{ focus, stdin },
		);
		pressTab(emitter);
		expect(result.b.isFocused.value).toBe(false);
		expect(result.c.isFocused.value).toBe(true);
		unmount();
	});

	it('reacts to a ref-based isActive flipping while focused', async () => {
		const { focus, stdin } = buildContexts();
		const isActive = ref(true);
		const { result, unmount, flush } = withSetup(
			() => useFocus({ autoFocus: true, id: 'target', isActive }),
			{ focus, stdin },
		);
		expect(result.isFocused.value).toBe(true);

		isActive.value = false;
		await flush();
		expect(result.isFocused.value).toBe(false);
		unmount();
	});

	it('reacts to a getter-based isActive', async () => {
		const { focus, stdin } = buildContexts();
		const state = ref({ ready: true });
		const { result, unmount, flush } = withSetup(
			() =>
				useFocus({
					autoFocus: true,
					id: 'target',
					isActive: () => state.value.ready,
				}),
			{ focus, stdin },
		);
		expect(result.isFocused.value).toBe(true);

		state.value = { ready: false };
		await flush();
		expect(result.isFocused.value).toBe(false);
		unmount();
	});

	it('deregisters on unmount so Tab no longer targets it', () => {
		const { emitter, focus, stdin } = buildContexts();
		const first = withSetup(() => useFocus({ autoFocus: true, id: 'first' }), {
			focus,
			stdin,
		});
		const second = withSetup(() => useFocus({ id: 'second' }), { focus, stdin });
		expect(first.result.isFocused.value).toBe(true);

		first.unmount();
		pressTab(emitter);
		expect(second.result.isFocused.value).toBe(true);
		second.unmount();
	});

	it('exposes a focus(id) helper that switches active entry', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
			}),
			{ focus, stdin },
		);

		result.a.focus('b');
		expect(result.a.isFocused.value).toBe(false);
		expect(result.b.isFocused.value).toBe(true);
		unmount();
	});
});
