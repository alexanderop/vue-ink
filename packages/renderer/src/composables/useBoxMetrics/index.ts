import {
	shallowRef,
	toValue,
	watch,
	type MaybeRefOrGetter,
	type ShallowRef,
} from 'vue';
import {
	addLayoutListener,
	type DOMElement,
} from '@vue-ink/core';
import { useStdout } from '../useStdout/index.ts';
import { tryOnScopeDispose } from '../_internal/index.ts';

/**
 * A target accepted by {@link useBoxMetrics}. Either the underlying
 * `ink-box` DOMElement or `Box`'s exposed proxy (`{ $element }`).
 *
 * Both shapes are accepted so users can write the idiomatic Vue pattern
 * (`<Box ref="boxRef">` with `useTemplateRef`) without having to know
 * which one Vue resolves the ref to.
 */
export type BoxMetricsTarget =
	| DOMElement
	| { readonly $element: DOMElement | null | undefined }
	| null
	| undefined;

export interface UseBoxMetricsReturn {
	/** Element width in character cells. */
	readonly width: ShallowRef<number>;
	/** Element height in character cells. */
	readonly height: ShallowRef<number>;
	/** Distance from the left edge of the parent in character cells. */
	readonly left: ShallowRef<number>;
	/** Distance from the top edge of the parent in character cells. */
	readonly top: ShallowRef<number>;
	/**
	 * `true` after the tracked element has been measured at least once by
	 * Yoga in the current commit. Flips back to `false` if the tracked
	 * target detaches (unmounts or the ref is repointed to a missing node).
	 */
	readonly hasMeasured: ShallowRef<boolean>;
}

const isDOMElement = (value: unknown): value is DOMElement => {
	if (typeof value !== 'object' || value === null) return false;
	const name = (value as { nodeName?: unknown }).nodeName;
	return name === 'ink-box' || name === 'ink-root';
};

// Vue 3 sets a template ref placed on a component to the component's expose
// proxy, not the underlying DOM node. We accept either shape so users get
// the idiomatic experience whether they bind the ref to `<Box>` (proxy with
// `$element`) or to `<ink-box>` directly (DOMElement).
const resolveElement = (target: unknown): DOMElement | null => {
	if (target === null || target === undefined) return null;
	if (isDOMElement(target)) return target;
	const inner = (target as { $element?: unknown }).$element;
	return isDOMElement(inner) ? inner : null;
};

const findRootNode = (node: DOMElement | null): DOMElement | null => {
	let cursor: DOMElement | null | undefined = node;
	while (cursor) {
		if (cursor.nodeName === 'ink-root') return cursor;
		cursor = cursor.parentNode ?? null;
	}
	return null;
};

/**
 * Track the layout metrics of a `Box` element. Values update after every
 * layout commit (mount, sibling changes, resize) and stay frozen at
 * `0,0,0,0,false` while the tracked ref is detached.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTemplateRef } from 'vue';
 * import { Box, Text, useBoxMetrics } from 'vue-ink';
 *
 * const boxRef = useTemplateRef('box');
 * const { width, height, hasMeasured } = useBoxMetrics(boxRef);
 * </script>
 *
 * <template>
 *   <Box ref="box">
 *     <Text v-if="hasMeasured">{{ width }}x{{ height }}</Text>
 *     <Text v-else>Measuring…</Text>
 *   </Box>
 * </template>
 * ```
 */
const writeIfChanged = <T>(target: ShallowRef<T>, next: T): void => {
	if (target.value === next) return;
	// eslint-disable-next-line no-param-reassign -- ShallowRef.value is the documented setter
	target.value = next;
};

export const useBoxMetrics = (
	target: MaybeRefOrGetter<BoxMetricsTarget>,
): UseBoxMetricsReturn => {
	const { stdout } = useStdout();

	const width = shallowRef(0);
	const height = shallowRef(0);
	const left = shallowRef(0);
	const top = shallowRef(0);
	const hasMeasured = shallowRef(false);

	const updateMetrics = (): void => {
		const element = resolveElement(toValue(target));
		const layout = element?.yogaNode?.getComputedLayout();
		writeIfChanged(width, layout?.width ?? 0);
		writeIfChanged(height, layout?.height ?? 0);
		writeIfChanged(left, layout?.left ?? 0);
		writeIfChanged(top, layout?.top ?? 0);
		writeIfChanged(hasMeasured, Boolean(element));
	};

	// Layout-listener handle. Re-attached whenever the tracked element
	// switches roots (in practice always the same root, but resilient to
	// portals/multi-renderer setups).
	let removeLayoutListener: (() => void) | undefined;

	const reattachLayoutListener = (element: DOMElement | null): void => {
		removeLayoutListener?.();
		removeLayoutListener = undefined;
		const root = findRootNode(element);
		if (root) {
			removeLayoutListener = addLayoutListener(root, updateMetrics);
		}
	};

	// Watch the resolved element. `immediate` runs sync at setup time so we
	// take a first reading (zeros if nothing is attached yet). Subsequent
	// runs fire whenever the ref switches targets or its inner $element
	// flips from null → DOMElement after the first mount.
	watch(
		() => resolveElement(toValue(target)),
		(element) => {
			reattachLayoutListener(element);
			updateMetrics();
		},
		{ immediate: true },
	);

	// Terminal resize doesn't go through Vue's render cycle — the renderer
	// erases + repaints synchronously in its own `resize` handler. By the
	// time we run, Yoga has already laid out for the new width.
	stdout.on('resize', updateMetrics);

	tryOnScopeDispose(() => {
		removeLayoutListener?.();
		removeLayoutListener = undefined;
		stdout.off('resize', updateMetrics);
	});

	return { width, height, left, top, hasMeasured };
};
