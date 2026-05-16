import { STDIN_CONTEXT_KEY } from "../../context.js";
import { requireContext } from "../_internal/index.js";
/**
 * Access stdin and the raw-mode controls from inside a component mounted via
 * `render()`. Hides the internal emitter; subscribe via {@link useInput} or
 * {@link usePaste} instead.
 */
export const useStdin = () => {
    const ctx = requireContext(STDIN_CONTEXT_KEY, 'useStdin()');
    const { stdin, isRawModeSupported, setRawMode, setBracketedPasteMode } = ctx;
    return { stdin, isRawModeSupported, setRawMode, setBracketedPasteMode };
};
//# sourceMappingURL=index.js.map