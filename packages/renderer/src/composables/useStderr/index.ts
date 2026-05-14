import { STDERR_CONTEXT_KEY, type StderrContext } from '../../context.ts';
import { requireContext } from '../_internal/index.ts';

/**
 * Access stderr from inside a component mounted via `render()`.
 *
 * `write(data)` erases the current frame, writes to stderr, then repaints —
 * so error logs land above the live UI without smearing it.
 */
export const useStderr = (): StderrContext =>
	requireContext(STDERR_CONTEXT_KEY, 'useStderr()');
