import { type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { type DOMElement } from '@vue-ink/core';
/**
 * A target accepted by {@link useBoxMetrics}. Either the underlying
 * `ink-box` DOMElement or `Box`'s exposed proxy (`{ $element }`).
 *
 * Both shapes are accepted so users can write the idiomatic Vue pattern
 * (`<Box ref="boxRef">` with `useTemplateRef`) without having to know
 * which one Vue resolves the ref to.
 */
export type BoxMetricsTarget = DOMElement | {
    readonly $element: DOMElement | null | undefined;
} | null | undefined;
export interface UseBoxMetricsReturn {
    /** Element width in character cells. */
    readonly width: ShallowRef<number>;
    /** Element height in character cells. */
    readonly height: ShallowRef<number>;
    /** Distance from the left edge of the parent in character cells. */
    readonly left: ShallowRef<number>;
    /** Distance from the top edge of the parent in character cells. */
    readonly top: ShallowRef<number>;
    /**
     * `true` after the tracked element has been measured at least once by
     * Yoga in the current commit. Flips back to `false` if the tracked
     * target detaches (unmounts or the ref is repointed to a missing node).
     */
    readonly hasMeasured: ShallowRef<boolean>;
}
export declare const useBoxMetrics: (target: MaybeRefOrGetter<BoxMetricsTarget>) => UseBoxMetricsReturn;
//# sourceMappingURL=index.d.ts.map