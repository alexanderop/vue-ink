// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import sanitizeAnsi from './sanitize-ansi.ts';
import { type DOMElement } from './dom.ts';

const squashTextNodes = (node: DOMElement): string => {
	const parts: string[] = [];
	// `internal_transform` callers (e.g. <Transform>) read `index` as the
	// child's position among *renderable* siblings. Skip Vue fragment anchors
	// — both ink-comment nodes and empty #text placeholders that Vue inserts
	// around v-if/v-else slot branches — when counting; they occupy DOM slots
	// but never produce output. See dom.ts:142 for the same convention.
	let renderableIndex = 0;

	for (const childNode of node.childNodes) {
		if (childNode === undefined) continue;

		if (childNode.nodeName === '#text') {
			if (childNode.nodeValue.length === 0) continue;
			parts.push(sanitizeAnsi(childNode.nodeValue));
			renderableIndex += 1;
			continue;
		}

		if (childNode.nodeName === 'ink-text' || childNode.nodeName === 'ink-virtual-text') {
			const nested = squashTextNodes(childNode);
			if (nested.length === 0) {
				renderableIndex += 1;
				continue;
			}
			parts.push(
				typeof childNode.internal_transform === 'function'
					? childNode.internal_transform(nested, renderableIndex)
					: nested,
			);
			renderableIndex += 1;
		}
	}

	return parts.join('');
};

export default squashTextNodes;
