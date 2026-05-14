import { describe, it, expect } from 'vitest';
import { h, defineComponent, watch } from 'vue';
import { render, useFocus, useFocusManager } from '../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	renderReusable,
} from './helpers.ts';

const TAB = '\t';

describe('useFocusManager', () => {
	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => useFocusManager()).toThrow(/useFocusManager/);
	});

	it('focus(id) activates the matching useFocus entry', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		expect(a!.isFocused.value).toBe(true);

		manager!.focus('b');
		await flush();
		expect(a!.isFocused.value).toBe(false);
		expect(b!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('focus(unknown-id) is a no-op', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		manager!.focus('does-not-exist');
		await flush();
		expect(a!.isFocused.value).toBe(true);
		expect(manager!.activeId.value).toBe('a');
		instance.unmount();
	});

	it('disableFocus() clears activeId and ignores Tab', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });

		manager!.disableFocus();
		await flush();
		expect(manager!.activeId.value).toBeUndefined();
		expect(a!.isFocused.value).toBe(false);

		fakeStdin.emitData(TAB);
		await flush();
		expect(a!.isFocused.value).toBe(false);
		expect(b!.isFocused.value).toBe(false);
		expect(manager!.activeId.value).toBeUndefined();

		instance.unmount();
	});

	it('enableFocus() restores Tab handling but does not auto-focus the previous element', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });

		manager!.disableFocus();
		await flush();
		expect(a!.isFocused.value).toBe(false);

		manager!.enableFocus();
		await flush();
		// enableFocus does not auto-focus the previous element.
		expect(manager!.activeId.value).toBeUndefined();
		expect(a!.isFocused.value).toBe(false);
		expect(b!.isFocused.value).toBe(false);

		// Tab now picks up the first active focusable.
		fakeStdin.emitData(TAB);
		await flush();
		expect(a!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('focusNext / focusPrevious leave activeId undefined when every focusable is inactive', async () => {
		const fakeStdin = createFakeStdin();
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				useFocus({ id: 'a', isActive: false });
				useFocus({ id: 'b', isActive: false });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		manager!.focusNext();
		await flush();
		expect(manager!.activeId.value).toBeUndefined();

		manager!.focusPrevious();
		await flush();
		expect(manager!.activeId.value).toBeUndefined();

		instance.unmount();
	});

	it('focusNext / focusPrevious cycle programmatically', async () => {
		const fakeStdin = createFakeStdin();
		let a: ReturnType<typeof useFocus> | null = null;
		let b: ReturnType<typeof useFocus> | null = null;
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				a = useFocus({ autoFocus: true, id: 'a' });
				b = useFocus({ id: 'b' });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });

		manager!.focusNext();
		await flush();
		expect(b!.isFocused.value).toBe(true);

		manager!.focusPrevious();
		await flush();
		expect(a!.isFocused.value).toBe(true);

		instance.unmount();
	});

	it('activeId is a reactive ref that consumers can watch', async () => {
		const fakeStdin = createFakeStdin();
		const seen: Array<string | undefined> = [];
		let manager: ReturnType<typeof useFocusManager> | null = null;
		const Demo = defineComponent({
			setup() {
				useFocus({ autoFocus: true, id: 'a' });
				useFocus({ id: 'b' });
				manager = useFocusManager();
				watch(
					() => manager!.activeId.value,
					(value) => {
						seen.push(value);
					},
				);
				return () => h('ink-text');
			},
		});
		const { instance, flush } = await renderReusable(Demo, { stdin: fakeStdin });
		manager!.focus('b');
		await flush();
		expect(seen).toContain('b');
		instance.unmount();
	});
});

describe('useFocusManager + useFocus integration', () => {
	it('returns focus to a remembered id after a modal closes', async () => {
		const fakeStdin = createFakeStdin();
		let manager: ReturnType<typeof useFocusManager> | null = null;
		let trigger: ReturnType<typeof useFocus> | null = null;
		const stdout = createCaptureStream(20);
		const Demo = defineComponent({
			setup() {
				trigger = useFocus({ autoFocus: true, id: 'trigger' });
				useFocus({ id: 'other' });
				manager = useFocusManager();
				return () => h('ink-text');
			},
		});
		const instance = render(Demo, { stdout, stdin: fakeStdin, exitOnCtrlC: false });

		manager!.focus('other');
		const remembered = manager!.activeId.value;
		expect(remembered).toBe('other');

		manager!.focus('trigger');
		expect(trigger!.isFocused.value).toBe(true);

		// Simulate "modal closed → restore prior focus".
		manager!.focus(remembered!);
		expect(manager!.activeId.value).toBe('other');
		expect(trigger!.isFocused.value).toBe(false);

		instance.unmount();
	});
});
