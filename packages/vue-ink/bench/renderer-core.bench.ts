import { bench, describe } from 'vitest';
import Yoga from 'yoga-layout';
import {
	appendChildNode,
	applyStyles,
	createNode,
	createTextNode,
	Output,
	renderNodeToOutput,
	setStyle,
	type DOMElement,
	type Styles,
} from '@vue-ink/core';

// Build a DOMElement tree directly — no Vue, no reactivity, no scheduler.
// Lets us measure ONLY the layout + paint cost, so we can tell whether a
// regression lives in Vue glue or in the renderer's hot path.

// Pair node.style with Yoga's style state — setStyle alone leaves Yoga blind.
const style = (node: DOMElement, s: Styles): void => {
	setStyle(node, s);
	applyStyles(node.yogaNode!, s);
};

const buildFlatList = (count: number): DOMElement => {
	const root = createNode('ink-root');
	style(root, { flexDirection: 'column' });
	for (let i = 0; i < count; i += 1) {
		const text = createNode('ink-text');
		appendChildNode(text, createTextNode(`row ${i}`));
		appendChildNode(root, text);
	}
	return root;
};

const buildNestedBoxes = (depth: number): DOMElement => {
	const root = createNode('ink-root');
	let cursor: DOMElement = root;
	for (let i = 0; i < depth; i += 1) {
		const box = createNode('ink-box');
		style(box, { paddingLeft: 1, flexDirection: 'column' });
		appendChildNode(cursor, box);
		cursor = box;
	}
	const leaf = createNode('ink-text');
	appendChildNode(leaf, createTextNode('leaf'));
	appendChildNode(cursor, leaf);
	return root;
};

const buildStyledGrid = (rows: number, cols: number): DOMElement => {
	const root = createNode('ink-root');
	style(root, { flexDirection: 'column' });
	for (let r = 0; r < rows; r += 1) {
		const row = createNode('ink-box');
		style(row, { flexDirection: 'row' });
		for (let c = 0; c < cols; c += 1) {
			const cell = createNode('ink-box');
			style(cell, { borderStyle: 'single', paddingX: 1, marginRight: 1 });
			const text = createNode('ink-text');
			appendChildNode(text, createTextNode(`${r},${c}`));
			appendChildNode(cell, text);
			appendChildNode(row, cell);
		}
		appendChildNode(root, row);
	}
	return root;
};

const paint = (root: DOMElement, width: number): void => {
	root.yogaNode!.setWidth(width);
	root.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
	const output = new Output({
		width: root.yogaNode!.getComputedWidth(),
		height: root.yogaNode!.getComputedHeight(),
	});
	renderNodeToOutput(root, output, {});
	output.get();
};

// One tree built outside the timed block; the bench just paints it repeatedly.
// Mirrors the rerender-without-structural-change case (most real frames).
describe('renderer core — paint pre-built tree', () => {
	const flat100 = buildFlatList(100);
	bench('FlatList(100) — paint', () => {
		paint(flat100, 80);
	});

	const flat1000 = buildFlatList(1000);
	bench('FlatList(1000) — paint', () => {
		paint(flat1000, 80);
	});

	const deep50 = buildNestedBoxes(50);
	bench('NestedBoxes(50) — paint', () => {
		paint(deep50, 80);
	});

	const grid20x10 = buildStyledGrid(20, 10);
	bench('StyledGrid(20x10) — paint', () => {
		paint(grid20x10, 200);
	});
});
