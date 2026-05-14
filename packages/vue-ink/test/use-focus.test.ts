import { describe, it, expect } from 'vitest';
import { h, defineComponent, ref, type Ref } from 'vue';
import { render, useFocus } from '../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	renderReusable,
} from './helpers.ts';

const TAB = '\t';
const SHIFT_TAB = '\x1b[Z';

describe('useFocus', () => {
	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => useFocus()).toThrow(/useFocus/);
	});

	it('returns an isFocused ref starting at false when no autoFocus', async () => {
		const fakeStdin = createFakeStdin();
		let captured: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				captured = useFocus();
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(captured).not.toBeNull();
		expect(captured!.isFocused.value).toBe(false);
		instance.unmount();
	});

	it('autoFocus claims focus on mount when no other focusable is active', async () => {
		const fakeStdin = createFakeStdin();
		let captured: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				captured = useFocus({ autoFocus: true });
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(captured!.isFocused.value).toBe(true);
		instance.unmount();
	});

	it('autoFocus does not steal focus when another focusable already has it', async () => {
		const fakeStdin = createFakeStdin();
		let first: ReturnType<typeof useFocus> | null = null;
		let second: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				first = useFocus({ autoFocus: true, id: 'first' });
				second = useFocus({ autoFocus: true, id: 'second' });
				return () => h('ink-text');
			},
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });
		expect(first!.isFocused.value).toBe(true);
		expect(second!.isFocused.value).toBe(false);
		instance.unmount();
	});

	it('cycles focus forward on Tab in DOM order', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let c: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				c = useFocus({ id: 'c' });
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		expect(a!.isFocused.value).toBe(true);

		fakeStdin.emitData(TAB);
		await flush();
		expect(a!.isFocused.value).toBe(false);
		expect(b!.isFocused.value).toBe(true);

		fakeStdin.emitData(TAB);
		await flush();
		expect(b!.isFocused.value).toBe(false);
		expect(c!.isFocused.value).toBe(true);

		// Wrap around to first.
		fakeStdin.emitData(TAB);
		await flush();
		expect(c!.isFocused.value).toBe(false);
		expect(a!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('cycles focus backwards on Shift+Tab', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let c: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				c = useFocus({ id: 'c' });
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		expect(a!.isFocused.value).toBe(true);

		fakeStdin.emitData(SHIFT_TAB);
		await flush();
		expect(a!.isFocused.value).toBe(false);
		expect(c!.isFocused.value).toBe(true);

		fakeStdin.emitData(SHIFT_TAB);
		await flush();
		expect(c!.isFocused.value).toBe(false);
		expect(b!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('skips entries with isActive=false during cycling but keeps them in the registry', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let c: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b', isActive: false });
				c = useFocus({ id: 'c' });
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });

		// Tab should skip 'b' (inactive) and land on 'c'.
		fakeStdin.emitData(TAB);
		await flush();
		expect(b!.isFocused.value).toBe(false);
		expect(c!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('releases focus when isActive ref flips to false while focused', async () => {
		const fakeStdin = createFakeStdin();
		const isActive: Ref<boolean> = ref(true);
		let target: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				target = useFocus({ autoFocus: true, isActive, id: 'target' });
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		expect(target!.isFocused.value).toBe(true);

		isActive.value = false;
		await flush();
		expect(target!.isFocused.value).toBe(false);

		instance.unmount();
	});

	it('deregisters on unmount so Tab does not target it', async () => {
		const fakeStdin = createFakeStdin();
		const showFirst: Ref<boolean> = ref(true);
		let first: ReturnType<typeof useFocus> | null = null;
		let second: ReturnType<typeof useFocus> | null = null;
		const Inner = defineComponent({
			setup() {
				first = useFocus({ autoFocus: true, id: 'first' });
				return () => h('ink-text');
			},
		});
		const Outer = defineComponent({
			setup() {
				second = useFocus({ id: 'second' });
				return () => (showFirst.value ? h(Inner) : h('ink-text'));
			},
		});
		const { instance, flush } = await renderReusable(Outer, { stdin: fakeStdin });
		expect(first!.isFocused.value).toBe(true);

		showFirst.value = false;
		await flush();
		// Tab should go to second (the only remaining focusable).
		fakeStdin.emitData(TAB);
		await flush();
		expect(second!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('exposes a focus(id) helper that switches to the matching entry', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });

		a!.focus('b');
		await flush();
		expect(a!.isFocused.value).toBe(false);
		expect(b!.isFocused.value).toBe(true);

		instance.unmount();
	});
});
