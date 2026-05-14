import { inject, onBeforeUnmount, watch, ref, type InjectionKey, type Ref } from 'vue';
import {
	APP_CONTEXT_KEY,
	STDIN_CONTEXT_KEY,
	STDOUT_CONTEXT_KEY,
	STDERR_CONTEXT_KEY,
	ACCESSIBILITY_CONTEXT_KEY,
	type AppContext,
	type StdinContext,
	type StdoutContext,
	type StderrContext,
} from './context.ts';
import type { Key } from './input.ts';

const requireContext = <T>(key: InjectionKey<T>, callSite: string): T => {
	const ctx = inject(key);
	if (!ctx) {
		throw new Error(
			`${callSite} must be called inside a component mounted via vue-ink render().`,
		);
	}
	return ctx;
};

const requireStdin = (): StdinContext =>
	requireContext(STDIN_CONTEXT_KEY, 'useStdin()/useInput()');

export const useApp = (): AppContext => requireContext(APP_CONTEXT_KEY, 'useApp()');
export const useStdout = (): StdoutContext => requireContext(STDOUT_CONTEXT_KEY, 'useStdout()');
export const useStderr = (): StderrContext => requireContext(STDERR_CONTEXT_KEY, 'useStderr()');

export const useIsScreenReaderEnabled = (): Ref<boolean> =>
	requireContext(ACCESSIBILITY_CONTEXT_KEY, 'useIsScreenReaderEnabled()').isScreenReaderEnabled;

export type WindowSize = { columns: number; rows: number };

const readWindowSize = (stdout: NodeJS.WriteStream): WindowSize => ({
	columns: typeof stdout.columns === 'number' && stdout.columns > 0 ? stdout.columns : 80,
	rows: typeof stdout.rows === 'number' && stdout.rows > 0 ? stdout.rows : 24,
});

export const useWindowSize = (): Ref<WindowSize> => {
	const { stdout } = useStdout();
	const size = ref<WindowSize>(readWindowSize(stdout));
	const onResize = (): void => {
		const next = readWindowSize(stdout);
		if (next.columns === size.value.columns && next.rows === size.value.rows) return;
		size.value = next;
	};
	stdout.on('resize', onResize);
	onBeforeUnmount(() => {
		stdout.off('resize', onResize);
	});
	return size;
};

export type UseStdinReturn = {
	stdin: NodeJS.ReadStream;
	isRawModeSupported: boolean;
	setRawMode: (enable: boolean) => void;
	setBracketedPasteMode: (enable: boolean) => void;
};

export const useStdin = (): UseStdinReturn => {
	const { stdin, isRawModeSupported, setRawMode, setBracketedPasteMode } =
		requireStdin();
	return { stdin, isRawModeSupported, setRawMode, setBracketedPasteMode };
};

export type InputHandler = (input: string, key: Key) => void;

export type UseInputOptions = {
	isActive?: boolean | Ref<boolean>;
};

export const useInput = (handler: InputHandler, options: UseInputOptions = {}): void => {
	const { setRawMode, emitter, isRawModeSupported } = requireStdin();
	if (!isRawModeSupported) {
		throw new Error(
			'useInput() requires a TTY stdin that supports raw mode. Pipe input is not supported.',
		);
	}

	const isActiveRef = ref<boolean>(true);
	if (options.isActive !== undefined) {
		watch(
			() => (typeof options.isActive === 'object' ? options.isActive.value : options.isActive),
			(value) => {
				isActiveRef.value = value !== false;
			},
			{ immediate: true },
		);
	}

	let listening = false;
	const wrapped = (input: string, key: Key): void => {
		// Defensive: the isActive watcher detaches `wrapped` before emitting
		// false → true → false races, so this guard is normally unreachable.
		/* v8 ignore next */
		if (!isActiveRef.value) return;
		handler(input, key);
	};

	const start = (): void => {
		/* v8 ignore next */
		if (listening) return;
		setRawMode(true);
		emitter.on('input', wrapped);
		listening = true;
	};

	const stop = (): void => {
		if (!listening) return;
		emitter.off('input', wrapped);
		setRawMode(false);
		listening = false;
	};

	watch(
		isActiveRef,
		(value) => {
			if (value) start();
			else stop();
		},
		{ immediate: true },
	);

	onBeforeUnmount(stop);
};

export type PasteHandler = (text: string) => void;

export type UsePasteOptions = {
	isActive?: boolean | Ref<boolean>;
};

export const usePaste = (
	handler: PasteHandler,
	options: UsePasteOptions = {},
): void => {
	const { setRawMode, setBracketedPasteMode, emitter, isRawModeSupported } =
		requireStdin();
	if (!isRawModeSupported) {
		throw new Error(
			'usePaste() requires a TTY stdin that supports raw mode. Pipe input is not supported.',
		);
	}

	const isActiveRef = ref<boolean>(true);
	if (options.isActive !== undefined) {
		watch(
			() => (typeof options.isActive === 'object' ? options.isActive.value : options.isActive),
			(value) => {
				isActiveRef.value = value !== false;
			},
			{ immediate: true },
		);
	}

	let listening = false;
	const wrapped = (text: string): void => {
		/* v8 ignore next */
		if (!isActiveRef.value) return;
		handler(text);
	};

	const start = (): void => {
		/* v8 ignore next */
		if (listening) return;
		setRawMode(true);
		setBracketedPasteMode(true);
		emitter.on('paste', wrapped);
		listening = true;
	};

	const stop = (): void => {
		if (!listening) return;
		emitter.off('paste', wrapped);
		setBracketedPasteMode(false);
		setRawMode(false);
		listening = false;
	};

	watch(
		isActiveRef,
		(value) => {
			if (value) start();
			else stop();
		},
		{ immediate: true },
	);

	onBeforeUnmount(stop);
};

export type { Key };
