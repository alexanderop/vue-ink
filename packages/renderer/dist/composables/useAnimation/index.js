import { computed, shallowRef, toValue, watch, } from 'vue';
import { ANIMATION_CONTEXT_KEY } from "../../context.js";
import { requireContext, tryOnScopeDispose } from "../_internal/index.js";
const DEFAULT_INTERVAL = 100;
// `setTimeout`'s upper bound — clamp so a Number.POSITIVE_INFINITY or other
// extreme value doesn't silently fire on the next tick.
const MAX_TIMER_INTERVAL = 2_147_483_647;
const normalizeInterval = (interval) => {
    if (!Number.isFinite(interval))
        return DEFAULT_INTERVAL;
    return Math.min(MAX_TIMER_INTERVAL, Math.max(1, interval));
};
/**
 * Drive an animation off the shared renderer timer. Returns reactive
 * `frame`/`time`/`delta` refs plus a `reset()` action. Multiple consumers
 * coalesce into a single underlying scheduler so spinners and progress bars
 * never each pay for their own setInterval.
 */
export const useAnimation = (options = {}) => {
    const ctx = requireContext(ANIMATION_CONTEXT_KEY, 'useAnimation()');
    const frame = shallowRef(0);
    const time = shallowRef(0);
    const delta = shallowRef(0);
    const interval = computed(() => normalizeInterval(toValue(options.interval ?? DEFAULT_INTERVAL)));
    const isActive = computed(() => toValue(options.isActive ?? true) !== false);
    let unsubscribe;
    let startTime = 0;
    let lastRenderTime = 0;
    let nextRenderTime = 0;
    const stop = () => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = undefined;
        }
    };
    const resetState = () => {
        frame.value = 0;
        time.value = 0;
        delta.value = 0;
    };
    const start = () => {
        stop();
        resetState();
        const sub = ctx.subscribe((currentTime) => {
            if (ctx.renderThrottleMs > 0 && currentTime < nextRenderTime) {
                // Inside the throttle window — coalesce with the next allowed tick.
                return;
            }
            const elapsed = currentTime - startTime;
            const nextDelta = currentTime - lastRenderTime;
            lastRenderTime = currentTime;
            nextRenderTime = currentTime + ctx.renderThrottleMs;
            frame.value = Math.floor(elapsed / interval.value);
            time.value = elapsed;
            delta.value = nextDelta;
        }, interval.value);
        ({ startTime } = sub);
        lastRenderTime = sub.startTime;
        nextRenderTime = startTime + ctx.renderThrottleMs;
        ({ unsubscribe } = sub);
    };
    if (isActive.value)
        start();
    // Re-anchor on `isActive` flips and on interval changes — both invalidate
    // the prior tick cadence.
    watch([isActive, interval], ([active]) => {
        if (active)
            start();
        else {
            stop();
            resetState();
        }
    }, { flush: 'sync' });
    tryOnScopeDispose(stop);
    const reset = () => {
        if (isActive.value)
            start();
        else
            resetState();
    };
    return { frame, time, delta, reset };
};
//# sourceMappingURL=index.js.map