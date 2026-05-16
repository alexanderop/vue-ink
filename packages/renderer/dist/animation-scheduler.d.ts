import type { AnimationSubscription, AnimationTickCallback } from './context.ts';
export type AnimationScheduler = {
    subscribe: (callback: AnimationTickCallback, interval: number) => AnimationSubscription;
    destroy: () => void;
};
export declare const createAnimationScheduler: () => AnimationScheduler;
//# sourceMappingURL=animation-scheduler.d.ts.map