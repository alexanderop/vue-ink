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

	let clipped = false;
	if (node.nodeName === 'ink-box') {
		const clipH = node.style.overflowX === 'hidden' || node.style.overflow === 'hidden';
		const clipV = node.style.overflowY === 'hidden' || node.style.overflow === 'hidden';
		if (clipH || clipV) {
			output.clip({
				x1: clipH ? x : undefined,
				x2: clipH ? x + yogaNode.getComputedWidth() : undefined,
				y1: clipV ? y : undefined,
				y2: clipV ? y + yogaNode.getComputedHeight() : undefined,
			});
			clipped = true;
		}
	}

	if (node.nodeName === 'ink-box') {
		renderBackground(x, y, node, output);
		renderBorder(x, y, node, output);
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
