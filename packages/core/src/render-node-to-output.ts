// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import widestLine from 'widest-line';
import Yoga from 'yoga-layout';
import wrapText from './wrap-text.ts';
import getMaxWidth from './get-max-width.ts';
import squashTextNodes from './squash-text-nodes.ts';
import renderBorder from './render-border.ts';
import renderBackground from './render-background.ts';
import { type DOMElement } from './dom.ts';
import type Output from './output.ts';

export type OutputTransformer = (s: string, index: number) => string;

// squashTextNodes drops `internal_transform` so ANSI styling never enters
// the screen-reader stream.
const squashTextNodesPlain = (node: DOMElement): string => {
	const parts: string[] = [];
	for (const childNode of node.childNodes) {
		if (childNode === undefined) continue;
		if (childNode.nodeName === '#text') {
			parts.push(childNode.nodeValue);
			continue;
		}
		if (
			childNode.nodeName === 'ink-text' ||
			childNode.nodeName === 'ink-virtual-text'
		) {
			parts.push(squashTextNodesPlain(childNode as DOMElement));
		}
	}
	return parts.join('');
};

/**
 * Walk the tree producing a plain-text rendering for screen readers.
 *
 * - Row layouts join children with a single space; column layouts join with
 *   a newline. Matches ink's heuristic — screen readers don't have a 2D
 *   model, so spatial structure has to collapse to a 1D string.
 * - `aria-state` keys with truthy values prefix `(busy, checked)`-style
 *   parentheticals.
 * - `aria-role` prefixes `role:` unless the parent already announced the
 *   same role.
 * - Nodes with `display: none` and (optionally) `internal_static` subtrees
 *   are skipped entirely.
 */
export const renderNodeToScreenReaderOutput = (
	node: DOMElement,
	options: {
		parentRole?: string;
		skipStaticElements?: boolean;
	} = {},
): string => {
	if (options.skipStaticElements && node.internal_static) return '';
	if (node.yogaNode?.getDisplay() === Yoga.DISPLAY_NONE) return '';
	if (node.internal_accessibility?.hidden) return '';

	let output = '';

	const label = node.internal_accessibility?.label;
	if (label !== undefined) {
		output = label;
	} else if (node.nodeName === 'ink-text') {
		// Plain text only — visual transforms (chalk.bold, colorize, etc.)
		// would leak ANSI escapes into the screen-reader stream.
		output = squashTextNodesPlain(node);
	} else if (node.nodeName === 'ink-box' || node.nodeName === 'ink-root') {
		const direction = node.style.flexDirection;
		const separator =
			direction === 'row' || direction === 'row-reverse' ? ' ' : '\n';
		const childNodes =
			direction === 'row-reverse' || direction === 'column-reverse'
				? [...node.childNodes].reverse()
				: [...node.childNodes];

		output = childNodes
			.map((childNode) => {
				if (
					childNode.nodeName !== 'ink-text' &&
					childNode.nodeName !== 'ink-box' &&
					childNode.nodeName !== 'ink-root'
				) {
					return '';
				}
				return renderNodeToScreenReaderOutput(childNode as DOMElement, {
					parentRole: node.internal_accessibility?.role,
					skipStaticElements: options.skipStaticElements,
				});
			})
			.filter(Boolean)
			.join(separator);
	}

	const accessibility = node.internal_accessibility;
	if (accessibility) {
		const { role, state } = accessibility;

		if (state) {
			const activeStates: string[] = [];
			// Iterate the known keys in a stable order so test snapshots are
			// deterministic. Object.keys would follow insertion order, which is
			// stable in practice but easier to forget about.
			const stateKeys = [
				'busy',
				'checked',
				'disabled',
				'expanded',
				'multiline',
				'multiselectable',
				'readonly',
				'required',
				'selected',
			] as const;
			for (const key of stateKeys) {
				if (state[key]) activeStates.push(key);
			}
			if (activeStates.length > 0) {
				output = `(${activeStates.join(', ')}) ${output}`;
			}
		}

		if (role && role !== options.parentRole) {
			output = `${role}: ${output}`;
		}
	}

	return output;
};

const renderNodeToOutput = (
	node: DOMElement,
	output: Output,
	options: {
		offsetX?: number;
		offsetY?: number;
		transformers?: OutputTransformer[];
		/**
		 * When true, subtrees marked `internal_static` are skipped during the
		 * walk. The renderer paints those separately above the live frame so
		 * they survive as scrollback history.
		 */
		skipStaticElements?: boolean;
	},
): void => {
	const {
		offsetX = 0,
		offsetY = 0,
		transformers = [],
		skipStaticElements = false,
	} = options;

	if (skipStaticElements && node.internal_static) return;

	const { yogaNode } = node;
	if (!yogaNode) return;

	if (yogaNode.getDisplay() === Yoga.DISPLAY_NONE) return;

	const x = offsetX + yogaNode.getComputedLeft();
	const y = offsetY + yogaNode.getComputedTop();

	let newTransformers = transformers;
	if (typeof node.internal_transform === 'function') {
		newTransformers = [node.internal_transform, ...transformers];
	}

	if (node.nodeName === 'ink-text') {
		let text = squashTextNodes(node);
		if (text.length > 0) {
			const currentWidth = widestLine(text);
			const maxWidth = getMaxWidth(yogaNode);

			if (currentWidth > maxWidth) {
				const textWrap = node.style.textWrap ?? 'wrap';
				text = wrapText(text, maxWidth, textWrap);
			}

			output.write(x, y, text, { transformers: newTransformers });
		}
		return;
	}

	if (node.nodeName === 'ink-box') {
		renderBackground(x, y, node, output);
		renderBorder(x, y, node, output);
	}

	// Clip child rendering inside the border edges so overflowing content
	// doesn't paint over the border glyphs. The border itself was rendered
	// above without any clip in effect, so it survives unaffected.
	let clipped = false;
	if (node.nodeName === 'ink-box') {
		const clipH = node.style.overflowX === 'hidden' || node.style.overflow === 'hidden';
		const clipV = node.style.overflowY === 'hidden' || node.style.overflow === 'hidden';
		if (clipH || clipV) {
			const hasBorder = Boolean(node.style.borderStyle);
			const insetLeft = hasBorder && node.style.borderLeft !== false ? 1 : 0;
			const insetRight = hasBorder && node.style.borderRight !== false ? 1 : 0;
			const insetTop = hasBorder && node.style.borderTop !== false ? 1 : 0;
			const insetBottom = hasBorder && node.style.borderBottom !== false ? 1 : 0;
			output.clip({
				x1: clipH ? x + insetLeft : undefined,
				x2: clipH
					? x + yogaNode.getComputedWidth() - insetRight
					: undefined,
				y1: clipV ? y + insetTop : undefined,
				y2: clipV
					? y + yogaNode.getComputedHeight() - insetBottom
					: undefined,
			});
			clipped = true;
		}
	}

	if (node.nodeName === 'ink-root' || node.nodeName === 'ink-box') {
		for (const childNode of node.childNodes) {
			renderNodeToOutput(childNode as DOMElement, output, {
				offsetX: x,
				offsetY: y,
				transformers: newTransformers,
				skipStaticElements,
			});
		}
		if (clipped) output.unclip();
	}
};

export default renderNodeToOutput;
