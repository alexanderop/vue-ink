import { APP_CONTEXT_KEY, type AppContext } from '../../context.ts';
import { requireContext } from '../_internal/index.ts';

/**
 * Access the app instance from inside a component mounted via `render()`.
 *
 * Returns `{ exit, waitUntilRenderFlush }`. Calling `exit()` unmounts the app
 * and resolves any pending `waitUntilExit()` promise; passing an `Error`
 * rejects it instead.
 */
export const useApp = (): AppContext => requireContext(APP_CONTEXT_KEY, 'useApp()');
