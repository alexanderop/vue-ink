import { defineComponent, h, type PropType, type Slot, type VNode } from 'vue';
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
const Static = defineComponent({
	name: 'Static',
	props: {
		items: { type: Array as PropType<unknown[]>, required: true },
		style: { type: Object as PropType<Styles>, default: undefined },
	},
	setup(props, { slots }) {
		return () => {
			const renderSlot: Slot<StaticSlotArgs> | undefined = slots.default;
			const children: VNode[] = props.items.map((item, i): VNode => {
				const slotResult = renderSlot?.({ item, index: i });
				// Vue normalizes slot return values to VNode[]; pick the first.
				return slotResult?.[0] ?? h('ink-text');
			});

			const style: Styles = {
				position: 'absolute',
				flexDirection: 'column',
				...props.style,
			};

			return h('ink-box', { style, internal_static: true }, children);
		};
	},
});

export default Static;
