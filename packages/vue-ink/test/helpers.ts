import { Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { defineComponent, h, nextTick, type Component } from 'vue';
import stripAnsi from 'strip-ansi';
import { vi } from 'vitest';
import { render, renderToString as publicRenderToString } from '../src/index.ts';
import { _flushActiveInstances } from '@vue-ink/renderer';

export const createCaptureStream = (
	columns = 80,
	options: { isTTY?: boolean } = {},
): NodeJS.WriteStream & {
	frames: string[];
} => {
	const frames: string[] = [];
	const stream = new Writable({
		write(chunk, _enc, cb) {
			frames.push(chunk.toString());
			cb();
		},
	}) as Writable & {
		columns: number;
		isTTY: boolean;
		frames: string[];
	};

	stream.columns = columns;
	stream.isTTY = options.isTTY ?? false;
	stream.frames = frames;
	return stream as unknown as NodeJS.WriteStream & { frames: string[] };
};

// Drain Vue's scheduler only — does not wait for any throttled paint to land.
// Useful inside throttle tests where the test itself drives the fake timer
// and wants to inspect the pre-trailing-edge state.
export const flushVueOnly = async (): Promise<void> => {
	await nextTick();
	await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
};

export const flush = async (): Promise<void> => {
	await flushVueOnly();
	// Drain any throttled paints that the renderer queued behind the maxFps
	// window so tests inspect frames that have actually landed on stdout.
	await _flushActiveInstances();
};

export type RenderToStringOptions = {
	columns?: number;
};

export type RenderReusableOptions = {
	columns?: number;
	stdin?: NodeJS.ReadStream;
	exitOnCtrlC?: boolean;
	interactive?: boolean;
};

// Thin wrappers over the public `renderToString` so the test suite stays
// terse (`stripAnsi` + trim) while exercising the same code path users get.
export const renderToString = async (
	component: Component,
	options: RenderToStringOptions = {},
): Promise<string> =>
	stripAnsi(publicRenderToString(component, options)).replace(/\n+$/, '');

export const renderToStringRaw = async (
	component: Component,
	options: RenderToStringOptions = {},
): Promise<string> => publicRenderToString(component, options);

export type RenderResult = {
	stdout: ReturnType<typeof createCaptureStream>;
	instance: ReturnType<typeof render>;
	flush: () => Promise<void>;
	output: () => string;
	rawOutput: () => string;
};

// For tests that need to rerender or assert across multiple frames. Goes
// through the full `render()` pipeline (frames, throttling, etc.) — only
// `renderToString` is a public ink-equivalent; this stays a local helper.
export const renderReusable = async (
	component: Component,
	options: RenderReusableOptions = {},
): Promise<RenderResult> => {
	const stdout = createCaptureStream(options.columns ?? 80);
	const instance = render(component, {
		stdout,
		stdin: options.stdin,
		exitOnCtrlC: options.exitOnCtrlC,
		interactive: options.interactive ?? true,
	});
	await flush();
	return {
		stdout,
		instance,
		flush,
		output: () => stripAnsi(stdout.frames.join('')).replace(/\n+$/, ''),
		rawOutput: () => stdout.frames.join(''),
	};
};

// Convenience for one-shot wrap of a slot function into a defineComponent.
export const componentOf = (render: () => unknown): Component =>
	defineComponent({
		setup: () => () => render() as ReturnType<typeof h>,
	});

export type FakeStdin = NodeJS.ReadStream & {
	emit: (event: string, ...args: unknown[]) => boolean;
	emitData: (chunk: string | Buffer) => void;
};

// Mock stdin for input-handling tests. `isTTY` defaults to true; pass false
// to exercise the no-raw-mode path. `supportsRawMode: false` keeps isTTY=true
// but omits setRawMode so isRawModeSupported reports false.
export const createFakeStdin = (
	options: { isTTY?: boolean; supportsRawMode?: boolean } = {},
): FakeStdin => {
	const { isTTY = true, supportsRawMode = true } = options;
	const emitter = new EventEmitter() as unknown as FakeStdin;
	(emitter as { isTTY: boolean }).isTTY = isTTY;
	if (supportsRawMode) {
		(emitter as { setRawMode: (mode: boolean) => unknown }).setRawMode = vi.fn(
			() => emitter,
		);
	}
	(emitter as { resume: () => void }).resume = vi.fn();
	(emitter as { pause: () => void }).pause = vi.fn();
	emitter.emitData = (chunk) => {
		const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
		emitter.emit('data', buf);
	};
	return emitter;
};
