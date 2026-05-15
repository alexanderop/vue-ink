// Walk a yoga-laid-out tree, paint every `internal_static` subtree into its
// own Output, and concatenate the rendered text. Each Static subtree gets a
// trailing newline so the renderer can prepend it above the live frame as
// scrollback history.
import Yoga from 'yoga-layout';
import Output from './output.ts';
import renderNodeToOutput from './render-node-to-output.ts';
import { type DOMElement } from './dom.ts';

const renderSingleStatic = (node: DOMElement, terminalWidth: number): string => {
	const { yogaNode } = node;
	if (!yogaNode) return '';

	// Static items live at `position: absolute` in the main tree (which means
	// they don't take space in the parent flex layout). For their own paint
	// pass we need a fresh layout calculation since their computed dimensions
	// inside the parent reflect the parent's constraint, not their own size.
	yogaNode.setWidth(terminalWidth);
	yogaNode.calculateLayout(terminalWidth, undefined, Yoga.DIRECTION_LTR);

	const width = yogaNode.getComputedWidth();
	const height = yogaNode.getComputedHeight();
	if (width === 0 || height === 0) return '';

	const output = new Output({ width, height });
	// `skipStaticElements: false` so nested static subtrees (if any) paint
	// here. We do NOT skip on this branch since this *is* the static walk.
	renderNodeToOutput(node, output, { skipStaticElements: false });
	const { output: text } = output.get();
	return text;
};

export const renderStaticSubtrees = (
	rootNode: DOMElement,
	terminalWidth: number,
): string => {
	const buffers: string[] = [];
	const visit = (node: DOMElement): void => {
		if (node.internal_static) {
			const text = renderSingleStatic(node, terminalWidth);
			if (text.length > 0) buffers.push(text);
			// Static subtrees never nest — but even if they did, we wouldn't
			// recurse: `renderSingleStatic` already paints the whole subtree.
			return;
		}
		for (const child of node.childNodes) {
			if (child.nodeName === '#text' || child.nodeName === 'ink-comment') continue;
			visit(child as DOMElement);
		}
	};
	visit(rootNode);
	return buffers.join('');
};

// True when any node in the subtree is marked `internal_static`. Cheap enough
// to run before the render pass so we can skip the static walk when nothing
// changed.
export const hasStaticContent = (rootNode: DOMElement): boolean => {
	if (rootNode.internal_static) return true;
	for (const child of rootNode.childNodes) {
		if (child.nodeName === '#text' || child.nodeName === 'ink-comment') continue;
		if (hasStaticContent(child as DOMElement)) return true;
	}
	return false;
};
