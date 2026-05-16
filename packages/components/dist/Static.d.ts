import { type PropType, type VNode } from 'vue';
import type { Styles } from '@vue-ink/core';
export type StaticProps = {
    items: unknown[];
    style?: Styles;
};
export type StaticSlotArgs<T = unknown> = {
    item: T;
    index: number;
};
/**
 * `<Static>` renders items above the live frame and never repaints them, so
 * they survive as scrollback history. Use it for completed work — log lines,
 * finished tests, generated pages — anywhere a long-running tool would
 * otherwise lose context to the live UI.
 *
 * Items are written to scrollback once; the renderer detects already-emitted
 * items by comparing the static subtree's output against the last paint and
 * appending only the new suffix. Append-only mutations are well supported;
 * mutating earlier items in place will re-emit everything from that point.
 *
 * The slot receives an object `{ item, index }`.
 */
declare const Static: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    items: {
        type: PropType<unknown[]>;
        required: true;
    };
    style: {
        type: PropType<Styles>;
        default: undefined;
    };
}>, () => VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    items: {
        type: PropType<unknown[]>;
        required: true;
    };
    style: {
        type: PropType<Styles>;
        default: undefined;
    };
}>> & Readonly<{}>, {
    style: Styles;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default Static;
//# sourceMappingURL=Static.d.ts.map