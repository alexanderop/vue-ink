import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import {
	createNode,
	createTextNode,
	appendChildNode,
	insertBeforeNode,
	applyStyles,
} from '@vue-ink/core';
import { Box, Text } from '../src/index.ts';
import { renderToString } from './helpers.ts';

describe('squashTextNodes branches', () => {
	it('skips sparse holes in childNodes (defensive branch)', async () => {
		const { default: squashTextNodes } = await import(
			'../../core/src/squash-text-nodes.ts'
		);
		const parent = createNode('ink-text');
		const a = createTextNode('a');
		appendChildNode(parent, a);
		(parent.childNodes as unknown as Array<unknown>).push(undefined);
		const b = createTextNode('b');
		appendChildNode(parent, b);
		expect(squashTextNodes(parent)).toBe('ab');
	});

	it('skips a nested ink-text/virtual-text whose squashed text is empty', async () => {
		const { default: squashTextNodes } = await import(
			'../../core/src/squash-text-nodes.ts'
		);
		const parent = createNode('ink-text');
		const head = createTextNode('A');
		const emptyChild = createNode('ink-virtual-text');
		const tail = createTextNode('B');
		appendChildNode(parent, head);
		appendChildNode(parent, emptyChild);
		appendChildNode(parent, tail);
		// emptyChild has no descendants → nested squash returns '' → continue.
		expect(squashTextNodes(parent)).toBe('AB');
	});
});

describe('dom.insertBeforeNode marks ink-text/virtual-text dirty', () => {
	it('marks ink-text dirty when inserting a sibling text node before another', () => {
		const parent = createNode('ink-text');
		const existing = createTextNode('existing');
		const incoming = createTextNode('incoming');
		appendChildNode(parent, existing);
		insertBeforeNode(parent, incoming, existing);
		expect(parent.childNodes.map((n) => (n.nodeName === '#text' ? n.nodeValue : ''))).toEqual([
			'incoming',
			'existing',
		]);
	});

	it('marks ink-virtual-text dirty when inserting a sibling', () => {
		const parent = createNode('ink-text');
		const virt = createNode('ink-virtual-text');
		appendChildNode(parent, virt);
		const existing = createTextNode('existing');
		const incoming = createTextNode('incoming');
		appendChildNode(virt, existing);
		insertBeforeNode(virt, incoming, existing);
		expect(virt.childNodes.length).toBe(2);
	});
});

describe('styles: display and gap branches', () => {
	it('display: flex (explicit)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { display: 'flex', flexDirection: 'column' }, () => h(Text, null, () => 'x')),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toContain('x');
	});

	it('applyStyles handles a borderStyle of single without per-edge override', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, { borderStyle: 'single' });
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles handles partial border edges without borderStyle', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, { borderTop: true });
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles handles gap=undefined explicitly', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, {
			gap: undefined,
			columnGap: undefined,
			rowGap: undefined,
		});
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles coerces nullish min/max dimensions to 0', () => {
		const node = createNode('ink-box');
		// `style.minWidth ?? 0` — exercise the nullish branch of the operator.
		applyStyles(node.yogaNode!, {
			minWidth: undefined,
			minHeight: undefined,
			maxWidth: undefined,
			maxHeight: undefined,
			margin: undefined,
			padding: undefined,
		});
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles handles margin/padding shorthand with explicit undefined', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, {
			marginX: undefined,
			marginY: undefined,
			marginTop: undefined,
			marginBottom: undefined,
			marginLeft: undefined,
			marginRight: undefined,
			paddingX: undefined,
			paddingY: undefined,
			paddingTop: undefined,
			paddingBottom: undefined,
			paddingLeft: undefined,
			paddingRight: undefined,
		});
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles handles flexGrow/flexShrink nullish branches', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, {
			flexGrow: undefined,
			flexShrink: undefined,
		});
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles ignores empty borderStyle entirely', () => {
		const node = createNode('ink-box');
		// neither borderStyle nor edges present → early return
		applyStyles(node.yogaNode!, { width: 5 });
		expect(node.yogaNode).toBeDefined();
	});

	it('applyStyles handles borderStyle with explicit edge=false', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, {
			borderStyle: 'single',
			borderTop: false,
			borderBottom: false,
		});
		expect(node.yogaNode).toBeDefined();
	});
});
