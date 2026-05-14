import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { EventEmitter } from 'node:events';
import { tryOnScopeDispose } from './try-on-scope-dispose.ts';

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

// Attach an emitter listener with a reactive `isActive` gate and automatic
// teardown when the surrounding effect scope is disposed. Returns a manual
// `stop()` for imperative callers.
export const useEmitterListener = (
	emitter: EventEmitter,
	event: string,
	listener: (...args: unknown[]) => void,
	options: UseEmitterListenerOptions = {},
): Stop => {
	const isActive = computed(() => toValue(options.isActive ?? true) !== false);

	let attached = false;
	const attach = (): void => {
		if (attached) return;
		options.onAttach?.();
		emitter.on(event, listener);
		attached = true;
	};
	const detach = (): void => {
		if (!attached) return;
		emitter.off(event, listener);
		options.onDetach?.();
		attached = false;
	};

	const stopWatcher = watch(
		isActive,
		(value) => {
			if (value) attach();
			else detach();
		},
		{ immediate: true },
	);

	const stop: Stop = () => {
		stopWatcher();
		detach();
	};

	tryOnScopeDispose(stop);
	return stop;
};
