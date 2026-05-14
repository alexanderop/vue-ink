import {defineComponent, h, type PropType, type VNodeChild} from 'vue';
import chalk from 'chalk';
import colorize from '../colorize.ts';
import {type Styles} from '../styles.ts';

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
		color: {type: String as PropType<string | undefined>, default: undefined},
		backgroundColor: {
			type: String as PropType<string | undefined>,
			default: undefined,
		},
		dimColor: {type: Boolean, default: false},
		bold: {type: Boolean, default: false},
		italic: {type: Boolean, default: false},
		underline: {type: Boolean, default: false},
		strikethrough: {type: Boolean, default: false},
		inverse: {type: Boolean, default: false},
		wrap: {
			type: String as PropType<Styles['textWrap']>,
			default: 'wrap',
		},
	},
	setup(props, {slots}) {
		const transform = (text: string): string => {
			if (props.dimColor) text = chalk.dim(text);
			if (props.color) text = colorize(text, props.color, 'foreground');
			if (props.backgroundColor) {
				text = colorize(text, props.backgroundColor, 'background');
			}
			if (props.bold) text = chalk.bold(text);
			if (props.italic) text = chalk.italic(text);
			if (props.underline) text = chalk.underline(text);
			if (props.strikethrough) text = chalk.strikethrough(text);
			if (props.inverse) text = chalk.inverse(text);
			return text;
		};

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
					internal_transform: transform,
				},
				children,
			);
		};
	},
});

export default Text;
