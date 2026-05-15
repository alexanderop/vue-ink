import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import Yoga from 'yoga-layout';
import { h, ref, type Component } from 'vue';
import {
	createNode,
	emitLayoutListeners,
	hasStaticContent,
	Output,
	renderNodeToOutput,
	renderNodeToScreenReaderOutput,
	renderStaticSubtrees,
} from '@vue-ink/core';
import { createApp } from './renderer.ts';
import {
	ACCESSIBILITY_CONTEXT_KEY,
	ANIMATION_CONTEXT_KEY,
	APP_CONTEXT_KEY,
	CURSOR_CONTEXT_KEY,
	FOCUS_CONTEXT_KEY,
	STDERR_CONTEXT_KEY,
	STDIN_CONTEXT_KEY,
	STDOUT_CONTEXT_KEY,
} from './context.ts';

export type RenderToStringOptions = {
	/**
	 * Width of the virtual terminal in columns. Default: `80`.
	 */
	columns?: number;
	/**
	 * Render the screen-reader output path instead of the visual layout.
	 * Mirrors the `isScreenReaderEnabled` option on `render()`.
	 */
	isScreenReaderEnabled?: boolean;
};

const noop = (): void => {};

const createNoopStdout = (columns: number): NodeJS.WriteStream => {
	const stream = new Writable({ write: (_chunk, _enc, cb) => cb() }) as Writable & {
		columns: number;
		rows: number;
		isTTY: boolean;
	};
	stream.columns = columns;
	stream.rows = 24;
	stream.isTTY = false;
	return stream as unknown as NodeJS.WriteStream;
};

const createNoopStdin = (): NodeJS.ReadStream => {
	const emitter = new EventEmitter() as unknown as Record<string, unknown>;
	emitter['isTTY'] = false;
	emitter['setRawMode'] = () => emitter;
	emitter['resume'] = noop;
	emitter['pause'] = noop;
	return emitter as unknown as NodeJS.ReadStream;
};

/**
 * Render a Vue component to a string synchronously. Unlike {@link render},
 * this function does not write to stdout, does not attach terminal event
 * listeners, and returns the rendered output (with ANSI styling) as a string.
 *
 * Useful for generating documentation, writing output to files, snapshot
 * testing, or any scenario where you need the rendered output as a string
 * without starting a persistent terminal application.
 *
 * **Notes:**
 *
 * - Terminal-specific composables (`useInput`, `usePaste`, `useStdin`,
 *   `useStdout`, `useStderr`, `useApp`, `useFocus`, `useFocusManager`)
 *   resolve to no-op contexts. They will not throw, but they will not
 *   function as in a live terminal — input handlers never fire and writes
 *   are discarded.
 * - `onMounted` / `onBeforeUnmount` callbacks fire during the render +
 *   teardown pass, but state updates they trigger after layout commits
 *   will not be reflected in the returned output (which captures the
 *   first synchronous frame).
 * - Layout-effect-equivalents (post-commit work registered via
 *   `addLayoutListener`) **do** run, since layout has to complete before
 *   the output is serialized.
 * - The `<Static>` component is supported — its output is prepended to the
 *   dynamic output.
 */
export const renderToString = (
	component: Component,
	options: RenderToStringOptions = {},
): string => {
	const columns = options.columns ?? 80;
	const isScreenReaderEnabled = options.isScreenReaderEnabled ?? false;

	const rootNode = createNode('ink-root');
	rootNode.onComputeLayout = () => {
		rootNode.yogaNode!.setWidth(columns);
	};

	const app = createApp({ render: () => h(component) });

	const stdout = createNoopStdout(columns);
	const stderr = createNoopStdout(columns);
	const stdin = createNoopStdin();

	app.provide(APP_CONTEXT_KEY, {
		exit: noop,
		waitUntilRenderFlush: () => Promise.resolve(),
	});
	app.provide(STDIN_CONTEXT_KEY, {
		stdin,
		// Report raw-mode support so `useInput`/`usePaste` register without
		// throwing; the emitter is the no-op kind so handlers never actually
		// fire. Mirrors ink's renderToString contract: "terminal hooks return
		// no-op values, they will not throw."
		isRawModeSupported: true,
		setRawMode: noop,
		setBracketedPasteMode: noop,
		emitter: new EventEmitter(),
	});
	app.provide(STDOUT_CONTEXT_KEY, { stdout, write: noop });
	app.provide(STDERR_CONTEXT_KEY, { stderr, write: noop });
	app.provide(ACCESSIBILITY_CONTEXT_KEY, {
		isScreenReaderEnabled: ref(isScreenReaderEnabled),
	});
	app.provide(FOCUS_CONTEXT_KEY, {
		activeId: ref<string | undefined>(undefined),
		isFocusEnabled: ref(false),
		add: noop,
		remove: noop,
		activate: noop,
		deactivate: noop,
		focus: noop,
		focusNext: noop,
		focusPrevious: noop,
		enableFocus: noop,
		disableFocus: noop,
	});
	app.provide(ANIMATION_CONTEXT_KEY, {
		renderThrottleMs: 0,
		subscribe: () => ({ startTime: 0, unsubscribe: noop }),
	});
	app.provide(CURSOR_CONTEXT_KEY, { setCursorPosition: noop });

	// Collect uncaught render errors and re-throw after teardown so callers
	// see the original failure even if the component blew up mid-mount.
	let uncaughtError: unknown;
	app.config.warnHandler = noop;
	app.config.errorHandler = (err) => {
		uncaughtError ??= err;
	};

	let teardownSucceeded = false;

	try {
		app.mount(rootNode);

		rootNode.yogaNode!.setWidth(columns);
		rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
		emitLayoutListeners(rootNode);

		if (uncaughtError !== undefined) {
			if (uncaughtError instanceof Error) throw uncaughtError;
			throw new Error(
				typeof uncaughtError === 'string' ? uncaughtError : JSON.stringify(uncaughtError),
			);
		}

		if (isScreenReaderEnabled) {
			const text = renderNodeToScreenReaderOutput(rootNode, {
				skipStaticElements: false,
			});
			app.unmount();
			teardownSucceeded = true;
			return text;
		}

		const hasStatic = hasStaticContent(rootNode);
		const output = new Output({
			width: rootNode.yogaNode!.getComputedWidth(),
			height: rootNode.yogaNode!.getComputedHeight(),
		});
		renderNodeToOutput(rootNode, output, { skipStaticElements: hasStatic });
		const { output: text } = output.get();
		const staticOutput = hasStatic ? renderStaticSubtrees(rootNode, columns) : '';

		app.unmount();
		teardownSucceeded = true;

		const normalizedStatic = staticOutput.endsWith('\n')
			? staticOutput.slice(0, -1)
			: staticOutput;
		if (normalizedStatic.length > 0 && text.length > 0) {
			return `${normalizedStatic}\n${text}`;
		}
		return normalizedStatic.length > 0 ? normalizedStatic : text;
	} finally {
		// Yoga nodes are WASM-backed and not garbage collected. The reconciler
		// frees children on unmount but the root node is owned by us — release
		// it explicitly. On the error path, fall through to the same freeing
		// after a best-effort unmount.
		if (!teardownSucceeded) {
			try {
				app.unmount();
			} catch {
				// Best-effort during error teardown.
			}
		}
		if (rootNode.yogaNode) {
			try {
				rootNode.yogaNode.freeRecursive();
			} catch {
				// Node may already be partially freed.
			}
			rootNode.yogaNode = undefined;
		}
	}
};
