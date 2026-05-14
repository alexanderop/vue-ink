import type { Ref } from 'vue';
import { FOCUS_CONTEXT_KEY, type FocusContext } from '../../context.ts';
import { requireContext } from '../_internal/index.ts';

export interface UseFocusManagerReturn {
	activeId: Ref<string | undefined>;
	focus: FocusContext['focus'];
	focusNext: FocusContext['focusNext'];
	focusPrevious: FocusContext['focusPrevious'];
	enableFocus: FocusContext['enableFocus'];
	disableFocus: FocusContext['disableFocus'];
}

/**
 * Programmatic access to the focus manager — switch focus by id, cycle
 * forward/backward, and toggle the manager on or off entirely.
 *
 * Sibling to {@link useFocus}, which registers an individual focusable.
 */
export const useFocusManager = (): UseFocusManagerReturn => {
	const focusCtx = requireContext(FOCUS_CONTEXT_KEY, 'useFocusManager()');
	return {
		activeId: focusCtx.activeId,
		focus: focusCtx.focus,
		focusNext: focusCtx.focusNext,
		focusPrevious: focusCtx.focusPrevious,
		enableFocus: focusCtx.enableFocus,
		disableFocus: focusCtx.disableFocus,
	};
};
