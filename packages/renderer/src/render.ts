import process from 'node:process';
import { formatWithOptions } from 'node:util';
import Yoga from 'yoga-layout';
import ansiEscapes from 'ansi-escapes';
import { h, nextTick as vueNextTick, ref, shallowRef, type Component } from 'vue';
import { createApp } from './renderer.ts';
import {
	createNode,
	Output,
	renderNodeToOutput,
	renderStaticSubtrees,
	hasStaticContent,
	type DOMElement,
} from '@vue-ink/core';
import { createInputManager } from './input.ts';
import { createFocusManager } from './focus-context.ts';
import { BSU, ESU } from './write-synchronized.ts';
import {
	APP_CONTEXT_KEY,
	STDIN_CONTEXT_KEY,
	STDOUT_CONTEXT_KEY,
	STDERR_CONTEXT_KEY,
	ACCESSIBILITY_CONTEXT_KEY,
	FOCUS_CONTEXT_KEY,
	ANIMATION_CONTEXT_KEY,
} from './context.ts';
import { createAnimationScheduler } from './animation-scheduler.ts';
import {
	enableKittyKeyboard,
	disableKittyKeyboard,
	type KittyKeyboardOptions,
	type KittyFlagName,
} from './kitty-keyboard.ts';

export type RenderOptions = {
	stdout?: NodeJS.WriteStream;
	stdin?: NodeJS.ReadStream;
	stderr?: NodeJS.WriteStream;
	debug?: boolean;
	exitOnCtrlC?: boolean;
	kittyKeyboard?: KittyKeyboardOptions;
	/**
	 * Force interactive (`true`) or non-interactive (`false`) rendering. By
	 * default, interactive mode is enabled only when stdout is a TTY and the
	 * process is not running in CI. Non-interactive mode skips ANSI escapes,
	 * cursor manipulation, and the resize listener, emitting only the final
	 * frame on unmount.
	 */
	interactive?: boolean;
	/**
	 * Whether a screen reader is active. Components can read this via
	 * `useIsScreenReaderEnabled()` to render descriptive text instead of
	 * decoration. Defaults to `process.env.INK_SCREEN_READER === 'true'`.
	 */
	isScreenReaderEnabled?: boolean;
	/**
	 * Intercept `console.log` (etc.) and write the output above the live frame
	 * via the same choreography as `useStdout().write`. Reference-counted across
	 * concurrent `render()` calls. Default: `true`.
	 */
	patchConsole?: boolean;
	/**
	 * Invoked after each committed frame with render metrics. A throwing
	 * callback is logged to stderr and never propagates to the renderer.
	 */
	onRender?: (metrics: RenderMetrics) => void;
	/**
	 * Cap on the number of paints per second. Defaults to 30. Multiple state
	 * updates inside the throttle window collapse into a single trailing-edge
	 * frame so terminals over SSH stay responsive. Pass `Infinity` to render
	 * synchronously on every commit (mostly for tests). Must be > 0.
	 */
	maxFps?: number;
};

export type RenderMetrics = {
	frame: number;
	durationMs: number;
	lineCount: number;
	output: string;
};

const isCiEnv = (): boolean => {
	// `is-in-ci`'s entire logic, inlined: CI providers set one of these.
	const { env } = process;
	return Boolean(
		env['CI'] ||
			env['CONTINUOUS_INTEGRATION'] ||
			env['BUILD_NUMBER'] ||
			env['RUN_ID'],
	);
};

export type Instance = {
	rerender: (component: Component) => void;
	unmount: () => void;
	waitUntilExit: () => Promise<void>;
	waitUntilRenderFlush: () => Promise<void>;
	clear: () => void;
};

// One live renderer per stdout: reusing the same stream creates two renderers
// competing for the same lines. Mirrors ink's `instances.ts`.
const instances = new WeakMap<NodeJS.WriteStream, Instance>();

// Auxiliary registry kept alongside `instances` so test helpers can await
// pending paints across *all* live renderers. WeakMap isn't iterable; this
// is — entries are added on create, removed on unmount.
const activeInstances = new Set<Instance>();

// Test-only: await every active instance's next paint. Tests call this from
// the standalone `flush()` helper which doesn't carry an instance reference.
/* v8 ignore start — exercised only via test helpers */
export const _flushActiveInstances = async (): Promise<void> => {
	if (activeInstances.size === 0) return;
	await Promise.all([...activeInstances].map((i) => i.waitUntilRenderFlush()));
};
/* v8 ignore stop */

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace';
const CONSOLE_METHODS: readonly ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug', 'trace'];
type ConsoleSubscriber = {
	writeStdout: (data: string) => void;
	writeStderr: (data: string) => void;
};
const consoleSubscribers = new Set<ConsoleSubscriber>();
let originalConsoleMethods: Partial<Record<ConsoleMethod, Console[ConsoleMethod]>> | undefined;

const installConsolePatch = (): void => {
	if (originalConsoleMethods) return;
	originalConsoleMethods = {};
	for (const method of CONSOLE_METHODS) {
		originalConsoleMethods[method] = console[method];
		const isStderrChannel = method === 'warn' || method === 'error';
		console[method] = ((...args: unknown[]) => {
			const text = `${formatWithOptions({ colors: true }, ...args)}\n`;
			for (const sub of consoleSubscribers) {
				if (isStderrChannel) sub.writeStderr(text);
				else sub.writeStdout(text);
			}
		}) as Console[ConsoleMethod];
	}
};

const uninstallConsolePatch = (): void => {
	if (!originalConsoleMethods) return;
	for (const method of CONSOLE_METHODS) {
		if (originalConsoleMethods[method]) {
			console[method] = originalConsoleMethods[method]!;
		}
	}
	originalConsoleMethods = undefined;
};

const subscribeConsole = (sub: ConsoleSubscriber): (() => void) => {
	installConsolePatch();
	consoleSubscribers.add(sub);
	return () => {
		consoleSubscribers.delete(sub);
		if (consoleSubscribers.size === 0) uninstallConsolePatch();
	};
};

// Placeholder for forward-declared resolve/reject/unmount slots — replaced
// synchronously before the surrounding code reads them.
/* v8 ignore next */
const noop = (): void => {};

const renderTree = (
	rootNode: DOMElement,
	terminalWidth: number,
): { output: string; height: number; staticOutput: string } => {
	rootNode.yogaNode!.setWidth(terminalWidth);
	rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

	const hasStatic = hasStaticContent(rootNode);

	const output = new Output({
		width: rootNode.yogaNode!.getComputedWidth(),
		height: rootNode.yogaNode!.getComputedHeight(),
	});
	renderNodeToOutput(rootNode, output, { skipStaticElements: hasStatic });
	const { output: text, height } = output.get();

	const staticOutput = hasStatic
		? renderStaticSubtrees(rootNode, terminalWidth)
		: '';

	return { output: text, height, staticOutput };
};

const render = (component: Component, options: RenderOptions = {}): Instance => {
	const stdout = options.stdout ?? process.stdout;
	const stdin = options.stdin ?? process.stdin;
	const stderr = options.stderr ?? process.stderr;
	const debug = options.debug ?? false;
	const exitOnCtrlC = options.exitOnCtrlC ?? true;
	const isTTY = Boolean((stdout as NodeJS.WriteStream).isTTY);
	const writeStream = stdout as NodeJS.WriteStream;
	const interactive = options.interactive ?? (isTTY && !isCiEnv());
	const useTTYFrame = interactive && !debug;

	const maxFps = options.maxFps ?? 30;
	if (!(maxFps > 0)) {
		throw new Error(`vue-ink: maxFps must be > 0, got ${maxFps}.`);
	}
	// `debug` writes every frame verbatim so the test surface sees each commit;
	// throttling there would coalesce frames the test wants to count.
	const renderThrottleMs =
		debug || maxFps === Number.POSITIVE_INFINITY ? 0 : Math.max(1, Math.ceil(1000 / maxFps));

	const existing = instances.get(writeStream);
	if (existing) {
		process.stderr.write(
			'Warning: render() was called again for the same stdout before the previous instance was unmounted. Reusing stdout across multiple render() calls is unsupported. Call unmount() first.\n',
		);
		existing.rerender(component);
		return existing;
	}

	const rootNode = createNode('ink-root');
	const currentComponent = shallowRef<Component>(component);
	const Root = {
		render: () => h(currentComponent.value),
	};
	const app = createApp(Root);

	let lastOutput = '';
	let lastLineCount = 0;
	let frameCounter = 0;
	// Static is append-only scrollback. The Static component re-renders the
	// full item list each frame; we detect which suffix is new by comparing
	// against the previously emitted text. `lastStaticOutput` is the diff
	// anchor used in all modes; `fullStaticOutput` accumulates the running
	// scrollback only in debug mode, which re-emits the whole frame.
	let lastStaticOutput = '';
	let fullStaticOutput = '';
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
	let kittyProtocolEnabled = false;

	// Forward-declared because inputManager/app callbacks below close over it,
	// but the real body (which itself calls inputManager.destroy/app.unmount)
	// can only be assembled once those values exist.
	let unmount: () => void = noop;

	const inputManager = createInputManager({
		stdin,
		stdout: writeStream,
		exitOnCtrlC,
		onCtrlC: () => unmount(),
	});

	app.provide(APP_CONTEXT_KEY, {
		exit: (error?: Error) => {
			if (error) exitReject(error);
			unmount();
		},
		waitUntilRenderFlush: () => waitUntilRenderFlush(),
	});
	app.provide(STDIN_CONTEXT_KEY, {
		stdin,
		isRawModeSupported: inputManager.isRawModeSupported,
		setRawMode: inputManager.setRawMode,
		setBracketedPasteMode: inputManager.setBracketedPasteMode,
		emitter: inputManager.emitter,
	});

	const { destroy: destroyFocusManager, ...focusContext } = createFocusManager(
		inputManager.emitter,
	);
	app.provide(FOCUS_CONTEXT_KEY, focusContext);

	const animationScheduler = createAnimationScheduler();
	app.provide(ANIMATION_CONTEXT_KEY, {
		renderThrottleMs,
		subscribe: animationScheduler.subscribe,
	});

	const eraseCurrentFrame = (): void => {
		if (!useTTYFrame || lastLineCount === 0) return;
		writeStream.write(ansiEscapes.eraseLines(lastLineCount + 1));
		lastOutput = '';
		lastLineCount = 0;
	};

	// Erase the current frame, write data to `target`, then repaint. Mirrors
	// ink's `useStdout().write` choreography so logs land above the live UI.
	const writeAboveFrame = (target: NodeJS.WriteStream, data: string): void => {
		eraseCurrentFrame();
		target.write(data);
		if (!unmounted) renderImmediate();
	};

	let trailingTimer: ReturnType<typeof setTimeout> | undefined;
	let lastRenderAt = 0;
	let hasPendingRender = false;
	const commitWaiters: Array<() => void> = [];

	const drainCommitWaiters = (): void => {
		if (commitWaiters.length === 0) return;
		const waiters = commitWaiters.splice(0);
		for (const resolve of waiters) resolve();
	};

	const clearTrailingTimer = (): void => {
		if (trailingTimer === undefined) return;
		clearTimeout(trailingTimer);
		trailingTimer = undefined;
	};

	// Shared paint-now core: clear any trailing timer, drop the pending flag,
	// stamp the window, and paint. Every commit path funnels through here so
	// the three pieces of state can't drift.
	const commitNow = (): void => {
		clearTrailingTimer();
		hasPendingRender = false;
		lastRenderAt = Date.now();
		doRender();
	};

	// Sync entry point — flushes any pending throttled work and paints now.
	// Used on mount, resize, and unmount where we cannot drop the frame.
	const renderImmediate = commitNow;

	const scheduleTrailingRender = (delay: number): void => {
		if (trailingTimer !== undefined) return;
		trailingTimer = setTimeout(() => {
			trailingTimer = undefined;
			if (unmounted || !hasPendingRender) return;
			commitNow();
		}, Math.max(0, delay));
	};

	// Throttled entry point — called from scheduler/post-flush hooks. Honors
	// the leading-edge + trailing-edge contract: the first call in a window
	// paints immediately; subsequent calls coalesce into one trailing paint.
	const requestRender = (): void => {
		if (unmounted) return;
		if (renderThrottleMs === 0) {
			commitNow();
			return;
		}
		const elapsed = Date.now() - lastRenderAt;
		if (elapsed >= renderThrottleMs && trailingTimer === undefined) {
			commitNow();
			return;
		}
		hasPendingRender = true;
		scheduleTrailingRender(renderThrottleMs - elapsed);
	};

	app.provide(STDOUT_CONTEXT_KEY, {
		stdout: writeStream,
		write: (data: string) => writeAboveFrame(writeStream, data),
	});
	app.provide(STDERR_CONTEXT_KEY, {
		stderr,
		write: (data: string) => writeAboveFrame(stderr, data),
	});

	const isScreenReaderEnabled = ref<boolean>(
		options.isScreenReaderEnabled ?? process.env['INK_SCREEN_READER'] === 'true',
	);
	app.provide(ACCESSIBILITY_CONTEXT_KEY, { isScreenReaderEnabled });

	const shouldPatchConsole = options.patchConsole ?? true;
	let unsubscribeConsole: (() => void) | undefined;
	if (shouldPatchConsole) {
		unsubscribeConsole = subscribeConsole({
			writeStdout: (data) => writeAboveFrame(writeStream, data),
			writeStderr: (data) => writeAboveFrame(stderr, data),
		});
	}

	const getTerminalWidth = (): number => {
		const cols = writeStream.columns;
		return typeof cols === 'number' && cols > 0 ? cols : 80;
	};

	const hasOnRender = typeof options.onRender === 'function';

	const doRender = (): void => {
		if (unmounted) return;
		const startedAt = hasOnRender ? performance.now() : 0;
		const { output: text, staticOutput } = renderTree(rootNode, getTerminalWidth());

		// The new static suffix: items present this paint that weren't in the
		// previous static snapshot. Append-only assumption — if the user
		// rewrites the array, the diff falls back to "emit everything new"
		// which is still safe, just verbose.
		let newStatic = '';
		if (staticOutput !== lastStaticOutput) {
			newStatic = staticOutput.startsWith(lastStaticOutput)
				? staticOutput.slice(lastStaticOutput.length)
				: staticOutput;
			lastStaticOutput = staticOutput;
		}
		// Each emitted static chunk gets a trailing `\n` so the live frame
		// below it starts on a fresh line.
		const newStaticFrame = newStatic.length > 0 ? `${newStatic}\n` : '';

		if (debug) {
			if (newStaticFrame.length > 0) fullStaticOutput += newStaticFrame;
			writeStream.write(`${fullStaticOutput}${text}\n`);
			emitRenderMetrics(text, text.length === 0 ? 0 : text.split('\n').length, startedAt);
			drainCommitWaiters();
			return;
		}

		if (text === lastOutput && newStaticFrame.length === 0) {
			drainCommitWaiters();
			return;
		}

		if (useTTYFrame) {
			if (!cursorHidden) {
				writeStream.write(ansiEscapes.cursorHide);
				cursorHidden = true;
			}
			const erase = lastLineCount > 0 ? ansiEscapes.eraseLines(lastLineCount + 1) : '';
			writeStream.write(`${BSU}${erase}${newStaticFrame}${text}\n${ESU}`);
		}
		// Non-interactive: buffer only — the final frame is flushed in unmount.

		const lineCount = text.length === 0 ? 0 : text.split('\n').length;
		lastOutput = text;
		lastLineCount = lineCount;
		emitRenderMetrics(text, lineCount, startedAt);
		drainCommitWaiters();
	};

	const emitRenderMetrics = (text: string, lineCount: number, startedAt: number): void => {
		if (!hasOnRender) return;
		frameCounter += 1;
		try {
			options.onRender!({
				frame: frameCounter,
				durationMs: performance.now() - startedAt,
				lineCount,
				output: text,
			});
		} catch (err) {
			const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
			process.stderr.write(`vue-ink onRender callback threw:\n${stack}\n`);
		}
	};

	rootNode.onRender = requestRender;
	rootNode.onComputeLayout = () => {
		rootNode.yogaNode!.setWidth(getTerminalWidth());
	};

	app.config.errorHandler = (err, _instance, info) => {
		if (unmounted) return;
		// Erase the half-painted frame so the terminal isn't left in a weird
		// state, then print the error and tear down cleanly.
		eraseCurrentFrame();
		const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
		process.stderr.write(`vue-ink render error (${info}):\n${stack}\n`);
		unmount();
	};

	const onResize = (): void => {
		// Width changed — previous line count can't be trusted for erase math
		// and the new layout may differ even from identical state.
		lastOutput = '';
		lastLineCount = 0;
		renderImmediate();
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
		// Flush any pending throttled render so the user's last state lands
		// before we tear down. Read `unmounted` after this — we still want the
		// trailing paint, but no new ones after.
		if (hasPendingRender) commitNow();
		else clearTrailingTimer();
		unmounted = true;
		// Restore native console first so any teardown-time log goes straight
		// to the real stream, not back through our (about-to-be-torn-down) frame
		// helper.
		if (unsubscribeConsole) {
			unsubscribeConsole();
			unsubscribeConsole = undefined;
		}
		// Non-interactive: flush the buffered final frame once before tearing down.
		if (!interactive && !debug && lastOutput.length > 0) {
			writeStream.write(`${lastOutput}\n`);
		}
		if (interactive) writeStream.off('resize', onResize);
		if (exitOnCtrlC) {
			process.off('SIGINT', onSignal);
			process.off('SIGTERM', onSignal);
		}
		if (beforeExitRegistered) {
			process.off('beforeExit', onBeforeExit);
			beforeExitRegistered = false;
		}
		destroyFocusManager();
		animationScheduler.destroy();
		inputManager.destroy();
		app.unmount();
		if (kittyProtocolEnabled) {
			writeStream.write(disableKittyKeyboard());
			kittyProtocolEnabled = false;
		}
		if (useTTYFrame && cursorHidden) {
			writeStream.write(ansiEscapes.cursorShow);
			cursorHidden = false;
		}
		if (rootNode.yogaNode) {
			rootNode.yogaNode.freeRecursive();
			rootNode.yogaNode = undefined;
		}
		instances.delete(writeStream);
		activeInstances.delete(instance);
		drainCommitWaiters();
		exitResolve();
	};

	// Push kitty keyboard mode (if requested) before app.mount so that any
	// composable attaching a stdin listener during mount sees the enhanced
	// format from the first event. Terminals that don't support kitty
	// silently ignore the escape.
	const kittyOptions = options.kittyKeyboard;
	if (kittyOptions && kittyOptions.mode !== 'disabled') {
		const flags: KittyFlagName[] = kittyOptions.flags ?? ['disambiguateEscapeCodes'];
		writeStream.write(enableKittyKeyboard(flags));
		kittyProtocolEnabled = true;
	}

	app.mount(rootNode);

	if (interactive && !debug) {
		writeStream.on('resize', onResize);
	}

	if (exitOnCtrlC) {
		process.on('SIGINT', onSignal);
		process.on('SIGTERM', onSignal);
	}

	// Mount-time mutations queue a post-flush render; flush it synchronously
	// here so the first frame is written before render() returns.
	renderImmediate();

	const rerender = (newComponent: Component): void => {
		currentComponent.value = newComponent;
	};

	const waitUntilRenderFlush = async (): Promise<void> => {
		// Let Vue's scheduler drain so any pending state changes commit and
		// schedule a paint (immediate or trailing).
		await vueNextTick();
		// If a paint is pending behind the throttle, wait for it to land.
		if (hasPendingRender || trailingTimer !== undefined) {
			await new Promise<void>((resolve) => {
				commitWaiters.push(resolve);
			});
		}
		// Yield once more so the write reaches the stream before we resolve.
		await new Promise<void>((resolve) => {
			process.nextTick(resolve);
		});
	};

	const instance: Instance = {
		rerender,
		unmount,
		waitUntilExit: () => {
			if (!beforeExitRegistered && !unmounted) {
				process.once('beforeExit', onBeforeExit);
				beforeExitRegistered = true;
			}
			return exitPromise;
		},
		waitUntilRenderFlush,
		clear: eraseCurrentFrame,
	};
	instances.set(writeStream, instance);
	activeInstances.add(instance);
	return instance;
};

export default render;
