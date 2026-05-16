import { describe, it, expect } from 'vitest';
import { defineComponent, h, watch } from 'vue';
import { render } from '@vue-ink/testing-library';
import { Box, Text, useFocus, useFocusManager } from '../../src/index.ts';

// Ported from repos/ink/test/focus.tsx. Drives Tab/Shift+Tab/Esc through the
// testing library's fake stdin instead of a PTY.

type TestProps = {
	autoFocus?: boolean;
	showFirst?: boolean;
	disableFirst?: boolean;
	disableSecond?: boolean;
	disableThird?: boolean;
};

const Item = defineComponent({
	props: {
		label: { type: String, required: true as const },
		autoFocus: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
	},
	setup(props) {
		const { isFocused } = useFocus({
			autoFocus: props.autoFocus,
			isActive: () => !props.disabled,
		});
		return () =>
			h(Text, null, () => `${props.label}${isFocused.value ? ' ✔' : ''}`);
	},
});

const TestApp = (props: TestProps = {}) =>
	defineComponent({
		setup() {
			useFocusManager();
			return () =>
				h(Box, { flexDirection: 'column' }, () => [
					props.showFirst === false
						? null
						: h(Item, {
								label: 'First',
								autoFocus: props.autoFocus ?? false,
								disabled: props.disableFirst ?? false,
							}),
					h(Item, {
						label: 'Second',
						autoFocus: props.autoFocus ?? false,
						disabled: props.disableSecond ?? false,
					}),
					h(Item, {
						label: 'Third',
						autoFocus: props.autoFocus ?? false,
						disabled: props.disableThird ?? false,
					}),
				]);
		},
	});

describe('focus', () => {
	it('does not auto-focus when autoFocus is off', async () => {
		const { lastFrame, waitUntilFlush } = render(TestApp());
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First', 'Second', 'Third'].join('\n'));
	});

	it('focuses the first component when autoFocus is on', async () => {
		const { lastFrame, waitUntilFlush } = render(
			TestApp({ autoFocus: true }),
		);
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First ✔', 'Second', 'Third'].join('\n'));
	});

	it('switches focus to first component on Tab from empty', async () => {
		const { lastFrame, stdin, waitUntilFlush } = render(TestApp());
		await waitUntilFlush();
		stdin.write('\t');
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First ✔', 'Second', 'Third'].join('\n'));
	});

	it('advances to next component on Tab', async () => {
		const { lastFrame, stdin, waitUntilFlush } = render(TestApp());
		await waitUntilFlush();
		stdin.write('\t');
		stdin.write('\t');
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First', 'Second ✔', 'Third'].join('\n'));
	});

	it('wraps to first component when Tab from last', async () => {
		const { lastFrame, stdin, waitUntilFlush } = render(
			TestApp({ autoFocus: true }),
		);
		await waitUntilFlush();
		stdin.write('\t'); // First → Second
		stdin.write('\t'); // Second → Third
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First', 'Second', 'Third ✔'].join('\n'));

		stdin.write('\t'); // Third → First (wrap)
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First ✔', 'Second', 'Third'].join('\n'));
	});

	it('skips a disabled component on Tab', async () => {
		const { lastFrame, stdin, waitUntilFlush } = render(
			TestApp({ autoFocus: true, disableSecond: true }),
		);
		await waitUntilFlush();
		stdin.write('\t'); // First → (skip Second) → Third
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First', 'Second', 'Third ✔'].join('\n'));
	});

	it('switches to previous component on Shift+Tab', async () => {
		const { lastFrame, stdin, waitUntilFlush } = render(
			TestApp({ autoFocus: true }),
		);
		await waitUntilFlush();
		stdin.write('\t'); // First → Second
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First', 'Second ✔', 'Third'].join('\n'));

		stdin.write('[Z'); // Shift+Tab → Second → First
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First ✔', 'Second', 'Third'].join('\n'));
	});

	it('skips disabled component on Shift+Tab', async () => {
		const { lastFrame, stdin, waitUntilFlush } = render(
			TestApp({ autoFocus: true, disableSecond: true }),
		);
		await waitUntilFlush();
		stdin.write('\t'); // First → Third (skip Second)
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First', 'Second', 'Third ✔'].join('\n'));

		stdin.write('[Z'); // Shift+Tab → (skip Second) → First
		await waitUntilFlush();
		expect(lastFrame()).toBe(['First ✔', 'Second', 'Third'].join('\n'));
	});

	it('exposes activeId from useFocusManager', async () => {
		const observed: Array<string | undefined> = [];
		const Probe = defineComponent({
			setup() {
				const { activeId } = useFocusManager();
				useFocus({ autoFocus: true, id: 'alpha' });
				watch(activeId, (id) => observed.push(id), { immediate: true });
				return () => h(Text, null, () => 'probe');
			},
		});

		const { waitUntilFlush, unmount } = render(Probe);
		await waitUntilFlush();
		unmount();
		expect(observed.at(-1)).toBe('alpha');
	});
});
