import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import { render, Box, Text, useInput as useInputComposable } from '../src/index.ts';
import { createInputManager } from '../../renderer/src/input.ts';
import {
	createCaptureStream,
	createFakeStdin,
	flush,
} from './helpers.ts';

describe('input.ts: str default branches', () => {
	it('coerces undefined str to empty input for unknown raw event', () => {
		const stdin = createFakeStdin();
		const seen: string[] = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string) => seen.push(input));
		// No str, raw with a non-NON_PRINTABLE name and no ctrl → input = str ?? '' = ''
		stdin.emitKeypress(undefined, { name: 'unknownkey' });
		expect(seen).toEqual(['']);
		mgr.destroy();
	});

	it('coerces null str to empty input', () => {
		const stdin = createFakeStdin();
		const seen: string[] = [];
		const mgr = createInputManager({ stdin, exitOnCtrlC: false, onCtrlC: () => {} });
		mgr.setRawMode(true);
		mgr.emitter.on('input', (input: string) => seen.push(input));
		stdin.emit('keypress', null, {});
		expect(seen).toEqual(['']);
		mgr.destroy();
	});
});

describe('render.ts: ctrl+c via stdin triggers unmount', () => {
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
		stdin.emitKeypress('\x03', { name: 'c', ctrl: true });
		await wait;
	});
});

describe('render.ts: beforeExit handler', () => {
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

	it('drives setElementText via h(tag, null, string) shape', async () => {
		// Passing a primitive string as the third h() arg sets TEXT_CHILDREN
		// shapeFlag, which Vue translates to setElementText on the host.
		const text = ref('first');
		const Demo = defineComponent({
			setup: () => () => h('ink-text', null, text.value),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
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
