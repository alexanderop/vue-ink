import {
	computed,
	toValue,
	watch,
	type ComputedRef,
	type MaybeRefOrGetter,
} from 'vue';
import { FOCUS_CONTEXT_KEY, STDIN_CONTEXT_KEY } from '../../context.ts';
import {
	requireContext,
	tryOnScopeDispose,
} from '../_internal/index.ts';

export interface UseFocusOptions {
	/**
	 * Whether the entry participates in tab cycling and accepts focus. Accepts a
	 * ref, a getter, or a plain boolean. Defaults to `true`.
	 */
	isActive?: MaybeRefOrGetter<boolean>;
	/**
	 * Claim focus on mount if no other focusable is currently active.
	 */
	autoFocus?: boolean;
	/**
	 * Stable id. Provide it when you need to call `focus(id)` from elsewhere;
	 * a random id is generated otherwise.
	 */
	id?: string;
}

export interface UseFocusReturn {
	isFocused: ComputedRef<boolean>;
	focus: (id: string) => void;
}

let focusIdCounter = 0;
const generateFocusId = (): string => {
	focusIdCounter += 1;
	return `vi-focus-${focusIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
};

/**
 * Register the current component as a focusable target in the focus manager.
 * Returns a `isFocused` computed that flips when this entry becomes active,
 * plus a `focus(id)` helper to programmatically move focus elsewhere.
 *
 * Tab and Shift+Tab cycle through active entries in mount order. Entries are
 * automatically deregistered when the surrounding scope is disposed.
 */
export const useFocus = (options: UseFocusOptions = {}): UseFocusReturn => {
	const focusCtx = requireContext(FOCUS_CONTEXT_KEY, 'useFocus()');
	const { setRawMode, isRawModeSupported } = requireContext(
		STDIN_CONTEXT_KEY,
		'useFocus()',
	);

	const id = options.id ?? generateFocusId();
	const autoFocus = options.autoFocus ?? false;
	focusCtx.add(id, { autoFocus });

	const isActive = computed(() => toValue(options.isActive ?? true) !== false);

	let holdingRawMode = false;
	const releaseRawMode = (): void => {
		if (!holdingRawMode) return;
		setRawMode(false);
		holdingRawMode = false;
	};
	const acquireRawMode = (): void => {
		if (!isRawModeSupported) return;
		setRawMode(true);
		holdingRawMode = true;
	};

	watch(
		isActive,
		(value) => {
			if (value) {
				focusCtx.activate(id);
				acquireRawMode();
			} else {
				focusCtx.deactivate(id);
				releaseRawMode();
			}
		},
		{ immediate: true },
	);

	tryOnScopeDispose(() => {
		focusCtx.remove(id);
		releaseRawMode();
	});

	const isFocused = computed(() => focusCtx.activeId.value === id);

	return {
		isFocused,
		focus: focusCtx.focus,
	};
};
