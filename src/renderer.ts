// Vue host renderer that emits Ink DOM nodes via Yoga.
import {createRenderer} from '@vue/runtime-core';
import {
	appendChildNode,
	createNode,
	createTextNode,
	insertBeforeNode,
	removeChildNode,
	setAttribute,
	setStyle,
	setTextNodeValue,
	type DOMElement,
	type DOMNode,
	type DOMNodeAttribute,
	type ElementNames,
	type TextNode,
} from './dom.ts';
import applyStyles, {type Styles} from './styles.ts';
import {type OutputTransformer} from './render-node-to-output.ts';

type HostNode = DOMNode;
type HostElement = DOMElement;

const findRoot = (node: HostNode | null | undefined): DOMElement | undefined => {
	let cur: HostNode | undefined = node ?? undefined;
	while (cur) {
		if (cur.nodeName === 'ink-root') return cur as DOMElement;
		cur = cur.parentNode;
	}
	return undefined;
};

const scheduledRoots = new WeakSet<DOMElement>();

const scheduleRender = (node: HostNode | null | undefined): void => {
	const root = findRoot(node);
	if (!root) return;
	if (scheduledRoots.has(root)) return;
	scheduledRoots.add(root);
	queueMicrotask(() => {
		scheduledRoots.delete(root);
		root.onComputeLayout?.();
		root.onRender?.();
	});
};

const setProp = (
	node: DOMElement,
	key: string,
	value: unknown,
): void => {
	if (key === 'style') {
		setStyle(node, value as Styles);
		if (node.yogaNode) applyStyles(node.yogaNode, (value as Styles) ?? {});
		return;
	}

	if (key === 'internal_transform') {
		node.internal_transform = value as OutputTransformer | undefined;
		return;
	}

	if (key === 'key' || key === 'ref') return;

	setAttribute(node, key, value as DOMNodeAttribute);
};

const knownTypes: readonly ElementNames[] = [
	'ink-root',
	'ink-box',
	'ink-text',
	'ink-virtual-text',
];

const {createApp} = createRenderer<HostNode, HostElement>({
	createElement(type: string): HostElement {
		if (!knownTypes.includes(type as ElementNames)) {
			throw new Error(`Unknown host element: ${type}`);
		}
		return createNode(type as ElementNames);
	},

	createText(text: string): HostNode {
		return createTextNode(text);
	},

	createComment(_text: string): HostNode {
		return createTextNode('');
	},

	setText(node: HostNode, text: string): void {
		if (node.nodeName === '#text') {
			setTextNodeValue(node as TextNode, text);
			scheduleRender(node);
		}
	},

	setElementText(el: HostElement, text: string): void {
		while (el.childNodes.length > 0) {
			removeChildNode(el, el.childNodes[0]!);
		}
		if (text.length > 0) {
			appendChildNode(el, createTextNode(text));
		}
		scheduleRender(el);
	},

	parentNode(node: HostNode): HostElement | null {
		return node.parentNode ?? null;
	},

	nextSibling(node: HostNode): HostNode | null {
		const parent = node.parentNode;
		if (!parent) return null;
		const index = parent.childNodes.indexOf(node);
		if (index < 0) return null;
		return parent.childNodes[index + 1] ?? null;
	},

	insert(child: HostNode, parent: HostElement, anchor?: HostNode | null): void {
		if (anchor) {
			insertBeforeNode(parent, child, anchor);
		} else {
			appendChildNode(parent, child as DOMElement);
		}
		scheduleRender(parent);
	},

	remove(child: HostNode): void {
		const parent = child.parentNode;
		if (parent) {
			removeChildNode(parent, child);
			scheduleRender(parent);
		}
	},

	patchProp(
		el: HostElement,
		key: string,
		_prevValue: unknown,
		nextValue: unknown,
	): void {
		setProp(el, key, nextValue);
		scheduleRender(el);
	},
});

export {createApp};
