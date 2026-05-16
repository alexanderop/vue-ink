import { FOCUS_CONTEXT_KEY } from "../../context.js";
import { requireContext } from "../_internal/index.js";
/**
 * Programmatic access to the focus manager — switch focus by id, cycle
 * forward/backward, and toggle the manager on or off entirely.
 *
 * Sibling to {@link useFocus}, which registers an individual focusable.
 */
export const useFocusManager = () => {
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
//# sourceMappingURL=index.js.map