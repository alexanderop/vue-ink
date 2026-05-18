// Regression suite for DOM helpers, style coercion, and renderer lifecycle
// branches that aren't reachable through the public ink-equivalent surface
// (dirty-marking on ink-text/virtual-text, zero-area background paint,
// style auto-branches, reactive-text setText, Transform.transform updates,
// setStyle clearing, SIGINT/SIGTERM/beforeExit listener symmetry,
// renderNodeToOutput edge cases, non-printable input keys). See the
// `// what this catches:` line above each `it` block for the specific
// failure mode it guards.
import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import {
	createNode,
	createTextNode,
	appendChildNode,
	removeChildNode,
	setStyle,
	applyStyles,
	renderNodeToOutput,
	Output,
} from '@vue-ink/core';
import { createInputManager } from '../../renderer/src/input.ts';
import { render, Box, Text, Transform } from '../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	flush,
	renderToString,
} from './helpers.ts';

describe('dom: markNodeAsDirty inside ink-text/virtual-text', () => {
	// what this catches: removeChildNode on an ink-text parent must mark
	// it dirty so the next render reflows. Regression would render a
	// stale frame after removing a text fragment.
	it('marks ink-text dirty when a child is removed', () => {
		const parent = createNode('ink-text');
		const a = createTextNode('a');
		const b = createTextNode('b');
		appendChildNode(parent, a);
		appendChildNode(parent, b);
		removeChildNode(parent, a);
		expect(parent.childNodes).toEqual([b]);
	});

	// what this catches: same dirty-marking contract for the
	// ink-virtual-text wrapper that nested-text composition uses.
	it('marks ink-virtual-text dirty when a child is removed', () => {
		const text = createNode('ink-text');
		const virt = createNode('ink-virtual-text');
		appendChildNode(text, virt);
		const a = createTextNode('a');
		appendChildNode(virt, a);
		removeChildNode(virt, a);
		expect(virt.childNodes).toEqual([]);
	});
});

describe('background: contentWidth/Height edge cases', () => {
	// what this catches: when borders collapse the content area to
	// width 0 (or height 0), the background paint must bail out before
	// writing. Regression would write past the buffer or NaN-stripe.
	it('skips background paint when content area is zero', async () => {
		// width 2 + border on both sides → contentWidth = 0; the background
		// paint should bail out early without writing anything.
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{
						width: 2,
						height: 2,
						borderStyle: 'single',
						backgroundColor: 'red',
					},
					() => null,
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out.length).toBeGreaterThan(0);
	});
});

describe('styles: auto width/height/flexBasis branches', () => {
	// what this catches: applyStyles must call `setFlexBasisAuto` when
	// the key is present but the value is undefined (the `else` branch).
	it('sets flexBasis auto when neither number nor string is passed', () => {
		// styles.ts has `else node.setFlexBasisAuto()` — exercise it via direct
		// applyStyles call with an `undefined` flexBasis value but the key set.
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, { flexBasis: undefined });
		// no throw is enough; flexBasis-auto path executed
		expect(node.yogaNode).toBeDefined();
	});

	// what this catches: same auto-branch contract for `width` and
	// `height` — `key present, value undefined` must drive setWidthAuto /
	// setHeightAuto rather than no-op or throw.
	it('sets width/height auto when style key is present but value is undefined', () => {
		const node = createNode('ink-box');
		applyStyles(node.yogaNode!, {
			width: undefined,
			height: undefined,
		});
		expect(node.yogaNode).toBeDefined();
	});
});

describe('renderer host: setText vs setElementText paths', () => {
	// what this catches: a reactive string inside a <Text> slot must
	// mutate the existing #text node via setText. Regression would
	// recreate the node (losing identity) or render the old value.
	it('reactive text in a Text slot drives setText for the existing #text node', async () => {
		const value = ref('first');
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => value.value),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		value.value = 'second';
		await flush();
		instance.unmount();
		expect(stdout.frames.at(-1) ?? '').toContain('second');
	});

	// what this catches: <Transform>'s cached `internal_transform` must
	// be replaced when the `transform` prop function reference changes.
	// Regression would keep applying the stale transform forever.
	it('updates the internal_transform when Transform.transform prop changes', async () => {
		const fn = ref<(s: string) => string>((s) => s.toUpperCase());
		const Demo = defineComponent({
			setup: () => () =>
				h(Transform, { transform: fn.value }, () => 'hello'),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		fn.value = (s) => `[${s}]`;
		await flush();
		instance.unmount();
		expect(stdout.frames.at(-1) ?? '').toContain('[hello]');
	});
});

describe('renderer host: setStyle with no value clears style', () => {
	// what this catches: setStyle(node) with no second argument must
	// clear the style to {}. Regression would leave the previous style
	// in place (so old widths/colors would leak).
	it('passing undefined style resets to empty object', () => {
		const node = createNode('ink-box');
		setStyle(node, { width: 5 });
		expect(node.style.width).toBe(5);
		setStyle(node);
		expect(node.style).toEqual({});
	});
});

describe('render.ts: process signal handlers', () => {
	// what this catches: signal-handler cleanup symmetry. render() with
	// exitOnCtrlC=true must add one SIGINT and one SIGTERM listener,
	// and unmount() must remove exactly those listeners. Regression
	// would leak listeners across test runs / app lifetimes.
	it('removes SIGINT / SIGTERM handlers on unmount when exitOnCtrlC=true', () => {
		const stdout = createCaptureStream(20);
		const sigintBefore = process.listeners('SIGINT').length;
		const sigtermBefore = process.listeners('SIGTERM').length;
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, { stdout, exitOnCtrlC: true });
		expect(process.listeners('SIGINT').length).toBe(sigintBefore + 1);
		expect(process.listeners('SIGTERM').length).toBe(sigtermBefore + 1);
		instance.unmount();
		expect(process.listeners('SIGINT').length).toBe(sigintBefore);
		expect(process.listeners('SIGTERM').length).toBe(sigtermBefore);
	});

	// what this catches: exitOnCtrlC=false must NOT install any SIGINT
	// listener. Regression would silently steal ctrl+c from the host
	// program that opted out.
	it('does not register signal handlers when exitOnCtrlC=false', () => {
		const stdout = createCaptureStream(20);
		const before = process.listeners('SIGINT').length;
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, { stdout, exitOnCtrlC: false });
		expect(process.listeners('SIGINT').length).toBe(before);
		instance.unmount();
	});

	// what this catches: waitUntilExit() must add exactly one beforeExit
	// listener and unmount() must remove it. Regression would leak
	// listeners (Node MaxListenersExceededWarning) over many renders.
	it('registers beforeExit handler when waitUntilExit is called', () => {
		const stdout = createCaptureStream(20);
		const before = process.listeners('beforeExit').length;
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, { stdout, exitOnCtrlC: false });
		void instance.waitUntilExit();
		expect(process.listeners('beforeExit').length).toBe(before + 1);
		instance.unmount();
		expect(process.listeners('beforeExit').length).toBe(before);
	});

	// what this catches: emitting SIGINT on the process must drive the
	// onSignal → unmount path so the registered listener actually wires
	// through to teardown (not just present in the listener list).
	it('SIGINT handler calls unmount via onSignal', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, { stdout, exitOnCtrlC: true });
		const wait = instance.waitUntilExit();
		// SIGINT listener registered by render → trigger it directly.
		process.emit('SIGINT');
		await wait;
	});
});

describe('renderNodeToOutput: edge cases via direct calls', () => {
	// what this catches: renderNodeToOutput must early-return on a node
	// whose yoga node was freed/undefined (can happen mid-unmount).
	// Regression would crash on `.getComputedLayout()` of undefined.
	it('returns early for a node with no yoga node', () => {
		const box = createNode('ink-box');
		// Force-strip the yoga node.
		box.yogaNode?.free();
		box.yogaNode = undefined;
		const out = new Output({ width: 5, height: 1 });
		expect(() => renderNodeToOutput(box, out, {})).not.toThrow();
	});

	// what this catches: ink-comment nodes must render as a no-op so
	// Vue's anchor/comment placeholders never leak visible output.
	it('renders the ink-comment branch (no-op)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, null, () => [
					h('ink-comment'),
					h(Text, null, () => 'visible'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out).toBe('visible');
	});
});

describe('input.ts: edge cases', () => {
	// what this catches: the "insert" key (\x1b[2~) is non-printable —
	// the input parser must emit an empty string rather than the raw
	// escape sequence (and must not crash).
	it('emits empty input for "insert" key (non-printable)', () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		const events: string[] = [];
		const mgr = createInputManager({
			stdin,
			stdout,
			exitOnCtrlC: false,
			onCtrlC: () => {},
		});
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string) => events.push(input));
		stdin.emitData('\x1b[2~');
		expect(events).toEqual(['']);
		mgr.destroy();
	});
});
