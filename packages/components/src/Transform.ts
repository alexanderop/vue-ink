import { defineComponent, h, type PropType, type VNodeChild } from 'vue';
import { type OutputTransformer } from '@vue-ink/core';
import { useTextHost } from './text-context.ts';
import { buildAccessibility } from './helpers/accessibility.ts';
import { useScreenReader } from './helpers/use-screen-reader.ts';

export type TransformProps = {
	/**
	 * Transforms the child output. Receives the rendered string and must return
	 * the transformed string. Note that when children use `<Text>` styling props
	 * (e.g. `color`, `bold`), the input string will contain ANSI escape codes.
	 */
	transform: OutputTransformer;
	/** Screen-reader-specific text to output. If set, children are ignored under SR. */
	accessibilityLabel?: string;
};

/**
 * `<Transform>` post-processes the rendered string of its `<Text>` children
 * before it lands in the frame. The `transform` callback receives the
 * already-styled output (ANSI escapes included) and returns the replacement
 * string. Useful for case mapping, decoration, or wrapping individual
 * characters in extra escapes without re-implementing wrap logic upstream.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { Text, Transform } from 'vueink';
 * </script>
 *
 * <template>
 *   <Transform :transform="(s) => s.toUpperCase()">
 *     <Text>shouting</Text>
 *   </Transform>
 * </template>
 * ```
 */
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
		const isScreenReaderEnabled = useScreenReader();
		return () => {
			const slotChildren = (slots.default?.() ?? []) as VNodeChild[];
			// Mirrors React Ink: under SR, swap children for the spoken label.
			// If neither is present, render nothing.
			const children: VNodeChild[] =
				isScreenReaderEnabled.value && props.accessibilityLabel !== undefined
					? [props.accessibilityLabel]
					: slotChildren;
			if (children.length === 0) return null;
			return h(
				tag,
				{
					style: { flexGrow: 0, flexShrink: 1, flexDirection: 'row' },
					internal_transform: props.transform,
					internal_accessibility: buildAccessibility({
						label: props.accessibilityLabel,
					}),
				},
				children,
			);
		};
	},
});

export default Transform;
