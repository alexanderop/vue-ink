import { type MaybeRefOrGetter } from 'vue';
import type { EventEmitter } from 'node:events';
export type UseEmitterListenerOptions = {
    /**
     * Whether the listener is currently attached. Accepts a ref, a getter, or a
     * plain boolean. Defaults to `true`.
     */
    isActive?: MaybeRefOrGetter<boolean>;
    /**
     * Side effects to run when the listener attaches (e.g. enable raw mode).
     * Returns a teardown fn invoked on detach.
     */
    onAttach?: () => void;
    onDetach?: () => void;
};
export type Stop = () => void;
export declare const useEmitterListener: (emitter: EventEmitter, event: string, listener: (...args: unknown[]) => void, options?: UseEmitterListenerOptions) => Stop;
//# sourceMappingURL=use-emitter-listener.d.ts.map