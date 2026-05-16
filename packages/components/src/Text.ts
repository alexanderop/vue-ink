import { computed, defineComponent, h, inject, type PropType, type VNodeChild } from 'vue';
import type { Color, Styles } from '@vue-ink/core';
import { BACKGROUND_COLOR_INJECT_KEY } from './background-context.ts';
import { useTextHost } from './text-context.ts';
import { applyTextStyles } from './helpers/text-styles.ts';
import { buildAccessibility } from './helpers/accessibility.ts';
import { useScreenReader } from './helpers/use-screen-reader.ts';

export type TextProps = {
	/** Change text color. Ink uses Chalk under the hood, so all its functionality is supported. */
	color?: Color;
	/** Same as `color`, but for the background. */
	backgroundColor?: Color;
	/** Dim the color (make it less bright). */
	dimColor?: boolean;
	/** Make the text bold. */
	bold?: boolean;
	/** Make the text italic. */
	italic?: boolean;
	/** Make the text underlined. */
	underline?: boolean;
	/** Make the text crossed out with a line. */
	strikethrough?: boolean;
	/** Inverse background and foreground colors. */
	inverse?: boolean;
	/**
	 * Wrap or truncate text when its width exceeds the container. `wrap` (default)
	 * splits text into multiple lines. `hard` fills each line to the full column
	 * width, breaking words as necessary. `truncate-*` keeps a single line and
	 * cuts off the rest.
	 */
	wrap?: Styles['textWrap'];
	/** Label announced to screen readers in place of the children. */
	'aria-label'?: string;
	/** Hide the element (and its subtree) from screen-reader output. */
	'aria-hidden'?: boolean;
};

const Text = defineComponent({
	name: 'Text',
	props: {
		color: { type: String as PropType<Color | undefined>, default: undefined },
		backgroundColor: {
			type: String as PropType<Color | undefined>,
			default: undefined,
		},
		dimColor: { type: Boolean, default: false },
		bold: { type: Boolean, default: false },
		italic: { type: Boolean, default: false },
		underline: { type: Boolean, default: false },
		strikethrough: { type: Boolean, default: false },
		inverse: { type: Boolean, default: false },
		wrap: {
			type: String as PropType<Styles['textWrap']>,
			default: 'wrap',
		},
		// Declared camelCase so `props.ariaLabel` is typed at the call site.
		// Vue camelizes incoming attr keys before lookup, so users can still
		// write `<Text aria-label="…">` (template) or `h(Text, { 'aria-label':
		// '…' })` (h syntax) — both resolve to this key at runtime.
		ariaLabel: { type: String as PropType<string | undefined>, default: undefined },
		ariaHidden: { type: Boolean, default: undefined },
	},
	setup(props, { slots }) {
		const inheritedBackground = inject(BACKGROUND_COLOR_INJECT_KEY, null);
		const isScreenReaderEnabled = useScreenReader();
		const tag = useTextHost();
		// Rebuild the transform only when a relevant style flag changes — keeps
		// `internal_transform`'s identity stable so the renderer's patchProp
		// short-circuits redundant work.
		const transform = computed(() => {
			const flags = {
				color: props.color,
				backgroundColor: props.backgroundColor ?? inheritedBackground?.(),
				dimColor: props.dimColor,
				bold: props.bold,
				italic: props.italic,
				underline: props.underline,
				strikethrough: props.strikethrough,
				inverse: props.inverse,
			};
			return (text: string): string => applyTextStyles(text, flags);
		});

		return () => {
			// Mirrors React Ink: when SR is on and aria-hidden is set, skip the
			// subtree entirely — no node, no layout, no children mounting.
			if (isScreenReaderEnabled.value && props.ariaHidden) return null;
			const children: VNodeChild[] =
				isScreenReaderEnabled.value && props.ariaLabel !== undefined
					? [props.ariaLabel]
					: ((slots.default?.() ?? []) as VNodeChild[]);
			return h(
				tag,
				{
					style: {
						flexGrow: 0,
						flexShrink: 1,
						flexDirection: 'row',
						textWrap: props.wrap,
					},
					internal_transform: transform.value,
					internal_accessibility: buildAccessibility({
						label: props.ariaLabel,
						hidden: props.ariaHidden || undefined,
					}),
				},
				children,
			);
		};
	},
});

export default Text;
