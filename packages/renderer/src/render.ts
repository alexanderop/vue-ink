import process from 'node:process';
import { formatWithOptions } from 'node:util';
import Yoga from 'yoga-layout';
import ansiEscapes from 'ansi-escapes';
import { h, nextTick as vueNextTick, ref, shallowRef, watch, type Component } from 'vue';
import { createApp } from './renderer.ts';
import {
	createNode,
	emitLayoutListeners,
	Output,
	renderNodeToOutput,
	renderNodeToScreenReaderOutput,
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
	CURSOR_CONTEXT_KEY,
	type CursorPosition,
} from './context.ts';
import { createAnimationScheduler } from './animation-scheduler.ts';
import {
	enableKittyKeyboard,
	disableKittyKeyboard,
	hasCompleteKittyQueryResponse,
	stripKittyQueryResponses,
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
	/**
	 * Render into the terminal's alternate screen buffer (CSI ?1049h on mount,
	 * CSI ?1049l on unmount). Same mechanism vim / htop / less use to avoid
	 * polluting the user's scrollback. Only honored when interactive mode is on
	 * AND stdout is a TTY — non-interactive streams (CI, pipes) ignore the
	 * option so log capture is unaffected. Default: `false`.
	 */
	alternateScreen?: boolean;
	/**
	 * When enabled, the renderer emits a line-level diff between the previous
	 * and next paint instead of erasing and rewriting the entire frame. Unchanged
	 * lines are skipped with `cursorNextLine`; shrinking output erases the
	 * dropped tail with `eraseLines`. Useful over high-latency links. Default:
	 * `false`.
	 */
	incrementalRendering?: boolean;
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
	/**
	 * Resolves when the app unmounts. If `useApp().exit(value)` was called the
	 * promise resolves with that value; `useApp().exit(error)` (an `Error`)
	 * rejects it. Plain `unmount()` resolves with `undefined`.
	 */
	waitUntilExit: () => Promise<unknown>;
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
	isScreenReaderEnabled: boolean,
): { output: string; height: number; staticOutput: string } => {
	rootNode.yogaNode!.setWidth(terminalWidth);
	rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

	const hasStatic = hasStaticContent(rootNode);

	if (isScreenReaderEnabled) {
		// Screen-reader mode collapses the 2D layout into a 1D string by
		// walking the DOM directly. Yoga still ran above so `display: none`
		// nodes resolve correctly. `<Static>` subtrees aren't currently
		// announced separately — they participate in the same screen-reader
		// walk as the live frame.
		const text = renderNodeToScreenReaderOutput(rootNode, {
			skipStaticElements: false,
		});
		const height = text === '' ? 0 : text.split('\n').length;
		return { output: text, height, staticOutput: '' };
	}

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
	// Alt-screen is gated on both interactive AND isTTY: non-interactive streams
	// (CI, pipes) ignore the option so captured logs stay flat, and a non-TTY
	// stream can't reliably switch buffers anyway. Mirrors ink's
	// `resolveAlternateScreenOption`.
	const useAlternateScreen = Boolean(options.alternateScreen) && interactive && isTTY;

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
		stderr.write(
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
	let lastOutputLines: string[] = [];
	let frameCounter = 0;
	let currentCursorPosition: CursorPosition | undefined;
	let lastCursorPosition: CursorPosition | undefined;
	const incrementalRendering = options.incrementalRendering ?? false;
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
	let exitResolve: (value: unknown) => void = noop;
	let exitReject: (err: Error) => void = noop;
	const exitPromise = new Promise<unknown>((resolve, reject) => {
		exitResolve = resolve;
		exitReject = reject;
	});
	// Prevent unhandled-rejection crashes when app code exits with an error
	// but consumers never call waitUntilExit(). Mirrors ink at
	// `repos/ink/src/ink.tsx:456`.
	void exitPromise.catch(noop);
	// Value passed to `useApp().exit(value)` for non-error resolution. Mirrors
	// ink's `exitResult` field (`ink.tsx:309,489,842`).
	let exitResult: unknown;
	let unmounted = false;
	let cursorHidden = false;
	let kittyProtocolEnabled = false;

	// Forward-declared because inputManager/app callbacks below close over it,
	// but the real body (which itself calls inputManager.destroy/app.unmount)
	// can only be assembled once those values exist.
	let unmount: () => void = noop;
	// Forward-declared so the errorHandler at mount time (which calls
	// `unmount()` synchronously) can safely run before the `instance` literal
	// is assigned at the bottom of this closure. `Set#delete(undefined)` is a
	// harmless no-op.
	// eslint-disable-next-line prefer-const -- forward declaration; assigned below
	let instance: Instance | undefined;

	const inputManager = createInputManager({
		stdin,
		stdout: writeStream,
		exitOnCtrlC,
		onCtrlC: () => unmount(),
	});

	app.provide(APP_CONTEXT_KEY, {
		exit: (errorOrValue?: unknown) => {
			if (unmounted) return;
			if (errorOrValue instanceof Error) {
				// Reject path — `unmount()` later calls `exitResolve(exitResult)`
				// but `exitReject` claims the settlement first so the resolve is
				// a no-op on an already-rejected promise.
				exitReject(errorOrValue);
				unmount();
				return;
			}
			// Non-error resolution: stash the value so `unmount()` resolves
			// the exit promise with it. Mirrors ink at `ink.tsx:489`.
			exitResult = errorOrValue;
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

	app.provide(CURSOR_CONTEXT_KEY, {
		setCursorPosition: (position: CursorPosition | undefined) => {
			currentCursorPosition = position
				? { x: position.x, y: position.y }
				: undefined;
		},
	});

	const eraseCurrentFrame = (): void => {
		if (!useTTYFrame || lastLineCount === 0) return;
		writeStream.write(ansiEscapes.eraseLines(lastLineCount + 1));
		lastOutput = '';
		lastLineCount = 0;
	};

	// Tracks whether an outer `writeAboveFrame` already opened a DEC 2026
	// synchronized frame. `doRender()` checks this so nested writes don't
	// emit a second BSU/ESU pair — terminals interpret stacked pairs as
	// "close immediately", defeating the whole point.
	let syncFrameDepth = 0;

	// Erase the current frame, write data to `target`, then repaint. Mirrors
	// ink's `useStdout().write` choreography so logs land above the live UI.
	// The erase + write + repaint trio is wrapped in synchronized-output
	// escapes so terminals supporting DEC 2026 don't flicker through a
	// half-erased intermediate frame on rapid writes. The whole call is a
	// no-op after unmount — matches ink at `ink.tsx:672-674`.
	const writeAboveFrame = (target: NodeJS.WriteStream, data: string): void => {
		if (unmounted) return;
		const sync = useTTYFrame;
		if (sync) {
			writeStream.write(BSU);
			syncFrameDepth += 1;
		}
		try {
			eraseCurrentFrame();
			target.write(data);
			renderImmediate();
		} finally {
			if (sync) {
				syncFrameDepth -= 1;
				writeStream.write(ESU);
			}
		}
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
	// `doRender` reads the ref but Vue's reactivity only triggers re-renders
	// via the component tree — toggling the ref from a host-side composable
	// (e.g. `useIsScreenReaderEnabled().value = true` outside a template)
	// wouldn't repaint on its own. This watcher closes that gap.
	watch(isScreenReaderEnabled, () => requestRender());

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

	const buildCursorSuffix = (
		visibleLineCount: number,
		position: CursorPosition | undefined,
	): string => {
		if (!position) return '';
		const moveUp = visibleLineCount - position.y;
		return (
			(moveUp > 0 ? ansiEscapes.cursorUp(moveUp) : '') +
			ansiEscapes.cursorTo(position.x) +
			ansiEscapes.cursorShow
		);
	};

	// Before any erase or rewrite, if the last paint left the cursor visible
	// inside the frame, hide it and return to the bottom so erase math (which
	// assumes the cursor sits below the frame) works correctly.
	const buildReturnToBottom = (
		previousLineCount: number,
		previousPosition: CursorPosition | undefined,
	): string => {
		if (!previousPosition) return '';
		const down = previousLineCount - 1 - previousPosition.y;
		return (
			ansiEscapes.cursorHide +
			(down > 0 ? ansiEscapes.cursorDown(down) : '') +
			ansiEscapes.cursorTo(0)
		);
	};

	const doRender = (): void => {
		if (unmounted) return;
		const startedAt = hasOnRender ? performance.now() : 0;
		const { output: text, staticOutput } = renderTree(
			rootNode,
			getTerminalWidth(),
			isScreenReaderEnabled.value,
		);
		// Layout is committed at this point. Notify composables that depend on
		// Yoga-computed metrics (`useBoxMetrics`) so they update their refs in
		// time for Vue to coalesce any resulting re-render into the next paint.
		emitLayoutListeners(rootNode);

		// Snapshot cursor state for this paint — the consumer may mutate it
		// during the next render cycle but this paint's escapes must reflect
		// what was published before commit.
		const cursorPosition = currentCursorPosition;

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

		const cursorChanged =
			cursorPosition?.x !== lastCursorPosition?.x ||
			cursorPosition?.y !== lastCursorPosition?.y;
		// Re-emit if anything visible to the user changed — frame text, static
		// suffix, or just the cursor position/visibility.
		if (text === lastOutput && newStaticFrame.length === 0 && !cursorChanged) {
			drainCommitWaiters();
			return;
		}

		const lineCount = text.length === 0 ? 0 : text.split('\n').length;
		const nextLines = text.length === 0 ? [] : text.split('\n');

		if (useTTYFrame) {
			if (!cursorHidden) {
				writeStream.write(ansiEscapes.cursorHide);
				cursorHidden = true;
			}
			const cursorSuffix = buildCursorSuffix(lineCount, cursorPosition);
			// `returnPrefix` is non-empty only when the previous paint left the
			// cursor inside the frame; it hides the cursor and walks back down to
			// the bottom-left so the erase/diff math below is correct.
			const returnPrefix = buildReturnToBottom(lastLineCount, lastCursorPosition);
			// Skip BSU/ESU when an outer `writeAboveFrame` already opened a
			// synchronized frame — nested pairs read as "close" on most terms.
			const openSync = syncFrameDepth === 0 ? BSU : '';
			const closeSync = syncFrameDepth === 0 ? ESU : '';

			if (
				incrementalRendering &&
				lastOutput.length > 0 &&
				text.length > 0 &&
				newStaticFrame.length === 0
			) {
				writeStream.write(
					`${openSync}${returnPrefix}${buildIncrementalDiff(lastOutputLines, nextLines)}${cursorSuffix}${closeSync}`,
				);
			} else {
				const erase = lastLineCount > 0 ? ansiEscapes.eraseLines(lastLineCount + 1) : '';
				writeStream.write(
					`${openSync}${returnPrefix}${erase}${newStaticFrame}${text}\n${cursorSuffix}${closeSync}`,
				);
			}
		}
		// Non-interactive: buffer only — the final frame is flushed in unmount.

		lastOutput = text;
		lastLineCount = lineCount;
		lastOutputLines = nextLines;
		lastCursorPosition = cursorPosition
			? { x: cursorPosition.x, y: cursorPosition.y }
			: undefined;
		emitRenderMetrics(text, lineCount, startedAt);
		drainCommitWaiters();
	};

	// Line-level diff: rewrite only the lines that changed, skip unchanged
	// lines with `cursorNextLine`, and erase any tail dropped by shrinking
	// output. The previous frame is assumed to end with `\n` (the cursor sits
	// on the line after `previousLines.length - 1`).
	const buildIncrementalDiff = (
		previousLines: string[],
		nextLines: string[],
	): string => {
		const prevVisible = previousLines.length;
		const nextVisible = nextLines.length;
		const buf: string[] = [];

		// Move cursor up to the top of the previous frame. After the previous
		// `${text}\n` the cursor is on the line after `prevVisible - 1` (i.e. at
		// row `prevVisible`), so we need to go up `prevVisible` lines to reach
		// row 0.
		if (prevVisible > 0) buf.push(ansiEscapes.cursorUp(prevVisible));

		const sharedLines = Math.min(prevVisible, nextVisible);
		for (let i = 0; i < sharedLines; i += 1) {
			if (nextLines[i] === previousLines[i]) {
				buf.push(ansiEscapes.cursorNextLine);
				continue;
			}
			buf.push(ansiEscapes.cursorTo(0));
			buf.push(nextLines[i]!);
			buf.push(ansiEscapes.eraseEndLine);
			buf.push('\n');
		}

		// New lines beyond the previous frame: write them with a trailing
		// newline so subsequent paints start at the line below.
		for (let i = sharedLines; i < nextVisible; i += 1) {
			buf.push(ansiEscapes.cursorTo(0));
			buf.push(nextLines[i]!);
			buf.push(ansiEscapes.eraseEndLine);
			buf.push('\n');
		}

		// Dropped tail: erase the leftover lines from the previous paint.
		if (prevVisible > nextVisible) {
			const dropped = prevVisible - nextVisible;
			buf.push(ansiEscapes.eraseLines(dropped));
		}

		return buf.join('');
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
			stderr.write(`vue-ink onRender callback threw:\n${stack}\n`);
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
		stderr.write(`vue-ink render error (${info}):\n${stack}\n`);
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
		writeStream.off('resize', onResize);
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
		if (cancelKittyDetection) cancelKittyDetection();
		inputManager.destroy();
		app.unmount();
		if (kittyProtocolEnabled) {
			writeStream.write(disableKittyKeyboard());
			kittyProtocolEnabled = false;
		}
		// Leave the alt-screen buffer before restoring the cursor: the
		// alt-screen teardown is intentionally disposable (matches ink's
		// behavior — see brain/porting/from-react-ink.md), and cursorShow
		// has to land on the primary screen so the user's terminal isn't
		// left with a hidden caret.
		if (useAlternateScreen) {
			writeStream.write(ansiEscapes.exitAlternativeScreen);
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
		// `instance` is forward-declared and assigned at the end of this
		// closure. If the errorHandler fires during mount, `unmount` may run
		// before that assignment — `Set#delete(undefined)` is a harmless no-op,
		// but `activeInstances.delete` is typed as `delete(Instance)` so guard.
		if (instance) activeInstances.delete(instance);
		drainCommitWaiters();
		exitResolve(exitResult);
	};

	// Alt-screen switch happens before any frame paints so the user's primary
	// screen content stays clean. Emitted before kitty so the test contract
	// "enter-alt-screen is the very first write" holds even when both are on.
	// Hide the cursor on entry (mirrors ink at `ink.tsx:969-975`) — the
	// alt-screen has its own cursor state, and without an explicit hide the
	// user briefly sees the caret blinking on a blank buffer before the
	// first paint lands.
	if (useAlternateScreen) {
		writeStream.write(ansiEscapes.enterAlternativeScreen);
		writeStream.write(ansiEscapes.cursorHide);
		cursorHidden = true;
	}

	// Push kitty keyboard mode (if requested) before app.mount so that any
	// composable attaching a stdin listener during mount sees the enhanced
	// format from the first event. Terminals that don't support kitty
	// silently ignore the escape.
	let cancelKittyDetection: (() => void) | undefined;
	const kittyOptions = options.kittyKeyboard;
	if (kittyOptions && kittyOptions.mode !== 'disabled') {
		const flags: KittyFlagName[] = kittyOptions.flags ?? ['disambiguateEscapeCodes'];
		const mode = kittyOptions.mode ?? 'auto';
		const enableProtocol = (): void => {
			writeStream.write(enableKittyKeyboard(flags));
			kittyProtocolEnabled = true;
		};
		if (mode === 'enabled') {
			// Force-enable still requires both streams to be TTYs — terminals
			// can only respond to CSI escapes on a real tty, and writing the
			// query to a pipe/file just pollutes captured output. Mirrors ink
			// at `repos/ink/src/ink.tsx:1120-1126`.
			const stdinIsTTY = Boolean((stdin as NodeJS.ReadStream).isTTY);
			if (stdinIsTTY && isTTY) {
				enableProtocol();
			}
		} else if (options.interactive !== false) {
			// `auto`: query the terminal and only push the protocol if it
			// responds within 200ms. Listen before writing the query so a fast
			// (synchronous) response isn't dropped.
			let responseBuffer: number[] = [];
			let timer: ReturnType<typeof setTimeout> | undefined;
			const cleanup = (): void => {
				cancelKittyDetection = undefined;
				if (timer !== undefined) {
					clearTimeout(timer);
					timer = undefined;
				}
				stdin.off('data', onResponseData);
				// Re-emit any user-typed bytes that arrived during detection so
				// they aren't lost from the normal input pipeline. Strip just the
				// protocol response bytes and any trailing partial match.
				const remaining = stripKittyQueryResponses(responseBuffer);
				responseBuffer = [];
				if (remaining.length > 0 && typeof stdin.unshift === 'function') {
					stdin.unshift(Uint8Array.from(remaining));
				}
			};
			const onResponseData = (chunk: Buffer | string): void => {
				const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
				for (const byte of buf) responseBuffer.push(byte);
				if (hasCompleteKittyQueryResponse(responseBuffer)) {
					cleanup();
					if (!unmounted) enableProtocol();
				}
			};
			stdin.on('data', onResponseData);
			timer = setTimeout(cleanup, 200);
			cancelKittyDetection = cleanup;
			writeStream.write('\x1b[?u');
		}
	}

	app.mount(rootNode);

	// Resize handling is independent of painting mode: composables like
	// `useBoxMetrics` rely on the renderer running `renderTree` (and firing
	// layout listeners) on every column change. We always attach the
	// listener — non-TTY streams (CI, testing-library's fake stdout) simply
	// don't emit `resize` unless a test fires it manually.
	writeStream.on('resize', onResize);

	if (exitOnCtrlC) {
		process.on('SIGINT', onSignal);
		process.on('SIGTERM', onSignal);
	}

	// Mount-time mutations queue a post-flush render; flush it synchronously
	// here so the first frame is written before render() returns.
	renderImmediate();

	const rerender = (newComponent: Component): void => {
		// Component identity is changing — any prior `<Static>` scrollback
		// state is no longer a valid diff anchor for the new tree. Resetting
		// both vars matches ink's `handleStaticChange` (`ink.tsx:521-524`),
		// which fires when Static's identity flips. Without this, a fresh
		// Static in the new tree would be deduped against stale items.
		lastStaticOutput = '';
		fullStaticOutput = '';
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

	instance = {
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
