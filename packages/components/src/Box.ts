import { defineComponent, h, inject, provide, shallowRef } from 'vue';
import type { PropType } from 'vue';
import {
	type AccessibilityRole,
	type AccessibilityState,
	type DOMElement,
	type Styles,
} from '@vue-ink/core';
import { BACKGROUND_COLOR_INJECT_KEY } from './background-context.ts';
import { buildBoxProps } from './helpers/box-props.ts';
import { buildAccessibility } from './helpers/accessibility.ts';
import { useScreenReader } from './helpers/use-screen-reader.ts';

/**
 * Props for {@link Box}. Every Yoga flex / layout style from `Styles`
 * is accepted (sizing, padding, margin, flex, gap, border, overflow, …),
 * plus the `aria-*` set below for screen-reader output. `textWrap` is
 * excluded — wrap mode belongs on {@link TextProps} instead.
 */
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

const ARIA_KEYS = new Set(['ariaLabel', 'ariaHidden', 'ariaRole', 'ariaState']);

/**
 * `<Box>` is the primary layout container. It maps onto a Yoga flex node, so
 * every {@link BoxProps} property (`flexDirection`, `gap`, `borderStyle`,
 * `padding`, …) behaves like CSS flexbox — but laid out in character cells
 * inside the terminal. Boxes can be nested arbitrarily; place `<Text>` inside
 * them for content.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { Box, Text } from 'vueink';
 * </script>
 *
 * <template>
 *   <Box flexDirection="column" borderStyle="round" :padding="1">
 *     <Text bold>Title</Text>
 *     <Text>Body</Text>
 *   </Box>
 * </template>
 * ```
 */
const Box = defineComponent({
	name: 'Box',
	props: {
		...buildBoxProps(),
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
		const isScreenReaderEnabled = useScreenReader();
		provide(
			BACKGROUND_COLOR_INJECT_KEY,
			() => props.backgroundColor ?? parentBackground?.(),
		);
		// Forward the underlying `ink-box` DOMElement via `$element` so
		// `useBoxMetrics` (and any future Yoga-aware composable) can reach the
		// node without users having to drop down to the host element type.
		const elementRef = shallowRef<DOMElement | null>(null);
		expose({
			get $element(): DOMElement | null {
				return elementRef.value;
			},
		});

		return () => {
			// SR + aria-hidden short-circuits to nothing: subtree never enters
			// the reconciler, Yoga skips layout, child onMounted hooks don't fire.
			if (isScreenReaderEnabled.value && props.ariaHidden) return null;

			const style: Styles = {
				flexWrap: 'nowrap',
				flexDirection: 'row',
				flexGrow: 0,
				flexShrink: 1,
			};
			for (const key in props) {
				if (ARIA_KEYS.has(key)) continue;
				const value = (props as Record<string, unknown>)[key];
				if (value !== undefined) (style as Record<string, unknown>)[key] = value;
			}
			(style as Record<string, unknown>)['overflowX'] =
				props.overflowX ?? props.overflow ?? 'visible';
			(style as Record<string, unknown>)['overflowY'] =
				props.overflowY ?? props.overflow ?? 'visible';

			return h(
				'ink-box',
				{
					ref: elementRef,
					style,
					internal_accessibility: buildAccessibility({
						label: props.ariaLabel,
						hidden: props.ariaHidden || undefined,
						role: props.ariaRole,
						state: props.ariaState,
					}),
				},
				slots.default?.(),
			);
		};
	},
});

export default Box;
