import { defineComponent, h, type PropType, type VNodeChild } from 'vue';
import { type AccessibilityInfo, type OutputTransformer } from '@vue-ink/core';
import { useTextHost } from './text-context.ts';

export type TransformProps = {
	transform: OutputTransformer;
	accessibilityLabel?: string;
};

const Transform = defineComponent({
	name: 'Transform',
	props: {
		transform: {
			type: Function as PropType<OutputTransformer>,
			required: true,
		},
		accessibilityLabel: {
			type: String,
			default: undefined,
		},
	},
	setup(props, { slots }) {
		const tag = useTextHost();
		return () => {
			const children = (slots.default?.() ?? []) as VNodeChild[];
			if (children.length === 0) return null;
			const accessibility: AccessibilityInfo | undefined =
				props.accessibilityLabel !== undefined
					? { label: props.accessibilityLabel }
					: undefined;
			return h(
				tag,
				{
					style: { flexGrow: 0, flexShrink: 1, flexDirection: 'row' },
					internal_transform: props.transform,
					internal_accessibility: accessibility,
				},
				children,
			);
		};
	},
});

export default Transform;
