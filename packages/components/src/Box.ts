import { defineComponent, h, inject, provide, shallowRef, type PropType } from 'vue';
import {
	type AccessibilityInfo,
	type AccessibilityRole,
	type AccessibilityState,
	type DOMElement,
	type Styles,
} from '@vue-ink/core';
import { type Boxes, type BoxStyle } from 'cli-boxes';
import { ACCESSIBILITY_CONTEXT_KEY } from './accessibility-context.ts';
import { BACKGROUND_COLOR_INJECT_KEY } from './background-context.ts';

export type BoxProps = Omit<Styles, 'textWrap'> & {
	/** Label announced to screen readers in place of the Box's children. */
	'aria-label'?: string;
	/** Hide the Box (and its subtree) from screen-reader output. */
	'aria-hidden'?: boolean;
	/** Role announced to screen readers. */
	'aria-role'?: AccessibilityRole;
	/** State flags announced as `(checked, busy)` prefixes. */
	'aria-state'?: AccessibilityState;
};

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

type BoxRuntimeProps = {
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

const buildProps = (): BoxRuntimeProps => {
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

const Box = defineComponent({
	name: 'Box',
	props: {
		...buildProps(),
		// Declared camelCase so `props.ariaLabel` etc. are typed at the call
		// site. Vue camelizes incoming attr keys before lookup, so users can
		// still write `<Box aria-label="…">` (template) or
		// `h(Box, { 'aria-label': '…' })` (h syntax).
		ariaLabel: { type: String as PropType<string | undefined>, default: undefined },
		ariaHidden: { type: Boolean, default: undefined },
		ariaRole: {
			type: String as PropType<AccessibilityRole | undefined>,
			default: undefined,
		},
		ariaState: {
			type: Object as PropType<AccessibilityState | undefined>,
			default: undefined,
		},
	},
	setup(props, { slots, expose }) {
		// Inherit the nearest ancestor's backgroundColor when this Box doesn't
		// set its own — mirrors ink's behaviour where a middle non-bg Box does
		// not break inheritance for descendant Text nodes.
		const parentBackground = inject(BACKGROUND_COLOR_INJECT_KEY, null);
		// Renderer-provided SR context. When SR is on AND `aria-hidden` is set,
		// Box short-circuits to render nothing — mirrors ink, which returns
		// null so the subtree never enters the reconciler. Yoga skips the
		// layout work and child onMounted hooks don't fire.
		const accessibilityCtx = inject(ACCESSIBILITY_CONTEXT_KEY, null);
		provide(
			BACKGROUND_COLOR_INJECT_KEY,
			() => props.backgroundColor ?? parentBackground?.(),
		);
		// Vue assigns a template ref placed on a component to its expose proxy.
		// We forward the underlying `ink-box` DOMElement via `$element` so
		// `useBoxMetrics` (and any future Yoga-aware composable) can reach the
		// node without users having to drop down to the host element type.
		const elementRef = shallowRef<DOMElement | null>(null);
		expose({
			get $element(): DOMElement | null {
				return elementRef.value;
			},
		});
		// Skip aria keys in the style sweep below — they're applied as
		// accessibility metadata, not Yoga style.
		const ariaKeys = new Set(['ariaLabel', 'ariaHidden', 'ariaRole', 'ariaState']);
		return () => {
			if (
				props.ariaHidden &&
				(accessibilityCtx?.isScreenReaderEnabled.value ?? false)
			) {
				return null;
			}
			const style: Styles = {
				flexWrap: 'nowrap',
				flexDirection: 'row',
				flexGrow: 0,
				flexShrink: 1,
			};
			for (const key of Object.keys(props) as Array<keyof typeof props>) {
				if (ariaKeys.has(key as string)) continue;
				const value = props[key];
				if (value !== undefined) {
					(style as Record<string, unknown>)[key as string] = value;
				}
			}
			(style as Record<string, unknown>)['overflowX'] =
				props.overflowX ?? props.overflow ?? 'visible';
			(style as Record<string, unknown>)['overflowY'] =
				props.overflowY ?? props.overflow ?? 'visible';

			const accessibility: AccessibilityInfo | undefined =
				props.ariaLabel !== undefined ||
				props.ariaHidden !== undefined ||
				props.ariaRole !== undefined ||
				props.ariaState !== undefined
					? {
							label: props.ariaLabel,
							hidden: props.ariaHidden || undefined,
							role: props.ariaRole,
							state: props.ariaState,
						}
					: undefined;

			return h(
				'ink-box',
				{
					ref: elementRef,
					style,
					internal_accessibility: accessibility,
				},
				slots.default?.(),
			);
		};
	},
});

export default Box;
