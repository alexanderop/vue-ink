import { type MaybeRefOrGetter } from 'vue';
import { STDIN_CONTEXT_KEY } from '../../context.ts';
import type { Key } from '../../input.ts';
import {
	requireContext,
	useEmitterListener,
	type Stop,
} from '../_internal/index.ts';

export type InputHandler = (input: string, key: Key) => void;

export interface UseInputOptions {
	/**
	 * Whether the handler is currently attached. Accepts a ref, a getter, or a
	 * plain boolean. Defaults to `true`.
	 */
	isActive?: MaybeRefOrGetter<boolean>;
}

/**
 * Subscribe to keystrokes from stdin. The handler receives the parsed input
 * and a structured {@link Key} record (`arrow`, `tab`, `ctrl`, …).
 *
 * Returns a `stop()` function to detach imperatively; the listener also
 * detaches automatically when the surrounding effect scope is disposed.
 *
 * Requires a TTY stdin that supports raw mode. Throws otherwise — pipe input
 * does not deliver structured key events.
 */
export const useInput = (handler: InputHandler, options: UseInputOptions = {}): Stop => {
	const { setRawMode, emitter, isRawModeSupported } = requireContext(
		STDIN_CONTEXT_KEY,
		'useInput()',
	);
	if (!isRawModeSupported) {
		throw new Error(
			'useInput() requires a TTY stdin that supports raw mode. Pipe input is not supported.',
		);
	}

	return useEmitterListener(
		emitter,
		'input',
		// Emitter args are (input, key); narrow back to the handler signature.
		(...args: unknown[]) => handler(args[0] as string, args[1] as Key),
		{
			isActive: options.isActive,
			onAttach: () => setRawMode(true),
			onDetach: () => setRawMode(false),
		},
	);
};

export type { Key };
