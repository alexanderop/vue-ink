import { ACCESSIBILITY_CONTEXT_KEY } from "../../context.js";
import { requireContext } from "../_internal/index.js";
/**
 * Reactive boolean reflecting whether a screen reader is active.
 *
 * Components can read this to render descriptive text instead of decoration —
 * e.g. swap an ASCII spinner for the string "loading…".
 */
export const useIsScreenReaderEnabled = () => requireContext(ACCESSIBILITY_CONTEXT_KEY, 'useIsScreenReaderEnabled()')
    .isScreenReaderEnabled;
//# sourceMappingURL=index.js.map