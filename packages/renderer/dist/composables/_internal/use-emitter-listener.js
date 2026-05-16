import { computed, toValue, watch } from 'vue';
import { tryOnScopeDispose } from "./try-on-scope-dispose.js";
// Attach an emitter listener with a reactive `isActive` gate and automatic
// teardown when the surrounding effect scope is disposed. Returns a manual
// `stop()` for imperative callers.
export const useEmitterListener = (emitter, event, listener, options = {}) => {
    const isActive = computed(() => toValue(options.isActive ?? true) !== false);
    let attached = false;
    const attach = () => {
        if (attached)
            return;
        options.onAttach?.();
        emitter.on(event, listener);
        attached = true;
    };
    const detach = () => {
        if (!attached)
            return;
        emitter.off(event, listener);
        options.onDetach?.();
        attached = false;
    };
    const stopWatcher = watch(isActive, (value) => {
        if (value)
            attach();
        else
            detach();
    }, { immediate: true });
    const stop = () => {
        stopWatcher();
        detach();
    };
    tryOnScopeDispose(stop);
    return stop;
};
//# sourceMappingURL=use-emitter-listener.js.map