import { EventEmitter } from 'node:events';
import { render as vueInkRender, type Instance as RenderInstance } from '@vue-ink/renderer';
import type { Component } from 'vue';

// Strip a single trailing newline added by the renderer's debug-mode write
// (`${text}\n`) so `lastFrame()` returns the rendered content without
// transport padding, matching ink-testing-library's documented behaviour.
const trimFrame = (raw: string): string =>
	raw.endsWith('\n') ? raw.slice(0, -1) : raw;

export class Stdout extends EventEmitter {
	readonly frames: string[] = [];
	#lastFrame: string | undefined;
	columns = 100;
	isTTY = false;

	write = (frame: string): void => {
		const trimmed = trimFrame(frame);
		this.frames.push(trimmed);
		this.#lastFrame = trimmed;
	};

	lastFrame = (): string | undefined => this.#lastFrame;
}

export class Stderr extends EventEmitter {
	readonly frames: string[] = [];
	#lastFrame: string | undefined;

	write = (frame: string): void => {
		const trimmed = trimFrame(frame);
		this.frames.push(trimmed);
		this.#lastFrame = trimmed;
	};

	lastFrame = (): string | undefined => this.#lastFrame;
}

export type StdinOptions = {
	isTTY?: boolean;
};

export class Stdin extends EventEmitter {
	isTTY: boolean;
	#data: string | null = null;

	constructor(options: StdinOptions = {}) {
		super();
		this.isTTY = options.isTTY ?? true;
		// EventEmitter caps at 10 by default — vue-ink composables can attach
		// several listeners (input, paste, focus) per render() call.
		this.setMaxListeners(0);
	}

	write = (data: string): void => {
		this.#data = data;
		this.emit('readable');
		this.emit('data', data);
	};

	setEncoding(): void {}
	setRawMode(): void {}
	resume(): void {}
	pause(): void {}
	ref(): void {}
	unref(): void {}

	read = (): string | null => {
		const data = this.#data;
		this.#data = null;
		return data;
	};
}

export type RenderResult = {
	stdout: Stdout;
	stderr: Stderr;
	stdin: Stdin;
	frames: string[];
	lastFrame: () => string | undefined;
	rerender: (component: Component) => void;
	unmount: () => void;
	cleanup: () => void;
	/**
	 * Vue commits state changes on `nextTick`. Await this after mutating a
	 * `ref` or triggering an event to ensure the resulting frame has landed
	 * in `frames` / `lastFrame()` before asserting.
	 */
	waitUntilFlush: () => Promise<void>;
};

const activeInstances = new Set<RenderInstance>();

export const render = (component: Component): RenderResult => {
	const stdout = new Stdout();
	const stderr = new Stderr();
	const stdin = new Stdin();

	const instance = vueInkRender(component, {
		stdout: stdout as unknown as NodeJS.WriteStream,
		stderr: stderr as unknown as NodeJS.WriteStream,
		stdin: stdin as unknown as NodeJS.ReadStream,
		// `debug: true` makes the renderer emit each frame as a full string
		// instead of ANSI cursor diffs — required for frame-by-frame
		// assertions. `maxFps: Infinity` disables throttling so a single
		// commit produces a single frame synchronously.
		debug: true,
		exitOnCtrlC: false,
		patchConsole: false,
		maxFps: Number.POSITIVE_INFINITY,
	});

	activeInstances.add(instance);

	let unmounted = false;
	const unmount = (): void => {
		if (unmounted) return;
		unmounted = true;
		instance.unmount();
		activeInstances.delete(instance);
	};

	return {
		stdout,
		stderr,
		stdin,
		frames: stdout.frames,
		lastFrame: stdout.lastFrame,
		rerender: instance.rerender,
		unmount,
		cleanup: unmount,
		waitUntilFlush: () => instance.waitUntilRenderFlush(),
	};
};

export const cleanup = (): void => {
	for (const instance of activeInstances) instance.unmount();
	activeInstances.clear();
};
