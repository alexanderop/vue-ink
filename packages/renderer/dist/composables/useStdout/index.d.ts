import { type StdoutContext } from '../../context.ts';
/**
 * Access stdout from inside a component mounted via `render()`.
 *
 * `write(data)` erases the current frame, writes the data, then repaints —
 * so logs land above the live UI without smearing it.
 */
export declare const useStdout: () => StdoutContext;
//# sourceMappingURL=index.d.ts.map