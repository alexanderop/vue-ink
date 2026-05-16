import { getCurrentScope, onScopeDispose } from 'vue';
// Mirrors VueUse's helper. Lets a composable register teardown without
// requiring a component lifecycle — works inside any active effect scope
// (real component, manual `effectScope()`, tests, etc.).
export const tryOnScopeDispose = (fn) => {
    if (getCurrentScope()) {
        onScopeDispose(fn);
        return true;
    }
    return false;
};
//# sourceMappingURL=try-on-scope-dispose.js.map