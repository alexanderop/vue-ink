import { shallowRef, toValue, watch, } from 'vue';
import { addLayoutListener, } from '@vue-ink/core';
import { useStdout } from "../useStdout/index.js";
import { tryOnScopeDispose } from "../_internal/index.js";
const isDOMElement = (value) => {
    if (typeof value !== 'object' || value === null)
        return false;
    const name = value.nodeName;
    return name === 'ink-box' || name === 'ink-root';
};
// Vue 3 sets a template ref placed on a component to the component's expose
// proxy, not the underlying DOM node. We accept either shape so users get
// the idiomatic experience whether they bind the ref to `<Box>` (proxy with
// `$element`) or to `<ink-box>` directly (DOMElement).
const resolveElement = (target) => {
    if (target === null || target === undefined)
        return null;
    if (isDOMElement(target))
        return target;
    const inner = target.$element;
    return isDOMElement(inner) ? inner : null;
};
const findRootNode = (node) => {
    let cursor = node;
    while (cursor) {
        if (cursor.nodeName === 'ink-root')
            return cursor;
        cursor = cursor.parentNode ?? null;
    }
    return null;
};
/**
 * Track the layout metrics of a `Box` element. Values update after every
 * layout commit (mount, sibling changes, resize) and stay frozen at
 * `0,0,0,0,false` while the tracked ref is detached.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTemplateRef } from 'vue';
 * import { Box, Text, useBoxMetrics } from 'vueink';
 *
 * const boxRef = useTemplateRef('box');
 * const { width, height, hasMeasured } = useBoxMetrics(boxRef);
 * </script>
 *
 * <template>
 *   <Box ref="box">
 *     <Text v-if="hasMeasured">{{ width }}x{{ height }}</Text>
 *     <Text v-else>Measuring…</Text>
 *   </Box>
 * </template>
 * ```
 */
const writeIfChanged = (target, next) => {
    if (target.value === next)
        return;
    // eslint-disable-next-line no-param-reassign -- ShallowRef.value is the documented setter
    target.value = next;
};
export const useBoxMetrics = (target) => {
    const { stdout } = useStdout();
    const width = shallowRef(0);
    const height = shallowRef(0);
    const left = shallowRef(0);
    const top = shallowRef(0);
    const hasMeasured = shallowRef(false);
    const updateMetrics = () => {
        const element = resolveElement(toValue(target));
        const layout = element?.yogaNode?.getComputedLayout();
        writeIfChanged(width, layout?.width ?? 0);
        writeIfChanged(height, layout?.height ?? 0);
        writeIfChanged(left, layout?.left ?? 0);
        writeIfChanged(top, layout?.top ?? 0);
        writeIfChanged(hasMeasured, Boolean(element));
    };
    // Layout-listener handle. Re-attached whenever the tracked element
    // switches roots (in practice always the same root, but resilient to
    // portals/multi-renderer setups).
    let removeLayoutListener;
    const reattachLayoutListener = (element) => {
        removeLayoutListener?.();
        removeLayoutListener = undefined;
        const root = findRootNode(element);
        if (root) {
            removeLayoutListener = addLayoutListener(root, updateMetrics);
        }
    };
    // Watch the resolved element. `immediate` runs sync at setup time so we
    // take a first reading (zeros if nothing is attached yet). Subsequent
    // runs fire whenever the ref switches targets or its inner $element
    // flips from null → DOMElement after the first mount.
    watch(() => resolveElement(toValue(target)), (element) => {
        reattachLayoutListener(element);
        updateMetrics();
    }, { immediate: true });
    // Terminal resize doesn't go through Vue's render cycle — the renderer
    // erases + repaints synchronously in its own `resize` handler. By the
    // time we run, Yoga has already laid out for the new width.
    stdout.on('resize', updateMetrics);
    tryOnScopeDispose(() => {
        removeLayoutListener?.();
        removeLayoutListener = undefined;
        stdout.off('resize', updateMetrics);
    });
    return { width, height, left, top, hasMeasured };
};
//# sourceMappingURL=index.js.map