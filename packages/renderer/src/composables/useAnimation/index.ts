import {
	computed,
	shallowRef,
	toValue,
	watch,
	type MaybeRefOrGetter,
	type ShallowRef,
} from 'vue';
import { ANIMATION_CONTEXT_KEY } from '../../context.ts';
import { requireContext, tryOnScopeDispose } from '../_internal/index.ts';

const DEFAULT_INTERVAL = 100;
// `setTimeout`'s upper bound — clamp so a Number.POSITIVE_INFINITY or other
// extreme value doesn't silently fire on the next tick.
const MAX_TIMER_INTERVAL = 2_147_483_647;

const normalizeInterval = (interval: number): number => {
	if (!Number.isFinite(interval)) return DEFAULT_INTERVAL;
	return Math.min(MAX_TIMER_INTERVAL, Math.max(1, interval));
};

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
 * Ink-compat alias for {@link UseAnimationReturn}. Lets porters keep
 * `import type { AnimationResult } from 'vue-ink'` working unchanged.
 */
export type AnimationResult = UseAnimationReturn;

/**
 * Drive an animation off the shared renderer timer. Returns reactive
 * `frame`/`time`/`delta` refs plus a `reset()` action. Multiple consumers
 * coalesce into a single underlying scheduler so spinners and progress bars
 * never each pay for their own setInterval.
 */
export const useAnimation = (options: UseAnimationOptions = {}): UseAnimationReturn => {
	const ctx = requireContext(ANIMATION_CONTEXT_KEY, 'useAnimation()');

	const frame = shallowRef(0);
	const time = shallowRef(0);
	const delta = shallowRef(0);

	const interval = computed(() => normalizeInterval(toValue(options.interval ?? DEFAULT_INTERVAL)));
	const isActive = computed(() => toValue(options.isActive ?? true) !== false);

	let unsubscribe: (() => void) | undefined;
	let startTime = 0;
	let lastRenderTime = 0;
	let nextRenderTime = 0;

	const stop = (): void => {
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = undefined;
		}
	};

	const resetState = (): void => {
		frame.value = 0;
		time.value = 0;
		delta.value = 0;
	};

	const start = (): void => {
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

	if (isActive.value) start();

	// Re-anchor on `isActive` flips and on interval changes — both invalidate
	// the prior tick cadence.
	watch(
		[isActive, interval],
		([active]) => {
			if (active) start();
			else {
				stop();
				resetState();
			}
		},
		{ flush: 'sync' },
	);

	tryOnScopeDispose(stop);

	const reset = (): void => {
		if (isActive.value) start();
		else resetState();
	};

	return { frame, time, delta, reset };
};
