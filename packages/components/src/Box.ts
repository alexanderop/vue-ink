import { defineComponent, h, type PropType } from 'vue';
import { type Styles } from '@vue-ink/core';

export type BoxProps = Omit<Styles, 'textWrap'>;

// Keys accepting `number | string` (sizing + flex-basis).
const sizeKeys = [
	'width',
	'height',
	'minWidth',
	'minHeight',
	'maxWidth',
	'maxHeight',
	'flexBasis',
] as const;

// Keys accepting `number` only (spacing + flex factors).
const numberKeys = [
	'padding',
	'paddingX',
	'paddingY',
	'paddingTop',
	'paddingBottom',
	'paddingLeft',
	'paddingRight',
	'margin',
	'marginX',
	'marginY',
	'marginTop',
	'marginBottom',
	'marginLeft',
	'marginRight',
	'flexGrow',
	'flexShrink',
	'gap',
	'columnGap',
	'rowGap',
] as const;

// Keys accepting `string` only (enum-like flex/layout values).
const stringKeys = [
	'flexDirection',
	'flexWrap',
	'alignItems',
	'alignSelf',
	'justifyContent',
	'display',
	'overflow',
	'overflowX',
	'overflowY',
] as const;

type SizeKey = (typeof sizeKeys)[number];
type NumberKey = (typeof numberKeys)[number];
type StringKey = (typeof stringKeys)[number];

type BoxRuntimeProps = {
	[K in SizeKey]: { type: PropType<number | string> };
} & {
	[K in NumberKey]: { type: PropType<number> };
} & {
	[K in StringKey]: { type: PropType<Styles[K]> };
};

const buildProps = (): BoxRuntimeProps => {
	const props = {} as Record<string, { type: unknown }>;
	for (const key of sizeKeys) props[key] = { type: [Number, String] };
	for (const key of numberKeys) props[key] = { type: Number };
	for (const key of stringKeys) props[key] = { type: String };
	return props as BoxRuntimeProps;
};

const Box = defineComponent({
	name: 'Box',
	props: buildProps(),
	setup(props, { slots }) {
		return () => {
			const style: Styles = {
				flexWrap: 'nowrap',
				flexDirection: 'row',
				flexGrow: 0,
				flexShrink: 1,
			};
			for (const key of Object.keys(props) as Array<keyof typeof props>) {
				const value = props[key];
				if (value !== undefined) {
					(style as Record<string, unknown>)[key as string] = value;
				}
			}
			(style as Record<string, unknown>)['overflowX'] =
				props.overflowX ?? props.overflow ?? 'visible';
			(style as Record<string, unknown>)['overflowY'] =
				props.overflowY ?? props.overflow ?? 'visible';

			return h('ink-box', { style }, slots.default?.());
		};
	},
});

export default Box;
