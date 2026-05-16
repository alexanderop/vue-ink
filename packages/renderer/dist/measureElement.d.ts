import type { BoxMetricsTarget } from './composables/useBoxMetrics/index.ts';
export type MeasureElementOutput = {
    /** Element width in character cells. `0` if the element hasn't been measured yet. */
    width: number;
    /** Element height in character cells. `0` if the element hasn't been measured yet. */
    height: number;
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
export declare const measureElement: (target: BoxMetricsTarget) => MeasureElementOutput;
//# sourceMappingURL=measureElement.d.ts.map