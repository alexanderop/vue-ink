import { CURSOR_CONTEXT_KEY } from '../../context.ts';
import { requireContext, tryOnScopeDispose } from '../_internal/index.ts';

export type CursorPosition = {
	x: number;
	y: number;
};

export interface UseCursorReturn {
	setCursorPosition: (position: CursorPosition | undefined) => void;
}

/**
 * Position the terminal cursor at a coordinate relative to the live frame
 * origin. Setting a position makes the cursor visible at the requested cell;
 * passing `undefined` hides it. Useful for IME (Input Method Editor) anchoring
 * and inline-caret affordances inside text-input components.
 *
 * Multiple consumers can call `setCursorPosition` — the renderer uses the most
 * recent value at paint time. When the surrounding scope is disposed the
 * cursor reverts to hidden, so a child component owning the cursor cleans up
 * without the parent having to track it.
 */
export const useCursor = (): UseCursorReturn => {
	const ctx = requireContext(CURSOR_CONTEXT_KEY, 'useCursor()');

	let claimed = false;

	const setCursorPosition = (position: CursorPosition | undefined): void => {
		ctx.setCursorPosition(position);
		claimed = true;
	};

	tryOnScopeDispose(() => {
		if (claimed) ctx.setCursorPosition(undefined);
	});

	return { setCursorPosition };
};
