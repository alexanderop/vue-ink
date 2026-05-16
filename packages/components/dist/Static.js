import { defineComponent, h } from 'vue';
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
const Static = defineComponent({
    name: 'Static',
    props: {
        items: { type: Array, required: true },
        style: { type: Object, default: undefined },
    },
    setup(props, { slots }) {
        return () => {
            const renderSlot = slots.default;
            const children = props.items.map((item, i) => {
                const slotResult = renderSlot?.({ item, index: i });
                // Vue normalizes slot return values to VNode[]; pick the first.
                return slotResult?.[0] ?? h('ink-text');
            });
            const style = {
                position: 'absolute',
                flexDirection: 'column',
                ...props.style,
            };
            return h('ink-box', { style, internal_static: true }, children);
        };
    },
});
export default Static;
//# sourceMappingURL=Static.js.map