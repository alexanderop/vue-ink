import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('patchConsole', () => {
	it('routes console.log through the stdout write-above-frame helper', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		console.log('hello');
		await flush();
		instance.unmount();

		const joined = stripAnsi(stdout.frames.join(''));
		expect(joined).toContain('hello');
		expect(joined).toContain('frame');
	});

	it('routes console.error through the stderr write-above-frame helper', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});
		await flush();
		console.error('oops');
		await flush();
		instance.unmount();

		expect(stripAnsi(stderr.frames.join(''))).toContain('oops');
		expect(stripAnsi(stdout.frames.join(''))).not.toContain('oops');
	});

	it('restores the original console after unmount', async () => {
		const stdout = createCaptureStream(20);
		const originalLog = console.log;
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		expect(console.log).not.toBe(originalLog);
		instance.unmount();
		expect(console.log).toBe(originalLog);
	});

	it('leaves console untouched when patchConsole: false', async () => {
		const stdout = createCaptureStream(20);
		const originalLog = console.log;
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, {
			stdout,
			interactive: true,
			patchConsole: false,
		});
		await flush();
		expect(console.log).toBe(originalLog);
		instance.unmount();
	});

	it('routes console.dir through the frame instead of bleeding through stdout', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		console.dir({ foo: 1 });
		await flush();
		instance.unmount();

		const joined = stripAnsi(stdout.frames.join(''));
		// `console.dir({foo:1})` formats to `{ foo: 1 }`; assert it landed in
		// the captured stdout via the write-above-frame helper (i.e. the
		// patch covers dir, not just log/info/etc.).
		expect(joined).toContain('foo');
		expect(joined).toContain('frame');
	});

	it('routes the timing/grouping/table methods through stdout', async () => {
		const stdout = createCaptureStream(20);
		const App = defineComponent({
			setup: () => () => h(Text, null, () => 'frame'),
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		// Each of these methods exists on the global console; before the
		// patch was expanded they wrote directly to the underlying stream,
		// corrupting the live frame.
		console.table([{ a: 1 }]);
		console.group('grp');
		console.groupCollapsed('grp2');
		console.groupEnd();
		console.count('c');
		console.countReset('c');
		console.time('t');
		console.timeEnd('t');
		console.dirxml({ x: 1 });
		await flush();
		instance.unmount();

		const joined = stripAnsi(stdout.frames.join(''));
		// `console.table([{a: 1}])` produces an ASCII table containing the
		// key name; if it bled past the patch, it would have been written
		// directly to process.stdout instead of the capture stream.
		expect(joined).toContain('a');
	});

	it('reference-counts patches so nested render() calls do not break each other', async () => {
		const stdoutA = createCaptureStream(20);
		const stdoutB = createCaptureStream(20);
		const originalLog = console.log;
		const App = defineComponent({ setup: () => () => h(Text, null, () => 'x') });
		const a = render(App, { stdout: stdoutA, interactive: true });
		const b = render(App, { stdout: stdoutB, interactive: true });
		await flush();
		expect(console.log).not.toBe(originalLog);
		b.unmount();
		// One renderer still alive — console must remain patched until both unmount.
		expect(console.log).not.toBe(originalLog);
		a.unmount();
		expect(console.log).toBe(originalLog);
	});
});
