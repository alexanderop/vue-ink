import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import { watch } from 'vue';
import { createFocusManager } from '../../focus-context.ts';
import type { StdinContext } from '../../context.ts';
import { createFakeStdin, withSetup } from '../_test/with-setup.ts';
import { useFocus } from '../useFocus/index.ts';
import { useFocusManager } from './index.ts';

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

describe('useFocusManager', () => {
	it('should be defined', () => {
		expect(useFocusManager).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useFocusManager())).toThrow(/useFocusManager/);
	});

	it('focus(id) activates the matching useFocus entry', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
				manager: useFocusManager(),
			}),
			{ focus, stdin },
		);
		expect(result.a.isFocused.value).toBe(true);

		result.manager.focus('b');
		expect(result.a.isFocused.value).toBe(false);
		expect(result.b.isFocused.value).toBe(true);
		unmount();
	});

	it('focus(unknown-id) is a no-op', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				manager: useFocusManager(),
			}),
			{ focus, stdin },
		);
		result.manager.focus('does-not-exist');
		expect(result.a.isFocused.value).toBe(true);
		expect(result.manager.activeId.value).toBe('a');
		unmount();
	});

	it('disableFocus() clears activeId and ignores Tab', () => {
		const { emitter, focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
				manager: useFocusManager(),
			}),
			{ focus, stdin },
		);

		result.manager.disableFocus();
		expect(result.manager.activeId.value).toBeUndefined();
		expect(result.a.isFocused.value).toBe(false);

		pressTab(emitter);
		expect(result.a.isFocused.value).toBe(false);
		expect(result.b.isFocused.value).toBe(false);
		unmount();
	});

	it('enableFocus() restores Tab handling without auto-refocusing the prior entry', () => {
		const { emitter, focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
				manager: useFocusManager(),
			}),
			{ focus, stdin },
		);
		result.manager.disableFocus();
		result.manager.enableFocus();
		expect(result.manager.activeId.value).toBeUndefined();

		pressTab(emitter);
		expect(result.a.isFocused.value).toBe(true);
		unmount();
	});

	it('focusNext / focusPrevious cycle programmatically', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				a: useFocus({ autoFocus: true, id: 'a' }),
				b: useFocus({ id: 'b' }),
				manager: useFocusManager(),
			}),
			{ focus, stdin },
		);

		result.manager.focusNext();
		expect(result.b.isFocused.value).toBe(true);

		result.manager.focusPrevious();
		expect(result.a.isFocused.value).toBe(true);
		unmount();
	});

	it('focusNext / focusPrevious leave activeId undefined when every focusable is inactive', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => {
				useFocus({ id: 'a', isActive: false });
				useFocus({ id: 'b', isActive: false });
				return { manager: useFocusManager() };
			},
			{ focus, stdin },
		);
		result.manager.focusNext();
		expect(result.manager.activeId.value).toBeUndefined();

		result.manager.focusPrevious();
		expect(result.manager.activeId.value).toBeUndefined();
		unmount();
	});

	it('activeId is a reactive ref consumers can watch', async () => {
		const { focus, stdin } = buildContexts();
		const seen: Array<string | undefined> = [];
		const { result, unmount, flush } = withSetup(
			() => {
				useFocus({ autoFocus: true, id: 'a' });
				useFocus({ id: 'b' });
				const manager = useFocusManager();
				watch(
					() => manager.activeId.value,
					(value) => seen.push(value),
				);
				return manager;
			},
			{ focus, stdin },
		);
		result.focus('b');
		await flush();
		expect(seen).toContain('b');
		unmount();
	});

	it('integrates with useFocus to restore a remembered id', () => {
		const { focus, stdin } = buildContexts();
		const { result, unmount } = withSetup(
			() => ({
				trigger: useFocus({ autoFocus: true, id: 'trigger' }),
				other: useFocus({ id: 'other' }),
				manager: useFocusManager(),
			}),
			{ focus, stdin },
		);

		result.manager.focus('other');
		const remembered = result.manager.activeId.value;
		expect(remembered).toBe('other');

		result.manager.focus('trigger');
		expect(result.trigger.isFocused.value).toBe(true);

		result.manager.focus(remembered!);
		expect(result.manager.activeId.value).toBe('other');
		expect(result.trigger.isFocused.value).toBe(false);
		unmount();
	});
});
