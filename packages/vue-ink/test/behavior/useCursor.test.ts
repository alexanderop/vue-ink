import { describe, it, expect, beforeAll } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { Box, Text, render, useInput } from '../../src/index.ts';
// `useCursor` is the missing port from react-ink. Tests below are TDD-style:
// they document the desired API and currently fail because `useCursor` is
// not exported. See brain/porting/from-react-ink.md.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VueInkApi = (await import('../../src/index.ts')) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCursor: () => {
	setCursorPosition: (pos: { x: number; y: number } | undefined) => void;
} = VueInkApi.useCursor ?? (() => ({ setCursorPosition: () => {} }));

beforeAll(() => {
	expect(
		typeof VueInkApi.useCursor,
		'useCursor must be exported from @vue-ink/renderer (currently missing — see brain/porting/from-react-ink.md)',
	).toBe('function');
});
import {
	createCaptureStream,
	createFakeStdin,
	flush,
} from '../helpers.ts';

// Ported from repos/ink/test/cursor.tsx — adapted to vue-ink's
// createCaptureStream + createFakeStdin pattern.

const showCursorEscape = '[?25h';
const hideCursorEscape = '[?25l';
const cursorToColumn = (x: number): string => `[${x + 1}G`;

const InputApp = defineComponent({
	setup() {
		const text = ref('');
		const { setCursorPosition } = useCursor();

		useInput((input, key) => {
			if (key.backspace || key.delete) {
				text.value = text.value.slice(0, -1);
				return;
			}
			if (!key.ctrl && !key.meta && input) {
				text.value += input;
			}
		});

		return () => {
			setCursorPosition({ x: 2 + text.value.length, y: 0 });
			return h(Box, null, () => h(Text, null, () => `> ${text.value}`));
		};
	},
});

describe('useCursor', () => {
	it('cursor is shown at the specified position after first render', async () => {
		const stdout = createCaptureStream();
		const stdin = createFakeStdin();
		const instance = render(InputApp, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			interactive: true,
		});
		await flush();

		const out = stdout.frames.join('');
		expect(out).toContain(showCursorEscape);
		expect(out).toContain(cursorToColumn(2));
		instance.unmount();
	});

	it('cursor follows text input', async () => {
		const stdout = createCaptureStream();
		const stdin = createFakeStdin();
		const instance = render(InputApp, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			interactive: true,
		});
		await flush();

		stdin.emitData('a');
		await flush();

		const out = stdout.frames.join('');
		expect(out).toContain(showCursorEscape);
		expect(out).toContain(cursorToColumn(3));
		instance.unmount();
	});

	it('last cursor visibility escape is SHOW, not HIDE, after first render', async () => {
		const stdout = createCaptureStream();
		const stdin = createFakeStdin();
		const instance = render(InputApp, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			interactive: true,
		});
		await flush();

		const out = stdout.frames.join('');
		expect(out.lastIndexOf(showCursorEscape)).toBeGreaterThan(
			out.lastIndexOf(hideCursorEscape),
		);
		instance.unmount();
	});

	it('cursor is hidden when the component calling useCursor unmounts', async () => {
		const CursorChild = defineComponent({
			setup() {
				const { setCursorPosition } = useCursor();
				return () => {
					setCursorPosition({ x: 5, y: 0 });
					return h(Text, null, () => 'child');
				};
			},
		});

		const Parent = defineComponent({
			setup() {
				const showChild = ref(true);
				useInput((_input, key) => {
					if (key.return) showChild.value = false;
				});
				return () =>
					h(Box, null, () =>
						showChild.value
							? h(CursorChild)
							: h(Text, null, () => 'no cursor'),
					);
			},
		});

		const stdout = createCaptureStream();
		const stdin = createFakeStdin();
		const instance = render(Parent, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			interactive: true,
		});
		await flush();

		const beforeUnmountFrames = stdout.frames.length;
		const initialOut = stdout.frames.join('');
		expect(initialOut).toContain(showCursorEscape);

		stdin.emitData('\r');
		await flush();

		const tail = stdout.frames.slice(beforeUnmountFrames).join('');
		expect(tail.lastIndexOf(hideCursorEscape)).toBeGreaterThan(
			tail.lastIndexOf(showCursorEscape),
		);
		instance.unmount();
	});

	it('multi-line output: cursor positioned at y=1 does not scroll the screen on rerender', async () => {
		const MultiLineApp = defineComponent({
			setup() {
				const text = ref('');
				const { setCursorPosition } = useCursor();
				useInput((input, key) => {
					if (!key.ctrl && !key.meta && input) text.value += input;
				});
				return () => {
					setCursorPosition({ x: 2 + text.value.length, y: 1 });
					return h(Box, { flexDirection: 'column' }, () => [
						h(Text, null, () => 'Header'),
						h(Text, null, () => `> ${text.value}`),
					]);
				};
			},
		});

		const stdout = createCaptureStream();
		const stdin = createFakeStdin();
		const instance = render(MultiLineApp, {
			stdout,
			stdin,
			exitOnCtrlC: false,
			interactive: true,
		});
		await flush();

		const beforeInputFrames = stdout.frames.length;
		stdin.emitData('x');
		await flush();

		const secondPaint = stdout.frames.slice(beforeInputFrames).join('');
		expect(secondPaint).toContain(hideCursorEscape);
		expect(secondPaint).toContain('x');
		instance.unmount();
	});
});
