import { STDIN_CONTEXT_KEY } from "../../context.js";
import { requireContext, useEmitterListener, } from "../_internal/index.js";
/**
 * Subscribe to keystrokes from stdin. The handler receives the parsed input
 * and a structured {@link Key} record (`arrow`, `tab`, `ctrl`, …).
 *
 * Returns a `stop()` function to detach imperatively; the listener also
 * detaches automatically when the surrounding effect scope is disposed.
 *
 * Requires a TTY stdin that supports raw mode. Throws otherwise — pipe input
 * does not deliver structured key events.
 */
export const useInput = (handler, options = {}) => {
    const { setRawMode, emitter, isRawModeSupported } = requireContext(STDIN_CONTEXT_KEY, 'useInput()');
    if (!isRawModeSupported) {
        throw new Error('useInput() requires a TTY stdin that supports raw mode. Pipe input is not supported.');
    }
    return useEmitterListener(emitter, 'input', 
    // Emitter args are (input, key); narrow back to the handler signature.
    (...args) => handler(args[0], args[1]), {
        isActive: options.isActive,
        onAttach: () => setRawMode(true),
        onDetach: () => setRawMode(false),
    });
};
//# sourceMappingURL=index.js.map