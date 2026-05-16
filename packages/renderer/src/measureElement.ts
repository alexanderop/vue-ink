import type { DOMElement } from '@vue-ink/core';
import type { BoxMetricsTarget } from './composables/useBoxMetrics/index.ts';

export type MeasureElementOutput = {
	/** Element width in character cells. `0` if the element hasn't been measured yet. */
	width: number;
	/** Element height in character cells. `0` if the element hasn't been measured yet. */
	height: number;
};

const isDOMElement = (value: unknown): value is DOMElement => {
	if (typeof value !== 'object' || value === null) return false;
	const name = (value as { nodeName?: unknown }).nodeName;
	return name === 'ink-box' || name === 'ink-root';
};

const resolveElement = (target: unknown): DOMElement | null => {
	if (target === null || target === undefined) return null;
	if (isDOMElement(target)) return target;
	const inner = (target as { $element?: unknown }).$element;
	return isDOMElement(inner) ? inner : null;
};

/**
 * Read the layout metrics of a `<Box>` element synchronously, without
 * subscribing to layout commits. Use this in event handlers, timers, or
 * other one-shot reads where the reactive {@link useBoxMetrics} would
 * allocate an unnecessary watcher.
 *
 * Returns `{ width: 0, height: 0 }` when the ref is detached or the
 * element hasn't been measured yet (e.g. during the very first render
 * pass before Yoga has computed the layout).
 *
 * Accepts the same shapes as `useBoxMetrics`: a raw `ink-box` DOMElement,
 * the `Box`-exposed `{ $element }` proxy, or `null`/`undefined`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTemplateRef } from 'vue';
 * import { Box, useInput, measureElement } from 'vueink';
 *
 * const boxRef = useTemplateRef('box');
 * useInput((_input, key) => {
 *   if (key.return) {
 *     const { width, height } = measureElement(boxRef.value);
 *     console.log(`Box is ${width}x${height}`);
 *   }
 * });
 * </script>
 *
 * <template>
 *   <Box ref="box" width={20}>...</Box>
 * </template>
 * ```
 */
export const measureElement = (
	target: BoxMetricsTarget,
): MeasureElementOutput => {
	const element = resolveElement(target);
	const layout = element?.yogaNode?.getComputedLayout();
	return {
		width: layout?.width ?? 0,
		height: layout?.height ?? 0,
	};
};
