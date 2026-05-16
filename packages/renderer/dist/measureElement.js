const isDOMElement = (value) => {
    if (typeof value !== 'object' || value === null)
        return false;
    const name = value.nodeName;
    return name === 'ink-box' || name === 'ink-root';
};
const resolveElement = (target) => {
    if (target === null || target === undefined)
        return null;
    if (isDOMElement(target))
        return target;
    const inner = target.$element;
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
export const measureElement = (target) => {
    const element = resolveElement(target);
    const layout = element?.yogaNode?.getComputedLayout();
    return {
        width: layout?.width ?? 0,
        height: layout?.height ?? 0,
    };
};
//# sourceMappingURL=measureElement.js.map