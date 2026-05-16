import { type StderrContext } from '../../context.ts';
/**
 * Access stderr from inside a component mounted via `render()`.
 *
 * `write(data)` erases the current frame, writes to stderr, then repaints —
 * so error logs land above the live UI without smearing it.
 */
export declare const useStderr: () => StderrContext;
//# sourceMappingURL=index.d.ts.map