import process from 'node:process';
import Yoga from 'yoga-layout';
import ansiEscapes from 'ansi-escapes';
import { h, shallowRef, type Component } from 'vue';
import { createApp } from './renderer.ts';
import { createNode, Output, renderNodeToOutput, type DOMElement } from '@vue-ink/core';
import { createInputManager } from './input.ts';
import { APP_CONTEXT_KEY, STDIN_CONTEXT_KEY } from './context.ts';

export type RenderOptions = {
	stdout?: NodeJS.WriteStream;
	stdin?: NodeJS.ReadStream;
	debug?: boolean;
	exitOnCtrlC?: boolean;
};

export type Instance = {
	rerender: (component: Component) => void;
	unmount: () => void;
	waitUntilExit: () => Promise<void>;
	clear: () => void;
};

const noop = (): void => {};

const renderTree = (
	rootNode: DOMElement,
	terminalWidth: number,
): { output: string; height: number } => {
	rootNode.yogaNode!.setWidth(terminalWidth);
	rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

	const output = new Output({
		width: rootNode.yogaNode!.getComputedWidth(),
		height: rootNode.yogaNode!.getComputedHeight(),
	});
	renderNodeToOutput(rootNode, output, {});
	const { output: text, height } = output.get();
	return { output: text, height };
};

const render = (component: Component, options: RenderOptions = {}): Instance => {
	const stdout = options.stdout ?? process.stdout;
	const stdin = options.stdin ?? process.stdin;
	const debug = options.debug ?? false;
	const exitOnCtrlC = options.exitOnCtrlC ?? true;
	const isTTY = Boolean((stdout as NodeJS.WriteStream).isTTY);
	const writeStream = stdout as NodeJS.WriteStream;
	const useTTYFrame = isTTY && !debug;

	const rootNode = createNode('ink-root');
	const currentComponent = shallowRef<Component>(component);
	const Root = {
		render: () => h(currentComponent.value),
	};
	const app = createApp(Root);

	let lastOutput = '';
	let lastLineCount = 0;
	// The Promise constructor runs its executor synchronously, so by the time
	// these are read elsewhere they're always the real resolve/reject — the
	// no-op assertions here just satisfy the type checker before assignment.
	let exitResolve: () => void = noop;
	let exitReject: (err: Error) => void = noop;
	const exitPromise = new Promise<void>((resolve, reject) => {
		exitResolve = resolve;
		exitReject = reject;
	});
	let unmounted = false;
	let cursorHidden = false;

	// Forward-declared because inputManager/app callbacks below close over it,
	// but the real body (which itself calls inputManager.destroy/app.unmount)
	// can only be assembled once those values exist.
	let unmount: () => void = noop;

	const inputManager = createInputManager({
		stdin,
		exitOnCtrlC,
		onCtrlC: () => unmount(),
	});

	app.provide(APP_CONTEXT_KEY, {
		exit: (error?: Error) => {
			if (error) exitReject(error);
			unmount();
		},
	});
	app.provide(STDIN_CONTEXT_KEY, {
		stdin,
		isRawModeSupported: inputManager.isRawModeSupported,
		setRawMode: inputManager.setRawMode,
		emitter: inputManager.emitter,
		internal_exitOnCtrlC: exitOnCtrlC,
	});

	const getTerminalWidth = (): number => {
		const cols = writeStream.columns;
		return typeof cols === 'number' && cols > 0 ? cols : 80;
	};

	const doRender = (): void => {
		if (unmounted) return;
		const { output: text } = renderTree(rootNode, getTerminalWidth());

		if (debug) {
			writeStream.write(`${text}\n`);
			return;
		}

		if (text === lastOutput) return;

		if (useTTYFrame) {
			if (!cursorHidden) {
				writeStream.write(ansiEscapes.cursorHide);
				cursorHidden = true;
			}
			const erase = lastLineCount > 0 ? ansiEscapes.eraseLines(lastLineCount + 1) : '';
			writeStream.write(`${erase}${text}\n`);
		} else {
			writeStream.write(`${text}\n`);
		}

		lastOutput = text;
		lastLineCount = text.split('\n').length;
	};

	rootNode.onRender = doRender;
	rootNode.onComputeLayout = () => {
		rootNode.yogaNode!.setWidth(getTerminalWidth());
	};

	app.config.errorHandler = (err, _instance, info) => {
		if (unmounted) return;
		// Erase the half-painted frame so the terminal isn't left in a weird
		// state, then print the error and tear down cleanly.
		if (useTTYFrame && lastLineCount > 0) {
			writeStream.write(ansiEscapes.eraseLines(lastLineCount + 1));
			lastOutput = '';
			lastLineCount = 0;
		}
		const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
		process.stderr.write(`vue-ink render error (${info}):\n${stack}\n`);
		unmount();
	};

	const onResize = (): void => {
		// Width changed — previous line count can't be trusted for erase math
		// and the new layout may differ even from identical state.
		lastOutput = '';
		lastLineCount = 0;
		doRender();
	};

	const onSignal = (): void => {
		unmount();
	};

	const onBeforeExit = (): void => {
		unmount();
	};
	let beforeExitRegistered = false;

	unmount = (): void => {
		if (unmounted) return;
		unmounted = true;
		writeStream.off('resize', onResize);
		if (exitOnCtrlC) {
			process.off('SIGINT', onSignal);
			process.off('SIGTERM', onSignal);
		}
		if (beforeExitRegistered) {
			process.off('beforeExit', onBeforeExit);
			beforeExitRegistered = false;
		}
		inputManager.destroy();
		app.unmount();
		if (useTTYFrame && cursorHidden) {
			writeStream.write(ansiEscapes.cursorShow);
			cursorHidden = false;
		}
		if (rootNode.yogaNode) {
			rootNode.yogaNode.freeRecursive();
			rootNode.yogaNode = undefined;
		}
		exitResolve();
	};

	app.mount(rootNode);

	if (useTTYFrame || !debug) {
		writeStream.on('resize', onResize);
	}

	if (exitOnCtrlC) {
		process.on('SIGINT', onSignal);
		process.on('SIGTERM', onSignal);
	}

	// Mount-time mutations queue a post-flush render; flush it synchronously
	// here so the first frame is written before render() returns.
	doRender();

	const rerender = (newComponent: Component): void => {
		currentComponent.value = newComponent;
	};

	return {
		rerender,
		unmount,
		waitUntilExit: () => {
			if (!beforeExitRegistered && !unmounted) {
				process.once('beforeExit', onBeforeExit);
				beforeExitRegistered = true;
			}
			return exitPromise;
		},
		clear() {
			if (useTTYFrame && lastLineCount > 0) {
				writeStream.write(ansiEscapes.eraseLines(lastLineCount + 1));
				lastOutput = '';
				lastLineCount = 0;
			}
		},
	};
};

export default render;
