import { EventEmitter } from 'node:events';
import parseKeypress, { nonAlphanumericKeys, type ParsedKey } from './parse-keypress.ts';
import { createInputParser, type InputParser } from './input-parser.ts';

export type Key = {
	upArrow: boolean;
	downArrow: boolean;
	leftArrow: boolean;
	rightArrow: boolean;
	pageUp: boolean;
	pageDown: boolean;
	home: boolean;
	end: boolean;
	return: boolean;
	escape: boolean;
	tab: boolean;
	backspace: boolean;
	delete: boolean;
	ctrl: boolean;
	shift: boolean;
	meta: boolean;
	// Kitty keyboard protocol extensions — populated only when the terminal
	// is in kitty mode. Default to false in non-kitty terminals.
	super: boolean;
	hyper: boolean;
	capsLock: boolean;
	numLock: boolean;
	eventType?: 'press' | 'repeat' | 'release';
};

const toKey = (parsed: ParsedKey): Key => ({
	upArrow: parsed.name === 'up',
	downArrow: parsed.name === 'down',
	leftArrow: parsed.name === 'left',
	rightArrow: parsed.name === 'right',
	pageUp: parsed.name === 'pageup',
	pageDown: parsed.name === 'pagedown',
	home: parsed.name === 'home',
	end: parsed.name === 'end',
	return: parsed.name === 'return',
	escape: parsed.name === 'escape',
	tab: parsed.name === 'tab',
	backspace: parsed.name === 'backspace',
	delete: parsed.name === 'delete',
	ctrl: parsed.ctrl,
	shift: parsed.shift,
	meta: parsed.meta,
	super: parsed.super ?? false,
	hyper: parsed.hyper ?? false,
	capsLock: parsed.capsLock ?? false,
	numLock: parsed.numLock ?? false,
	eventType: parsed.eventType,
});

// Ink uses ~100ms — long enough that fast typing of Esc-prefixed sequences
// (Alt+letter) doesn't get split, short enough that a bare Esc keypress is
// reported promptly.
const ESCAPE_TIMEOUT_MS = 100;

const computeInput = (parsed: ParsedKey): string => {
	let input: string;
	if (parsed.isKittyProtocol) {
		if (parsed.isPrintable) {
			input = parsed.text ?? parsed.name;
		} else if (parsed.ctrl && parsed.name.length === 1) {
			input = parsed.name;
		} else {
			input = '';
		}
	} else if (parsed.ctrl) {
		input = parsed.name ?? '';
	} else {
		input = parsed.sequence;
	}

	if (!parsed.isKittyProtocol && nonAlphanumericKeys.has(parsed.name)) {
		input = '';
	}

	// Strip escape prefix from incomplete sequences flushed by the timer.
	if (input.startsWith('\x1b')) input = input.slice(1);

	return input;
};

export type InputManager = {
	emitter: EventEmitter;
	isRawModeSupported: boolean;
	setRawMode: (enable: boolean) => void;
	setBracketedPasteMode: (enable: boolean) => void;
	// Replay bytes through the same parser `useInput` consumes. Used by the
	// kitty `auto` detection path to hand back user keystrokes that landed in
	// its detection-window listener — `stdin.unshift()` would drop them if no
	// `data` listener is attached yet (e.g. no `useInput`/`useFocus` mounted
	// during the 200ms window). See brain/renderer/kitty-detection.md.
	bufferInput: (bytes: Uint8Array) => void;
	destroy: () => void;
};

export type InputManagerOptions = {
	stdin: NodeJS.ReadStream;
	stdout: NodeJS.WriteStream;
	exitOnCtrlC: boolean;
	onCtrlC: () => void;
};

export const createInputManager = ({
	stdin,
	stdout,
	exitOnCtrlC,
	onCtrlC,
}: InputManagerOptions): InputManager => {
	const emitter = new EventEmitter();
	emitter.setMaxListeners(0);
	const isRawModeSupported =
		Boolean(stdin.isTTY) && typeof stdin.setRawMode === 'function';

	const parser: InputParser = createInputParser();
	let rawModeUsers = 0;
	let pasteModeUsers = 0;
	let listening = false;
	let pendingEscapeTimer: NodeJS.Timeout | undefined;
	// Bytes handed in via `bufferInput()` before `startListening()` fires.
	// Drained through `onData` once the first listener attaches.
	let pendingInput: Buffer[] = [];

	const emitKeypress = (sequence: string): void => {
		const parsed = parseKeypress(sequence);
		const key = toKey(parsed);
		const input = computeInput(parsed);

		// Promote single-uppercase-letter input to shift so consumers can rely
		// on key.shift for case-insensitive matching.
		if (input.length === 1 && /[A-Z]/.test(input)) key.shift = true;

		if (exitOnCtrlC && key.ctrl && input === 'c') {
			onCtrlC();
			return;
		}

		emitter.emit('input', input, key);
	};

	const flushPendingEscape = (): void => {
		const pending = parser.flushPendingEscape();
		if (pending !== undefined) emitKeypress(pending);
	};

	const clearPendingTimer = (): void => {
		if (pendingEscapeTimer) {
			clearTimeout(pendingEscapeTimer);
			pendingEscapeTimer = undefined;
		}
	};

	const schedulePendingFlush = (): void => {
		clearPendingTimer();
		if (parser.hasPendingEscape()) {
			pendingEscapeTimer = setTimeout(() => {
				pendingEscapeTimer = undefined;
				flushPendingEscape();
			}, ESCAPE_TIMEOUT_MS);
		}
	};

	const onData = (chunk: Buffer | string): void => {
		const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
		const events = parser.push(text);
		for (const event of events) {
			if (typeof event === 'string') {
				emitKeypress(event);
			} else if (emitter.listenerCount('paste') > 0) {
				emitter.emit('paste', event.paste);
			} else {
				// Fallback: when no usePaste consumer is mounted, deliver the
				// inner paste payload to useInput as a regular keypress so
				// terminals that send PASTE_START/END unsolicited (or tests that
				// stub them) don't silently drop the content. Matches ink.
				emitKeypress(event.paste);
			}
		}
		schedulePendingFlush();
	};

	const startListening = (): void => {
		/* v8 ignore next */
		if (listening) return;
		stdin.on('data', onData);
		listening = true;
		if (pendingInput.length > 0) {
			const queued = pendingInput;
			pendingInput = [];
			// Defer the drain so any emitter listener attaching alongside this
			// `setRawMode(true)` call (e.g. `useEmitterListener` runs
			// `onAttach()` before `emitter.on()`) is registered before the
			// replayed events fire. Mirrors Node's own stream semantics —
			// `stdin.resume()` emits buffered data on the next tick, not
			// synchronously.
			queueMicrotask(() => {
				if (!listening) return;
				for (const chunk of queued) onData(chunk);
			});
		}
	};

	const bufferInput = (bytes: Uint8Array): void => {
		if (bytes.length === 0) return;
		const chunk = Buffer.from(bytes);
		if (listening) {
			onData(chunk);
			return;
		}
		pendingInput.push(chunk);
	};

	const stopListening = (): void => {
		if (!listening) return;
		stdin.off('data', onData);
		clearPendingTimer();
		parser.reset();
		listening = false;
	};

	const setRawMode = (enable: boolean): void => {
		if (!isRawModeSupported) {
			throw new Error(
				'Raw mode is not supported on the current stdin. See https://github.com/vadimdemedes/ink#israwmodesupported',
			);
		}

		if (enable) {
			rawModeUsers += 1;
			if (rawModeUsers === 1) {
				stdin.setRawMode!(true);
				startListening();
				if (typeof stdin.resume === 'function') stdin.resume();
			}
			return;
		}

		rawModeUsers = Math.max(0, rawModeUsers - 1);
		if (rawModeUsers === 0) {
			stdin.setRawMode!(false);
			stopListening();
			if (typeof stdin.pause === 'function') stdin.pause();
			// Without unref(), node keeps the process alive waiting on stdin
			// even after we've torn down — see ink's App.tsx disableRawMode.
			if (typeof (stdin as { unref?: () => void }).unref === 'function') {
				(stdin as { unref: () => void }).unref();
			}
		}
	};

	const setBracketedPasteMode = (enable: boolean): void => {
		if (enable) {
			pasteModeUsers += 1;
			if (pasteModeUsers === 1) {
				stdout.write('\x1b[?2004h');
			}
			return;
		}

		pasteModeUsers = Math.max(0, pasteModeUsers - 1);
		if (pasteModeUsers === 0) {
			stdout.write('\x1b[?2004l');
		}
	};

	const destroy = (): void => {
		clearPendingTimer();
		if (rawModeUsers > 0 && isRawModeSupported) {
			stdin.setRawMode!(false);
			if (typeof (stdin as { unref?: () => void }).unref === 'function') {
				(stdin as { unref: () => void }).unref();
			}
		}
		if (pasteModeUsers > 0) {
			stdout.write('\x1b[?2004l');
		}
		rawModeUsers = 0;
		pasteModeUsers = 0;
		pendingInput = [];
		stopListening();
		emitter.removeAllListeners();
	};

	return {
		emitter,
		isRawModeSupported,
		setRawMode,
		setBracketedPasteMode,
		bufferInput,
		destroy,
	};
};
