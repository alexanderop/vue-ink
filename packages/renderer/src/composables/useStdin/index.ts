import { STDIN_CONTEXT_KEY, type StdinContext } from '../../context.ts';
import { requireContext } from '../_internal/index.ts';

export type UseStdinReturn = {
	stdin: NodeJS.ReadStream;
	isRawModeSupported: boolean;
	setRawMode: (enable: boolean) => void;
	setBracketedPasteMode: (enable: boolean) => void;
};

/**
 * Access stdin and the raw-mode controls from inside a component mounted via
 * `render()`. Hides the internal emitter; subscribe via {@link useInput} or
 * {@link usePaste} instead.
 */
export const useStdin = (): UseStdinReturn => {
	const ctx: StdinContext = requireContext(STDIN_CONTEXT_KEY, 'useStdin()');
	const { stdin, isRawModeSupported, setRawMode, setBracketedPasteMode } = ctx;
	return { stdin, isRawModeSupported, setRawMode, setBracketedPasteMode };
};
