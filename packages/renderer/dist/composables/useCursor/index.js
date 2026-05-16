import { CURSOR_CONTEXT_KEY } from "../../context.js";
import { requireContext, tryOnScopeDispose } from "../_internal/index.js";
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
export const useCursor = () => {
    const ctx = requireContext(CURSOR_CONTEXT_KEY, 'useCursor()');
    let claimed = false;
    const setCursorPosition = (position) => {
        ctx.setCursorPosition(position);
        claimed = true;
    };
    tryOnScopeDispose(() => {
        if (claimed)
            ctx.setCursorPosition(undefined);
    });
    return { setCursorPosition };
};
//# sourceMappingURL=index.js.map