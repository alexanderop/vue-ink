import type { PropType } from 'vue';
import type { Styles } from '@vue-ink/core';
import type { Boxes, BoxStyle } from 'cli-boxes';

const sizeKeys = [
	'width',
	'height',
	'minWidth',
	'minHeight',
	'maxWidth',
	'maxHeight',
	'flexBasis',
	'top',
	'right',
	'bottom',
	'left',
] as const;

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
	'aspectRatio',
] as const;

const stringKeys = [
	'position',
	'flexDirection',
	'flexWrap',
	'alignItems',
	'alignSelf',
	'alignContent',
	'justifyContent',
	'display',
	'overflow',
	'overflowX',
	'overflowY',
	'borderColor',
	'borderTopColor',
	'borderBottomColor',
	'borderLeftColor',
	'borderRightColor',
	'borderBackgroundColor',
	'borderTopBackgroundColor',
	'borderBottomBackgroundColor',
	'borderLeftBackgroundColor',
	'borderRightBackgroundColor',
	'backgroundColor',
] as const;

const booleanKeys = [
	'borderTop',
	'borderBottom',
	'borderLeft',
	'borderRight',
	'borderDimColor',
	'borderTopDimColor',
	'borderBottomDimColor',
	'borderLeftDimColor',
	'borderRightDimColor',
] as const;

type SizeKey = (typeof sizeKeys)[number];
type NumberKey = (typeof numberKeys)[number];
type StringKey = (typeof stringKeys)[number];
type BooleanKey = (typeof booleanKeys)[number];

export type BoxStyleKey = SizeKey | NumberKey | StringKey | BooleanKey | 'borderStyle';

export type BoxRuntimeProps = {
	[K in SizeKey]: { type: PropType<number | string> };
} & {
	[K in NumberKey]: { type: PropType<number> };
} & {
	[K in StringKey]: { type: PropType<Styles[K]> };
} & {
	[K in BooleanKey]: { type: PropType<boolean> };
} & {
	borderStyle: { type: PropType<keyof Boxes | BoxStyle> };
};

export const buildBoxProps = (): BoxRuntimeProps => {
	const props = {} as Record<string, { type: unknown; default?: unknown }>;
	for (const key of sizeKeys) props[key] = { type: [Number, String] };
	for (const key of numberKeys) props[key] = { type: Number };
	for (const key of stringKeys) props[key] = { type: String };
	// Vue defaults Boolean props to `false` when unset. The renderer needs to
	// distinguish "user said false" from "user didn't say" (so `borderTop`
	// stays on when only `borderStyle` is set), so we override the default.
	for (const key of booleanKeys) props[key] = { type: Boolean, default: undefined };
	props['borderStyle'] = { type: [String, Object] };
	return props as BoxRuntimeProps;
};
