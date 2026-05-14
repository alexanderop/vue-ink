// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import sanitizeAnsi from './sanitize-ansi.ts';
import { type DOMElement } from './dom.ts';

const squashTextNodes = (node: DOMElement): string => {
	const parts: string[] = [];

	for (const [index, childNode] of node.childNodes.entries()) {
		if (childNode === undefined) continue;

		if (childNode.nodeName === '#text') {
			parts.push(sanitizeAnsi(childNode.nodeValue));
			continue;
		}

		if (childNode.nodeName === 'ink-text' || childNode.nodeName === 'ink-virtual-text') {
			const nested = squashTextNodes(childNode);
			if (nested.length === 0) continue;
			parts.push(
				typeof childNode.internal_transform === 'function'
					? childNode.internal_transform(nested, index)
					: nested,
			);
		}
	}

	return parts.join('');
};

export default squashTextNodes;
