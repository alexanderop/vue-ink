import { APP_CONTEXT_KEY } from "../../context.js";
import { requireContext } from "../_internal/index.js";
/**
 * Access the app instance from inside a component mounted via `render()`.
 *
 * Returns `{ exit, waitUntilRenderFlush }`. Calling `exit()` unmounts the app
 * and resolves any pending `waitUntilExit()` promise; passing an `Error`
 * rejects it instead.
 */
export const useApp = () => requireContext(APP_CONTEXT_KEY, 'useApp()');
//# sourceMappingURL=index.js.map