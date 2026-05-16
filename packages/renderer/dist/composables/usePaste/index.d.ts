import { type MaybeRefOrGetter } from 'vue';
import { type Stop } from '../_internal/index.ts';
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
export declare const usePaste: (handler: PasteHandler, options?: UsePasteOptions) => Stop;
//# sourceMappingURL=index.d.ts.map