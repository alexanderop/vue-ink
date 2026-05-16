import { STDOUT_CONTEXT_KEY } from "../../context.js";
import { requireContext } from "../_internal/index.js";
/**
 * Access stdout from inside a component mounted via `render()`.
 *
 * `write(data)` erases the current frame, writes the data, then repaints —
 * so logs land above the live UI without smearing it.
 */
export const useStdout = () => requireContext(STDOUT_CONTEXT_KEY, 'useStdout()');
//# sourceMappingURL=index.js.map