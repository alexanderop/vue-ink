import { inject } from 'vue';
export const requireContext = (key, callSite) => {
    const ctx = inject(key);
    if (!ctx) {
        throw new Error(`${callSite} must be called inside a component mounted via vue-ink render().`);
    }
    return ctx;
};
//# sourceMappingURL=require-context.js.map