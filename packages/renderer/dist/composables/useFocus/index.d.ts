import { type ComputedRef, type MaybeRefOrGetter } from 'vue';
export interface UseFocusOptions {
    /**
     * Whether the entry participates in tab cycling and accepts focus. Accepts a
     * ref, a getter, or a plain boolean. Defaults to `true`.
     */
    isActive?: MaybeRefOrGetter<boolean>;
    /**
     * Claim focus on mount if no other focusable is currently active.
     */
    autoFocus?: boolean;
    /**
     * Stable id. Provide it when you need to call `focus(id)` from elsewhere;
     * a random id is generated otherwise.
     */
    id?: string;
}
export interface UseFocusReturn {
    isFocused: ComputedRef<boolean>;
    focus: (id: string) => void;
}
/**
 * Register the current component as a focusable target in the focus manager.
 * Returns a `isFocused` computed that flips when this entry becomes active,
 * plus a `focus(id)` helper to programmatically move focus elsewhere.
 *
 * Tab and Shift+Tab cycle through active entries in mount order. Entries are
 * automatically deregistered when the surrounding scope is disposed.
 */
export declare const useFocus: (options?: UseFocusOptions) => UseFocusReturn;
//# sourceMappingURL=index.d.ts.map