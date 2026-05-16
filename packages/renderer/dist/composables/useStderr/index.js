import { STDERR_CONTEXT_KEY } from "../../context.js";
import { requireContext } from "../_internal/index.js";
/**
 * Access stderr from inside a component mounted via `render()`.
 *
 * `write(data)` erases the current frame, writes to stderr, then repaints —
 * so error logs land above the live UI without smearing it.
 */
export const useStderr = () => requireContext(STDERR_CONTEXT_KEY, 'useStderr()');
//# sourceMappingURL=index.js.map