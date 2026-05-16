import { type MaybeRefOrGetter } from 'vue';
import { STDIN_CONTEXT_KEY } from '../../context.ts';
import {
	requireContext,
	useEmitterListener,
	type Stop,
} from '../_internal/index.ts';

export type PasteHandler = (text: string) => void;

export interface UsePasteOptions {
	/**
	 * Whether the handler is currently attached. Accepts a ref, a getter, or a
	 * plain boolean. Defaults to `true`.
	 */
	isActive?: MaybeRefOrGetter<boolean>;
}

/**
 * Subscribe to bracketed-paste events. The handler receives the entire pasted
 * text as a single string — `useInput` does not fire for paste content.
 *
 * Returns a `stop()` to detach imperatively; also detaches on scope dispose.
 * Requires a TTY stdin that supports raw mode.
 */
export const usePaste = (
	handler: PasteHandler,
	options: UsePasteOptions = {},
): Stop => {
	const { setRawMode, setBracketedPasteMode, emitter, isRawModeSupported } =
		requireContext(STDIN_CONTEXT_KEY, 'usePaste()');

	return useEmitterListener(
		emitter,
		'paste',
		(...args: unknown[]) => handler(args[0] as string),
		{
			isActive: options.isActive,
			// Defer the raw-mode requirement until the listener would actually
			// attach. Matches ink: `usePaste(h, { isActive: false })` is a no-op
			// on non-TTY stdin instead of throwing.
			onAttach: () => {
				if (!isRawModeSupported) {
					throw new Error(
						'usePaste() requires a TTY stdin that supports raw mode. Pipe input is not supported.',
					);
				}
				setRawMode(true);
				setBracketedPasteMode(true);
			},
			onDetach: () => {
				setBracketedPasteMode(false);
				setRawMode(false);
			},
		},
	);
};
