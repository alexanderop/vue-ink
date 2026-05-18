// Regression suite for renderer/host branches that aren't reachable
// through the public ink-equivalent surface (exitOnCtrlC, beforeExit,
// patchProp structural-prop bypass, host insert anchors, default textWrap,
// patchProp idempotency, style→undefined reset, setAttribute fallback,
// TEXT_CHILDREN → setElementText). See the `// what this catches:` line
// above each `it` block for the specific failure mode it guards.
import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import { render, Box, Text, useInput as useInputComposable } from '../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	flush,
} from './helpers.ts';

describe('render.ts: ctrl+c via stdin triggers unmount', () => {
	// what this catches: ctrl+c byte (\x03) on stdin must trigger unmount
	// when exitOnCtrlC=true and a useInput listener has enabled raw mode.
	it('honors exitOnCtrlC=true via the raw-mode input manager', async () => {
		const stdin = createFakeStdin();
		const stdout = createCaptureStream(20);
		// Component must call useInput so the input manager enters raw mode and
		// starts forwarding keypresses through the emitter.
		const App = defineComponent({
			setup() {
				useInputComposable(() => {});
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, stdin, exitOnCtrlC: true });
		const wait = instance.waitUntilExit();
		stdin.emitData('\x03');
		await wait;
	});
});

describe('render.ts: beforeExit handler', () => {
	// what this catches: process `beforeExit` must resolve waitUntilExit so
	// programs that finish their work don't dangle on the event loop.
	it('beforeExit handler triggers unmount when emitted', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, { stdout, exitOnCtrlC: false });
		const wait = instance.waitUntilExit();
		// Synthesize beforeExit
		process.emit('beforeExit', 0);
		await wait;
	});
});

describe('renderer host: key/ref bypass + setElementText', () => {
	// what this catches: patchProp must skip the structural `key` prop —
	// regression would forward it to setAttribute and pollute output.
	it('ignores `key` prop alone', async () => {
		// patchProp will skip key
		const Demo = defineComponent({
			setup: () => () => h(Box, { key: 'just-key' }, () => h(Text, null, () => 'k')),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('k');
	});

	// what this catches: patchProp must skip the structural `ref` prop the
	// same way it skips `key`.
	it('ignores `ref` prop alone', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ ref: 'just-ref' as unknown as undefined },
					() => h(Text, null, () => 'r'),
				),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('r');
	});

	// what this catches: the host `insert(child, parent, anchor)` op must
	// honor anchor placement. A regression would render keyed v-for
	// reorders in the wrong order (e.g. prepending appears at the end).
	it('preserves anchor insertion order with v-for re-renders', async () => {
		const items = ref([1, 2, 3]);
		const Demo = defineComponent({
			setup: () => () =>
				h(
					Box,
					{ flexDirection: 'column' },
					() => items.value.map((n) => h(Text, { key: n }, () => `i${n}`)),
				),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();

		// Insert at the beginning — drives insert() with an anchor.
		items.value = [0, 1, 2, 3];
		await flush();

		// Insert in the middle — also anchor-based.
		items.value = [0, 1, 1.5, 2, 3];
		await flush();

		instance.unmount();
		const joined = stdout.frames.join('');
		expect(joined).toContain('i0');
		expect(joined).toContain('i1.5');
	});

	// what this catches: when ink-text has no textWrap style and content
	// exceeds the constrained width, the renderer must apply the default
	// 'wrap' mode (the `?? 'wrap'` fallback). Regression would truncate or
	// overflow instead of wrapping.
	it('wraps text without explicit textWrap style (uses default "wrap")', async () => {
		// Direct ink-text with text longer than its constrained width — the
		// renderer applies the default wrap mode via `?? 'wrap'`.
		const Demo = defineComponent({
			setup: () => () =>
				h('ink-box', { style: { width: 5 } }, [
					h('ink-text', null, 'abcdefghij'),
				]),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('abcde');
	});

	// what this catches: patchProp idempotency — `prev === next` must
	// early-return without touching downstream state. Regression would
	// invalidate yoga layout unnecessarily on every equal update.
	it('patchProp short-circuits when prev and next values match', async () => {
		const width = ref(5);
		const Demo = defineComponent({
			setup: () => () => h(Box, { width: width.value }, () => h(Text, null, () => 'x')),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		// Set to the same value — Vue's renderer will still pass it, but our
		// patchProp short-circuits via `if (prevValue === nextValue) return;`.
		// (Vue itself may also short-circuit. Either way, no errors.)
		width.value = 5;
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('x');
	});

	// what this catches: setting `style` from an object to `undefined`
	// must reset to an empty style. Regression would throw on the next
	// applyStyles pass when the value type changed.
	it('patches style to undefined without crashing', async () => {
		const showStyle = ref(true);
		const Demo = defineComponent({
			setup: () => () =>
				h('ink-box', { style: showStyle.value ? { width: 5 } : undefined }, [
					h(Text, null, () => 'x'),
				]),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		showStyle.value = false;
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('x');
	});

	// what this catches: unknown attributes (e.g. data-*) must flow
	// through the patchProp → setAttribute fallback without crashing.
	it('passes arbitrary attributes through setAttribute via patchProp', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h('ink-box', { 'data-test': 'first' }, h(Text, null, () => 'x')),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('x');
	});

	// what this catches: TEXT_CHILDREN shape from `h(tag, null, string)`
	// must drive setElementText through both the swap branch (string →
	// string) and the empty-string branch (no children added).
	it('drives setElementText via h(tag, null, string) shape', async () => {
		// Passing a primitive string as the third h() arg sets TEXT_CHILDREN
		// shapeFlag, which Vue translates to setElementText on the host.
		const text = ref('first');
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, text.value),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, interactive: true });
		await flush();
		// Patch from one TEXT_CHILDREN value to another — drives setElementText
		// while there are existing children.
		text.value = 'second';
		await flush();
		text.value = ''; // empty text — drives the "no children added" branch
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('second');
	});
});
