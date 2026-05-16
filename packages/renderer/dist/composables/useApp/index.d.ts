import { type AppContext } from '../../context.ts';
/**
 * Access the app instance from inside a component mounted via `render()`.
 *
 * Returns `{ exit, waitUntilRenderFlush }`. Calling `exit()` unmounts the app
 * and resolves any pending `waitUntilExit()` promise; passing an `Error`
 * rejects it instead.
 */
export declare const useApp: () => AppContext;
//# sourceMappingURL=index.d.ts.map