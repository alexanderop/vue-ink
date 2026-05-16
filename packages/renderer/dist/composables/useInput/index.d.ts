import { type MaybeRefOrGetter } from 'vue';
import type { Key } from '../../input.ts';
import { type Stop } from '../_internal/index.ts';
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
export declare const useInput: (handler: InputHandler, options?: UseInputOptions) => Stop;
export type { Key };
//# sourceMappingURL=index.d.ts.map