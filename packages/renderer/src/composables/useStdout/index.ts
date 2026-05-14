import { STDOUT_CONTEXT_KEY, type StdoutContext } from '../../context.ts';
import { requireContext } from '../_internal/index.ts';

/**
 * Access stdout from inside a component mounted via `render()`.
 *
 * `write(data)` erases the current frame, writes the data, then repaints —
 * so logs land above the live UI without smearing it.
 */
export const useStdout = (): StdoutContext =>
	requireContext(STDOUT_CONTEXT_KEY, 'useStdout()');
