import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue';
import chalk from 'chalk';
import { colorize, type Styles } from '@vue-ink/core';

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
		// Rebuild the chalk pipeline only when a relevant style flag changes —
		// this keeps `internal_transform`'s identity stable across renders, so
		// patchProp's identity short-circuit avoids redundant work.
		const transform = computed(() => {
			const { color, backgroundColor, dimColor, bold, italic, underline, strikethrough, inverse } =
				props;
			return (text: string): string => {
				let out = text;
				if (dimColor) out = chalk.dim(out);
				if (color) out = colorize(out, color, 'foreground');
				if (backgroundColor) out = colorize(out, backgroundColor, 'background');
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
				'ink-text',
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
