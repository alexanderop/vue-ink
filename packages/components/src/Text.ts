import { computed, defineComponent, h, inject, type PropType, type VNodeChild } from 'vue';
import chalk from 'chalk';
import { colorize, type Styles } from '@vue-ink/core';
import { BACKGROUND_COLOR_INJECT_KEY } from './background-context.ts';
import { useTextHost } from './text-context.ts';

export type TextProps = {
	color?: string;
	backgroundColor?: string;
	dimColor?: boolean;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	inverse?: boolean;
	wrap?: Styles['textWrap'];
};

const Text = defineComponent({
	name: 'Text',
	props: {
		color: { type: String as PropType<string | undefined>, default: undefined },
		backgroundColor: {
			type: String as PropType<string | undefined>,
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
	},
	setup(props, { slots }) {
		// A <Box backgroundColor> ancestor provides this getter; the Text's own
		// `backgroundColor` prop takes precedence.
		const inheritedBackground = inject(BACKGROUND_COLOR_INJECT_KEY, null);
		const tag = useTextHost();
		// Rebuild the chalk pipeline only when a relevant style flag changes —
		// this keeps `internal_transform`'s identity stable across renders, so
		// patchProp's identity short-circuit avoids redundant work.
		const transform = computed(() => {
			const { color, backgroundColor, dimColor, bold, italic, underline, strikethrough, inverse } =
				props;
			const bg = backgroundColor ?? inheritedBackground?.();
			return (text: string): string => {
				let out = text;
				if (dimColor) out = chalk.dim(out);
				if (color) out = colorize(out, color, 'foreground');
				if (bg) out = colorize(out, bg, 'background');
				if (bold) out = chalk.bold(out);
				if (italic) out = chalk.italic(out);
				if (underline) out = chalk.underline(out);
				if (strikethrough) out = chalk.strikethrough(out);
				if (inverse) out = chalk.inverse(out);
				return out;
			};
		});

		return () => {
			const children = (slots.default?.() ?? []) as VNodeChild[];
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
				},
				children,
			);
		};
	},
});

export default Text;
