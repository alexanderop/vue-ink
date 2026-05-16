import { computed, toValue, watch, } from 'vue';
import { FOCUS_CONTEXT_KEY, STDIN_CONTEXT_KEY } from "../../context.js";
import { requireContext, tryOnScopeDispose, } from "../_internal/index.js";
let focusIdCounter = 0;
const generateFocusId = () => {
    focusIdCounter += 1;
    return `vi-focus-${focusIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
};
/**
 * Register the current component as a focusable target in the focus manager.
 * Returns a `isFocused` computed that flips when this entry becomes active,
 * plus a `focus(id)` helper to programmatically move focus elsewhere.
 *
 * Tab and Shift+Tab cycle through active entries in mount order. Entries are
 * automatically deregistered when the surrounding scope is disposed.
 */
export const useFocus = (options = {}) => {
    const focusCtx = requireContext(FOCUS_CONTEXT_KEY, 'useFocus()');
    const { setRawMode, isRawModeSupported } = requireContext(STDIN_CONTEXT_KEY, 'useFocus()');
    const id = options.id ?? generateFocusId();
    const autoFocus = options.autoFocus ?? false;
    focusCtx.add(id, { autoFocus });
    const isActive = computed(() => toValue(options.isActive ?? true) !== false);
    let holdingRawMode = false;
    const releaseRawMode = () => {
        if (!holdingRawMode)
            return;
        setRawMode(false);
        holdingRawMode = false;
    };
    const acquireRawMode = () => {
        if (!isRawModeSupported)
            return;
        setRawMode(true);
        holdingRawMode = true;
    };
    watch(isActive, (value) => {
        if (value) {
            focusCtx.activate(id);
            acquireRawMode();
        }
        else {
            focusCtx.deactivate(id);
            releaseRawMode();
        }
    }, { immediate: true });
    tryOnScopeDispose(() => {
        focusCtx.remove(id);
        releaseRawMode();
    });
    const isFocused = computed(() => focusCtx.activeId.value === id);
    return {
        isFocused,
        focus: focusCtx.focus,
    };
};
//# sourceMappingURL=index.js.map