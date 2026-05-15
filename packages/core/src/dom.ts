// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import Yoga, { type Node as YogaNode } from 'yoga-layout';
import measureText from './measure-text.ts';
import { type Styles } from './styles.ts';
import wrapText from './wrap-text.ts';
import squashTextNodes from './squash-text-nodes.ts';
import { type OutputTransformer } from './render-node-to-output.ts';

type InkNode = {
	parentNode: DOMElement | undefined;
	yogaNode?: YogaNode;
	style: Styles;
};

export type TextName = '#text';
export type ElementNames = 'ink-root' | 'ink-box' | 'ink-text' | 'ink-virtual-text' | 'ink-comment';

export type NodeNames = ElementNames | TextName;

export type DOMElement = {
	nodeName: ElementNames;
	attributes: Record<string, DOMNodeAttribute>;
	childNodes: DOMNode[];
	internal_transform?: OutputTransformer;
	/**
	 * Marks a subtree as scrollback-safe history (rendered above the live
	 * frame and never repainted). Set by the {@link Static} component.
	 */
	internal_static?: boolean;
	onComputeLayout?: () => void;
	onRender?: () => void;
} & InkNode;

export type TextNode = {
	nodeName: TextName;
	nodeValue: string;
} & InkNode;

export type DOMNode<T = { nodeName: NodeNames }> = T extends { nodeName: infer U }
	? U extends '#text'
		? TextNode
		: DOMElement
	: never;

export type DOMNodeAttribute = boolean | string | number;

export const createNode = (nodeName: ElementNames): DOMElement => {
	const node: DOMElement = {
		nodeName,
		style: {},
		attributes: {},
		childNodes: [],
		parentNode: undefined,
		yogaNode:
			nodeName === 'ink-virtual-text' || nodeName === 'ink-comment'
				? undefined
				: Yoga.Node.create(),
	};

	if (nodeName === 'ink-text') {
		node.yogaNode?.setMeasureFunc(measureTextNode.bind(undefined, node));
	}

	return node;
};

export const appendChildNode = (node: DOMElement, childNode: DOMNode): void => {
	if (childNode.parentNode) {
		removeChildNode(childNode.parentNode, childNode);
	}

	childNode.parentNode = node;
	node.childNodes.push(childNode);

	if (childNode.yogaNode) {
		node.yogaNode?.insertChild(childNode.yogaNode, node.yogaNode.getChildCount());
	}

	if (node.nodeName === 'ink-text' || node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

// Yoga only knows about siblings that have yoga nodes; DOM-only nodes
// (#text, ink-virtual-text, ink-comment — including Vue fragment anchors)
// occupy DOM-tree slots but not yoga-tree slots. Translate a DOM index into
// the matching yoga index by counting yoga-bearing siblings strictly before
// it.
const toYogaIndex = (childNodes: DOMNode[], domIndex: number): number =>
	childNodes.slice(0, domIndex).filter((child) => child?.yogaNode).length;

export const insertBeforeNode = (
	node: DOMElement,
	newChildNode: DOMNode,
	beforeChildNode: DOMNode,
): void => {
	if (newChildNode.parentNode) {
		removeChildNode(newChildNode.parentNode, newChildNode);
	}

	newChildNode.parentNode = node;

	const index = node.childNodes.indexOf(beforeChildNode);
	if (index >= 0) {
		node.childNodes.splice(index, 0, newChildNode);
		if (newChildNode.yogaNode) {
			node.yogaNode?.insertChild(newChildNode.yogaNode, toYogaIndex(node.childNodes, index));
		}
	} else {
		node.childNodes.push(newChildNode);
		if (newChildNode.yogaNode) {
			node.yogaNode?.insertChild(newChildNode.yogaNode, node.yogaNode.getChildCount());
		}
	}

	if (node.nodeName === 'ink-text' || node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}
};

export const removeChildNode = (node: DOMElement, removeNode: DOMNode): void => {
	if (removeNode.yogaNode) {
		removeNode.parentNode?.yogaNode?.removeChild(removeNode.yogaNode);
	}

	removeNode.parentNode = undefined;

	const index = node.childNodes.indexOf(removeNode);
	if (index >= 0) {
		node.childNodes.splice(index, 1);
	}

	if (node.nodeName === 'ink-text' || node.nodeName === 'ink-virtual-text') {
		markNodeAsDirty(node);
	}

	freeYogaSubtree(removeNode);
};

// Frees `node.yogaNode` and any descendant yoga nodes. Yoga's freeRecursive
// detaches and frees children, but DOM-only descendants (text, virtual-text,
// comments) own no yoga node and aren't on the yoga tree — they're released
// when the DOM node is GC'd.
const freeYogaSubtree = (node: DOMNode): void => {
	if (node.yogaNode) {
		node.yogaNode.freeRecursive();
		node.yogaNode = undefined;
	}
};

export const setAttribute = (node: DOMElement, key: string, value: DOMNodeAttribute): void => {
	node.attributes[key] = value;
};

export const setStyle = (node: DOMNode, style?: Styles): void => {
	node.style = style ?? {};
};

export const createTextNode = (text: string): TextNode => {
	const node: TextNode = {
		nodeName: '#text',
		nodeValue: text,
		yogaNode: undefined,
		parentNode: undefined,
		style: {},
	};

	setTextNodeValue(node, text);
	return node;
};

const measureTextNode = function (node: DOMNode, width: number): { width: number; height: number } {
	// measureFunc is only attached to ink-text nodes (see createNode), so the
	// `#text` branch defends against a theoretical future binding.
	const text =
		/* v8 ignore next */
		node.nodeName === '#text' ? node.nodeValue : squashTextNodes(node);

	const dimensions = measureText(text);

	if (dimensions.width <= width) {
		return dimensions;
	}

	// Yoga occasionally hands measureFunc a sub-character width during
	// constraint solving for deeply-nested percentage layouts. Wrapping to
	// width < 1 has no useful answer, so keep the natural dimensions.
	/* v8 ignore next 3 */
	if (dimensions.width >= 1 && width > 0 && width < 1) {
		return dimensions;
	}

	// node.style is initialised to {} in createNode and Text always supplies a
	// default wrap prop, so the nullish fallback below is purely defensive.
	/* v8 ignore next */
	const textWrap = node.style?.textWrap ?? 'wrap';
	const wrappedText = wrapText(text, width, textWrap);

	return measureText(wrappedText);
};

const findClosestYogaNode = (node?: DOMNode): YogaNode | undefined => {
	if (!node?.parentNode) {
		return undefined;
	}

	return node.yogaNode ?? findClosestYogaNode(node.parentNode);
};

const markNodeAsDirty = (node?: DOMNode): void => {
	const yogaNode = findClosestYogaNode(node);
	yogaNode?.markDirty();
};

export const setTextNodeValue = (node: TextNode, text: string): void => {
	if (typeof text !== 'string') {
		text = String(text);
	}

	node.nodeValue = text;
	markNodeAsDirty(node);
};
