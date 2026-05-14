import { describe, it, expect } from 'vitest';
import { h, defineComponent } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text, useStdout, useStderr } from '../src/index.ts';
import { createCaptureStream, flush } from './helpers.ts';

describe('useStdout()', () => {
	it('exposes the live stdout passed to render()', async () => {
		const stdout = createCaptureStream(20);
		let observed: NodeJS.WriteStream | undefined;
		const App = defineComponent({
			setup() {
				observed = useStdout().stdout;
				return () => h(Text, null, () => 'x');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		instance.unmount();
		expect(observed).toBe(stdout);
	});

	it('write() prints text above the live frame, then repaints', async () => {
		const stdout = createCaptureStream(20);
		let writeAbove: ((s: string) => void) | undefined;
		const App = defineComponent({
			setup() {
				writeAbove = useStdout().write;
				return () => h(Text, null, () => 'frame');
			},
		});
		const instance = render(App, { stdout, interactive: true });
		await flush();
		writeAbove!('above\n');
		await flush();
		instance.unmount();
		const joined = stripAnsi(stdout.frames.join(''));
		// Both the above-frame message and the frame content are visible after the round.
		expect(joined).toContain('above');
		expect(joined).toContain('frame');
	});

	it('throws when called outside of a render() context', () => {
		expect(() => useStdout()).toThrow(/render\(\)/i);
	});
});

describe('useStderr()', () => {
	it('routes write() to the provided stderr stream and never to stdout', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);
		let writeErr: ((s: string) => void) | undefined;
		const App = defineComponent({
			setup() {
				writeErr = useStderr().write;
				return () => h(Text, null, () => 'frame');
			},
		});
		const instance = render(App, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});
		await flush();
		writeErr!('boom\n');
		await flush();
		instance.unmount();

		const stderrJoined = stripAnsi(stderr.frames.join(''));
		const stdoutJoined = stripAnsi(stdout.frames.join(''));
		expect(stderrJoined).toContain('boom');
		expect(stdoutJoined).not.toContain('boom');
	});

	it('throws when called outside of a render() context', () => {
		expect(() => useStderr()).toThrow(/render\(\)/i);
	});
});
