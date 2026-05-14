import { type Ref } from 'vue';
import { ACCESSIBILITY_CONTEXT_KEY } from '../../context.ts';
import { requireContext } from '../_internal/index.ts';

/**
 * Reactive boolean reflecting whether a screen reader is active.
 *
 * Components can read this to render descriptive text instead of decoration —
 * e.g. swap an ASCII spinner for the string "loading…".
 */
export const useIsScreenReaderEnabled = (): Ref<boolean> =>
	requireContext(ACCESSIBILITY_CONTEXT_KEY, 'useIsScreenReaderEnabled()')
		.isScreenReaderEnabled;
