import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { Box, Text, render } from '../src/index.ts';
import {
	createCaptureStream,
	createFakeStdin,
	flush,
} from './helpers.ts';

// Ported from repos/ink/test/log-update.tsx — the incremental-rendering
// block. ink unit-tests its `logUpdate` module directly; vue-ink doesn't
// have a comparable shim today, so we drive the renderer end-to-end and
// assert the wire output of two paints.
//
// These tests currently fail: `RenderOptions.incrementalRendering` is
// not implemented (see brain/porting/from-react-ink.md → "What's NOT yet
// ported"). The whole point of these tests is to capture the wire
// contract before someone implements the feature.

const ESC = String.fromCharCode(0x1b);
const cursorNextLine = `${ESC}[E`;
const eraseLines = (count: number): string => {
	if (count === 0) return '';
	let out = '';
	for (let i = 0; i < count; i += 1) {
		out += `${ESC}[2K`;
		if (i < count - 1) out += `${ESC}[1A`;
	}
	out += `${ESC}[G`;
	return out;
};

// `incrementalRendering` is not yet on RenderOptions — cast through `any`
// so this file compiles. Once implemented, replace this with a direct
// option and delete the cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderIncremental = (component: any, stdout: any, stdin: any) =>
	render(component, {
		stdout,
		stdin,
		exitOnCtrlC: false,
		interactive: true,
		incrementalRendering: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any);

describe('incrementalRendering', () => {
	it('is accepted as a RenderOption without warnings', async () => {
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => 'hello'),
		});
		const instance = renderIncremental(Demo, stdout, stdin);
		await flush();
		expect(stdout.frames.join('')).toContain('hello');
		instance.unmount();
	});

	it('skips identical output (no extra paint when state is unchanged)', async () => {
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const tick = ref(0);
		const Demo = defineComponent({
			setup() {
				return () => h(Text, null, () => `tick:${tick.value % 1}`);
			},
		});
		const instance = renderIncremental(Demo, stdout, stdin);
		await flush();
		const framesAfterMount = stdout.frames.length;
		// `% 1` always returns 0 — re-running setup yields identical output.
		tick.value += 1;
		await flush();
		expect(stdout.frames.length).toBe(framesAfterMount);
		instance.unmount();
	});

	it('surgical update: only the changed line is rewritten, unchanged lines are skipped via cursorNextLine', async () => {
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const middle = ref('Line 2');
		const Demo = defineComponent({
			setup() {
				return () =>
					h(Box, { flexDirection: 'column' }, () => [
						h(Text, null, () => 'Line 1'),
						h(Text, null, () => middle.value),
						h(Text, null, () => 'Line 3'),
					]);
			},
		});
		const instance = renderIncremental(Demo, stdout, stdin);
		await flush();
		const framesBeforeUpdate = stdout.frames.length;

		middle.value = 'Updated';
		await flush();

		const update = stdout.frames.slice(framesBeforeUpdate).join('');
		expect(update).toContain(cursorNextLine);
		expect(update).toContain('Updated');
		// Unchanged lines must not be re-written.
		expect(update).not.toContain('Line 1');
		expect(update).not.toContain('Line 3');
		instance.unmount();
	});

	it('shrinking output erases the dropped lines with eraseLines', async () => {
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const showAll = ref(true);
		const Demo = defineComponent({
			setup() {
				return () =>
					h(Box, { flexDirection: 'column' }, () =>
						showAll.value
							? [
									h(Text, null, () => 'Line 1'),
									h(Text, null, () => 'Line 2'),
									h(Text, null, () => 'Line 3'),
								]
							: [h(Text, null, () => 'Line 1')],
					);
			},
		});
		const instance = renderIncremental(Demo, stdout, stdin);
		await flush();
		const framesBeforeShrink = stdout.frames.length;

		showAll.value = false;
		await flush();

		const update = stdout.frames.slice(framesBeforeShrink).join('');
		// dropped = prevVisible - nextVisible = 2; plus the trailing-newline
		// slot the cursor parked on after the previous paint = 3 erases total.
		// Mirrors ink's log-update.ts:265-274.
		expect(update).toContain(eraseLines(3));
		// Surviving prefix should not be re-emitted under incremental.
		expect(update).not.toContain('Line 1');
		instance.unmount();
	});

	it('shrink: erase happens BEFORE any rewrite/cursor-move (correct byte order)', async () => {
		// Regression: prior buildIncrementalDiff wrote new lines first and then
		// called eraseLines, which erased the just-written rows instead of the
		// dropped tail. The byte order must be:
		//   (optional returnPrefix) -> eraseLines(dropped+1) -> cursorUp(nextVisible) -> rewrite/cursorNextLine
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const showAll = ref(true);
		const Demo = defineComponent({
			setup() {
				return () =>
					h(Box, { flexDirection: 'column' }, () =>
						showAll.value
							? [
									h(Text, null, () => 'Line 1'),
									h(Text, null, () => 'Line 2'),
									h(Text, null, () => 'Line 3'),
								]
							: [h(Text, null, () => 'Line 1')],
					);
			},
		});
		renderIncremental(Demo, stdout, stdin);
		await flush();
		const framesBeforeShrink = stdout.frames.length;

		showAll.value = false;
		await flush();

		const update = stdout.frames.slice(framesBeforeShrink).join('');
		const eraseIdx = update.indexOf(eraseLines(3));
		const cursorNextLineIdx = update.indexOf(cursorNextLine);
		expect(eraseIdx).toBeGreaterThanOrEqual(0);
		expect(cursorNextLineIdx).toBeGreaterThanOrEqual(0);
		// eraseLines MUST come before any per-row work (cursorNextLine, content,
		// cursorTo). Otherwise the erase wipes new content and leaves stale rows.
		expect(eraseIdx).toBeLessThan(cursorNextLineIdx);
	});

	it('shrink to zero erases the entire previous frame', async () => {
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const show = ref(true);
		const Demo = defineComponent({
			setup() {
				return () =>
					h(Box, { flexDirection: 'column' }, () =>
						show.value
							? [
									h(Text, null, () => 'Line 1'),
									h(Text, null, () => 'Line 2'),
								]
							: [],
					);
			},
		});
		const instance = renderIncremental(Demo, stdout, stdin);
		await flush();
		const framesBeforeShrink = stdout.frames.length;

		show.value = false;
		await flush();

		const update = stdout.frames.slice(framesBeforeShrink).join('');
		// dropped = 2, plus trailing-newline park slot = eraseLines(3).
		expect(update).toContain(eraseLines(3));
		// Nothing from the previous frame should be re-emitted.
		expect(update).not.toContain('Line 1');
		expect(update).not.toContain('Line 2');
		instance.unmount();
	});

	it('growing output appends new lines without rewriting the unchanged prefix', async () => {
		const stdout = createCaptureStream(40);
		const stdin = createFakeStdin();
		const showAll = ref(false);
		const Demo = defineComponent({
			setup() {
				return () =>
					h(Box, { flexDirection: 'column' }, () =>
						showAll.value
							? [
									h(Text, null, () => 'Line 1'),
									h(Text, null, () => 'Line 2'),
									h(Text, null, () => 'Line 3'),
								]
							: [h(Text, null, () => 'Line 1')],
					);
			},
		});
		const instance = renderIncremental(Demo, stdout, stdin);
		await flush();
		const framesBeforeGrow = stdout.frames.length;

		showAll.value = true;
		await flush();

		const update = stdout.frames.slice(framesBeforeGrow).join('');
		expect(update).toContain(cursorNextLine);
		expect(update).toContain('Line 2');
		expect(update).toContain('Line 3');
		expect(update).not.toContain('Line 1');
		instance.unmount();
	});
});
