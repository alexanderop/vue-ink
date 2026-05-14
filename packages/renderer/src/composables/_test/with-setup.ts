import { EventEmitter } from 'node:events';
import { Writable } from 'node:stream';
import {
	createRenderer,
	defineComponent,
	h,
	nextTick,
	type App,
} from 'vue';
import { vi } from 'vitest';
import {
	APP_CONTEXT_KEY,
	STDIN_CONTEXT_KEY,
	STDOUT_CONTEXT_KEY,
	STDERR_CONTEXT_KEY,
	ACCESSIBILITY_CONTEXT_KEY,
	FOCUS_CONTEXT_KEY,
	type AccessibilityContext,
	type AppContext,
	type FocusContext,
	type StdinContext,
	type StdoutContext,
	type StderrContext,
} from '../../context.ts';

type Noop = { [k: string]: unknown };

// A throwaway renderer over plain JS objects: just enough for createApp().mount()
// to drive setup() and provide/inject. No DOM, no yoga, no output.
const { createApp } = createRenderer<Noop, Noop>({
	createElement: () => ({}),
	createText: () => ({}),
	createComment: () => ({}),
	setText: () => {},
	setElementText: () => {},
	parentNode: () => null,
	nextSibling: () => null,
	insert: () => {},
	remove: () => {},
	patchProp: () => {},
});

export type FakeStdin = NodeJS.ReadStream & {
	emitData: (chunk: string | Buffer) => void;
};

export const createFakeStdin = (
	options: { isTTY?: boolean; supportsRawMode?: boolean } = {},
): FakeStdin => {
	const { isTTY = true, supportsRawMode = true } = options;
	const emitter = new EventEmitter() as unknown as FakeStdin;
	(emitter as { isTTY: boolean }).isTTY = isTTY;
	if (supportsRawMode) {
		(emitter as { setRawMode: (mode: boolean) => unknown }).setRawMode =
			(typeof vi !== 'undefined' ? vi.fn(() => emitter) : (() => emitter)) as never;
	}
	(emitter as { resume: () => void }).resume = () => {};
	(emitter as { pause: () => void }).pause = () => {};
	emitter.emitData = (chunk) => {
		const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
		emitter.emit('data', buf);
	};
	return emitter;
};

export const createFakeStdout = (
	columns = 80,
): NodeJS.WriteStream & { writes: string[] } => {
	const writes: string[] = [];
	const stream = new Writable({
		write(chunk, _enc, cb) {
			writes.push(chunk.toString('utf8'));
			cb();
		},
	}) as Writable & {
		columns: number;
		rows: number;
		isTTY: boolean;
		writes: string[];
	};
	stream.columns = columns;
	stream.rows = 24;
	stream.isTTY = false;
	stream.writes = writes;
	return stream as unknown as NodeJS.WriteStream & { writes: string[] };
};

export type WithSetupContexts = Partial<{
	app: AppContext;
	stdin: StdinContext;
	stdout: StdoutContext;
	stderr: StderrContext;
	accessibility: AccessibilityContext;
	focus: FocusContext;
}>;

export type WithSetupResult<T> = {
	result: T;
	app: App;
	unmount: () => void;
	flush: () => Promise<void>;
};

const flush = async (): Promise<void> => {
	await nextTick();
	await new Promise<void>((resolve) => {
		queueMicrotask(() => resolve());
	});
};

// Mount `setup` inside a real Vue setup() so that provide/inject and lifecycle
// hooks behave exactly like production. Provides whichever renderer contexts
// the caller supplies. Returns the composable's result directly — no
// `let captured: ... | null = null` dance.
export const withSetup = <T>(
	setup: () => T,
	contexts: WithSetupContexts = {},
): WithSetupResult<T> => {
	let captured: T | undefined;
	const Container = defineComponent({
		setup() {
			captured = setup();
			return () => h('div');
		},
	});

	const app = createApp(Container);
	// Tests deliberately exercise the missing-context throw path; surface the
	// error to the test via mount(), don't spam stderr with [Vue warn] lines.
	app.config.warnHandler = () => {};
	app.config.errorHandler = (err) => {
		throw err;
	};
	if (contexts.app) app.provide(APP_CONTEXT_KEY, contexts.app);
	if (contexts.stdin) app.provide(STDIN_CONTEXT_KEY, contexts.stdin);
	if (contexts.stdout) app.provide(STDOUT_CONTEXT_KEY, contexts.stdout);
	if (contexts.stderr) app.provide(STDERR_CONTEXT_KEY, contexts.stderr);
	if (contexts.accessibility) app.provide(ACCESSIBILITY_CONTEXT_KEY, contexts.accessibility);
	if (contexts.focus) app.provide(FOCUS_CONTEXT_KEY, contexts.focus);

	const root: Noop = {};
	app.mount(root);

	return {
		result: captured as T,
		app,
		unmount: () => app.unmount(),
		flush,
	};
};

// Convenience builders for the common context shapes.
export const fakeStdinContext = (stdin?: FakeStdin): StdinContext & { emitter: EventEmitter } => {
	const s = stdin ?? createFakeStdin();
	return {
		stdin: s,
		isRawModeSupported: Boolean((s as { isTTY?: boolean }).isTTY && (s as { setRawMode?: unknown }).setRawMode),
		setRawMode: vi.fn(),
		setBracketedPasteMode: vi.fn(),
		emitter: new EventEmitter(),
	} as StdinContext & { emitter: EventEmitter };
};

export const fakeStdoutContext = (
	stdout?: NodeJS.WriteStream & { writes?: string[] },
): StdoutContext => {
	const s = stdout ?? createFakeStdout();
	return {
		stdout: s,
		write: (data: string) => s.write(data),
	};
};

export const fakeStderrContext = (
	stderr?: NodeJS.WriteStream & { writes?: string[] },
): StderrContext => {
	const s = stderr ?? createFakeStdout();
	return {
		stderr: s,
		write: (data: string) => s.write(data),
	};
};

export const fakeAppContext = (): AppContext & {
	exitMock: ReturnType<typeof vi.fn>;
} => {
	const exitMock = vi.fn();
	return {
		exit: exitMock,
		waitUntilRenderFlush: () => Promise.resolve(),
		exitMock,
	};
};
