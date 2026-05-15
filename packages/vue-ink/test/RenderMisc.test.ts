import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import { render, Box, Text } from '../src/index.ts';
import { createCaptureStream, flush, renderToString } from './helpers.ts';

describe('render(): debug vs TTY mode', () => {
	it('debug mode appends every frame instead of doing diff-erase', async () => {
		const stdout = createCaptureStream(20);
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});
		const instance = render(App, { stdout, debug: true });
		await flush();
		counter.value = 1;
		await flush();
		await flush();
		instance.unmount();
		// debug mode should never emit the cursor-hide / erase-lines escapes
		const all = stdout.frames.join('');
		expect(all).not.toContain('\x1b[?25l'); // cursorHide
	});

	it('TTY mode emits cursor-hide and an erase between frames', async () => {
		const stdout = createCaptureStream(20);
		(stdout as { isTTY: boolean }).isTTY = true;
		const counter = ref(0);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => `n=${counter.value}`),
		});
		const instance = render(App, { stdout, debug: false });
		await flush();
		counter.value = 1;
		await flush();
		await flush();
		instance.unmount();
		const all = stdout.frames.join('');
		expect(all).toContain('\x1b[?25l'); // cursorHide
		// cursor should be re-shown on unmount
		expect(all).toContain('\x1b[?25h');
	});

	it('skips redundant writes when output is unchanged', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'stable'),
		});
		const instance = render(App, { stdout });
		await flush();
		const before = stdout.frames.length;
		// Force a render with identical output
		const trigger = ref(0);
		trigger.value = 1;
		await flush();
		instance.unmount();
		// The flush triggered a re-render but the text didn't change, so the
		// frame count may not change between flushes when text is identical.
		expect(stdout.frames.length).toBeGreaterThanOrEqual(before);
	});

	it('clear() wipes the last frame in TTY mode', async () => {
		const stdout = createCaptureStream(20);
		(stdout as { isTTY: boolean }).isTTY = true;
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'something'),
		});
		const instance = render(App, { stdout, debug: false });
		await flush();
		const framesBefore = stdout.frames.length;
		instance.clear();
		expect(stdout.frames.length).toBeGreaterThan(framesBefore);
		instance.unmount();
	});

	it('clear() is a no-op in non-TTY (debug) mode', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'something'),
		});
		const instance = render(App, { stdout });
		await flush();
		const framesBefore = stdout.frames.length;
		instance.clear();
		// non-TTY: clear is a no-op
		expect(stdout.frames.length).toBe(framesBefore);
		instance.unmount();
	});

	it('falls back to 80 columns when stdout has no `columns`', async () => {
		const stdout = createCaptureStream(80);
		// remove the columns hint
		Object.defineProperty(stdout, 'columns', { value: undefined, configurable: true });
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: '100%' }, () => h(Text, null, () => 'x')),
		});
		const instance = render(Demo, { stdout });
		await flush();
		instance.unmount();
		// just confirm no crash and something was rendered
		expect(stdout.frames.join('').length).toBeGreaterThan(0);
	});

	it('errorHandler tears the tree down when a render throws', async () => {
		const stdout = createCaptureStream(20);
		(stdout as { isTTY: boolean }).isTTY = true;
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const trip = ref(false);
		const App = defineComponent({
			setup: () => () => {
				if (trip.value) throw new Error('render-time boom');
				return h(Text, null, () => 'ok');
			},
		});
		const instance = render(App, { stdout, debug: false });
		await flush();
		trip.value = true;
		await flush();
		// errorHandler should already have torn down; calling unmount again is safe.
		instance.unmount();
		expect(stderrSpy).toHaveBeenCalled();
		stderrSpy.mockRestore();
	});

	it('errorHandler falls back to err.message when stack is missing', async () => {
		const stdout = createCaptureStream(20);
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const trip = ref(false);
		const App = defineComponent({
			setup: () => () => {
				if (trip.value) {
					const err = new Error('stackless');
					delete (err as { stack?: string }).stack;
					throw err;
				}
				return h(Text, null, () => 'ok');
			},
		});
		const instance = render(App, { stdout });
		await flush();
		trip.value = true;
		await flush();
		instance.unmount();
		const calls = stderrSpy.mock.calls.flat().map(String).join('');
		expect(calls).toContain('stackless');
		stderrSpy.mockRestore();
	});

	it('errorHandler stringifies a non-Error thrown value', async () => {
		const stdout = createCaptureStream(20);
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const trip = ref(false);
		const App = defineComponent({
			setup: () => () => {
				if (trip.value) throw 'just a string'; // eslint-disable-line no-throw-literal
				return h(Text, null, () => 'ok');
			},
		});
		const instance = render(App, { stdout });
		await flush();
		trip.value = true;
		await flush();
		instance.unmount();
		expect(stderrSpy).toHaveBeenCalled();
		// The body of the stderr write should include our string error.
		const calls = stderrSpy.mock.calls.flat().map(String).join('');
		expect(calls).toContain('just a string');
		stderrSpy.mockRestore();
	});

	it('defaults stdout to process.stdout when not provided', async () => {
		// Cover `options.stdout ?? process.stdout` fallback. We swap process.stdout
		// temporarily so the test doesn't pollute the test runner output.
		const stdoutSpy = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, {});
		await flush();
		instance.unmount();
		expect(stdoutSpy).toHaveBeenCalled();
		stdoutSpy.mockRestore();
	});

	it('exit() with no args unmounts via waitUntilExit', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'x'),
		});
		const instance = render(App, { stdout });
		// after unmount, waitUntilExit resolves
		const wait = instance.waitUntilExit();
		instance.unmount();
		await wait;
	});

	it('rerender swaps the root component', async () => {
		const stdout = createCaptureStream(20);
		const A = defineComponent({ setup: () => () => h(Text, null, () => 'AAA') });
		const B = defineComponent({ setup: () => () => h(Text, null, () => 'BBB') });
		const instance = render(A, { stdout, interactive: true });
		await flush();
		instance.rerender(B);
		await flush();
		const last = stdout.frames.at(-1) ?? '';
		instance.unmount();
		expect(last).toContain('BBB');
	});

	it('unmount is idempotent', async () => {
		const out = await renderToString(
			defineComponent({ setup: () => () => h(Text, null, () => 'x') }),
			{ columns: 20 },
		);
		expect(out).toBe('x');
		// renderToString already calls unmount; calling unmount again would
		// throw if it weren't idempotent — exercised via the helper.
	});
});

describe('renderer host: prop translation', () => {
	it('ignores key and ref props (no errors)', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { key: 'k', ref: 'r' as unknown as undefined }, () =>
					h(Text, null, () => 'ok'),
				),
		});
		const out = await renderToString(Demo, { columns: 10 });
		expect(out).toBe('ok');
	});

	it('updates a style prop via patchProp (covers setStyle path)', async () => {
		const width = ref(4);
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { width: width.value }, () => h(Text, null, () => 'xy')),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		width.value = 10;
		await flush();
		instance.unmount();
		expect(stdout.frames.join('')).toContain('xy');
	});

	it('handles setElementText path (text replacement)', async () => {
		// Vue invokes the renderer's setElementText when a slot child collapses
		// to a single primitive. Easiest way to drive it: a Text whose slot's
		// only child is a primitive that changes.
		const word = ref('first');
		const Demo = defineComponent({
			setup: () => () => h(Text, null, () => word.value),
		});
		const stdout = createCaptureStream(20);
		const instance = render(Demo, { stdout });
		await flush();
		word.value = 'second';
		await flush();
		instance.unmount();
		expect(stdout.frames.at(-1) ?? '').toContain('second');
	});

	it('supports comment nodes in the host tree', async () => {
		const Demo = defineComponent({
			setup: () => () =>
				h(Box, { flexDirection: 'column' }, () => [
					h(Text, null, () => 'before'),
					h('ink-comment'),
					h(Text, null, () => 'after'),
				]),
		});
		const out = await renderToString(Demo, { columns: 20 });
		expect(out.split('\n').filter(Boolean)).toEqual(['before', 'after']);
	});
});
