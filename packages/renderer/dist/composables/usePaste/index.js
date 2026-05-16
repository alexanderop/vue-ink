import { STDIN_CONTEXT_KEY } from "../../context.js";
import { requireContext, useEmitterListener, } from "../_internal/index.js";
/**
 * Subscribe to bracketed-paste events. The handler receives the entire pasted
 * text as a single string — `useInput` does not fire for paste content.
 *
 * Returns a `stop()` to detach imperatively; also detaches on scope dispose.
 * Requires a TTY stdin that supports raw mode.
 */
export const usePaste = (handler, options = {}) => {
    const { setRawMode, setBracketedPasteMode, emitter, isRawModeSupported } = requireContext(STDIN_CONTEXT_KEY, 'usePaste()');
    if (!isRawModeSupported) {
        throw new Error('usePaste() requires a TTY stdin that supports raw mode. Pipe input is not supported.');
    }
    return useEmitterListener(emitter, 'paste', (...args) => handler(args[0]), {
        isActive: options.isActive,
        onAttach: () => {
            setRawMode(true);
            setBracketedPasteMode(true);
        },
        onDetach: () => {
            setBracketedPasteMode(false);
            setRawMode(false);
        },
    });
};
//# sourceMappingURL=index.js.map