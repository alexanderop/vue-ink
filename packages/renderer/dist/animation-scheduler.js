// One shared timer drives every `useAnimation()` subscriber. Walking due
// subscribers from a single wake-up is cheaper than scheduling N intervals,
// and it lets the renderer skip ticks that land inside the throttle window.
// Mirrors ink's `repos/ink/src/components/App.tsx` scheduler — we only diverge
// where Vue's lifecycle differs from React's.
export const createAnimationScheduler = () => {
    const subscribers = new Map();
    let timer;
    let destroyed = false;
    const clearTimer = () => {
        if (timer === undefined)
            return;
        clearTimeout(timer);
        timer = undefined;
    };
    const scheduleTick = () => {
        clearTimer();
        if (destroyed || subscribers.size === 0)
            return;
        let nextDueTime = Number.POSITIVE_INFINITY;
        for (const sub of subscribers.values()) {
            if (sub.nextDueTime < nextDueTime)
                ({ nextDueTime } = sub);
        }
        const delay = Math.max(0, nextDueTime - Date.now());
        timer = setTimeout(() => {
            timer = undefined;
            if (destroyed)
                return;
            const currentTime = Date.now();
            for (const sub of subscribers.values()) {
                if (currentTime < sub.nextDueTime)
                    continue;
                sub.callback(currentTime);
                // Advance from elapsed time, not callback count, so a delayed
                // tick catches up instead of stretching the timeline.
                const elapsed = currentTime - sub.startTime;
                const elapsedFrames = Math.floor(elapsed / sub.interval) + 1;
                sub.nextDueTime = sub.startTime + elapsedFrames * sub.interval;
            }
            scheduleTick();
        }, delay);
        // Don't keep the loop alive just to drive animations.
        timer.unref?.();
    };
    const subscribe = (callback, interval) => {
        if (destroyed) {
            return { startTime: Date.now(), unsubscribe: () => { } };
        }
        const startTime = Date.now();
        subscribers.set(callback, {
            callback,
            interval,
            startTime,
            nextDueTime: startTime + interval,
        });
        scheduleTick();
        return {
            startTime,
            unsubscribe: () => {
                if (!subscribers.delete(callback))
                    return;
                if (subscribers.size === 0)
                    clearTimer();
                else
                    scheduleTick();
            },
        };
    };
    const destroy = () => {
        destroyed = true;
        subscribers.clear();
        clearTimer();
    };
    return { subscribe, destroy };
};
//# sourceMappingURL=animation-scheduler.js.map