import { type MaybeRefOrGetter, type ShallowRef } from 'vue';
export interface UseAnimationOptions {
    /**
     * Time between ticks in milliseconds. Defaults to 100.
     */
    interval?: MaybeRefOrGetter<number>;
    /**
     * Whether the animation is running. When toggled false → true, frame/time
     * reset to zero. Defaults to `true`.
     */
    isActive?: MaybeRefOrGetter<boolean>;
}
export interface UseAnimationReturn {
    /** Discrete counter incrementing once per interval. */
    readonly frame: ShallowRef<number>;
    /** Total elapsed time in ms since the animation started or was last reset. */
    readonly time: ShallowRef<number>;
    /** Time in ms since the previously rendered tick — accounts for skipped ticks. */
    readonly delta: ShallowRef<number>;
    /** Reset frame/time/delta to 0 and restart timing from the current moment. */
    readonly reset: () => void;
}
/**
 * Drive an animation off the shared renderer timer. Returns reactive
 * `frame`/`time`/`delta` refs plus a `reset()` action. Multiple consumers
 * coalesce into a single underlying scheduler so spinners and progress bars
 * never each pay for their own setInterval.
 */
export declare const useAnimation: (options?: UseAnimationOptions) => UseAnimationReturn;
//# sourceMappingURL=index.d.ts.map