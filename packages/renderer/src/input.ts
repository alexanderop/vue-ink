import { EventEmitter } from 'node:events';
import readline from 'node:readline';

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
};

type RawKeypress = {
	sequence?: string;
	name?: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
};

const NON_PRINTABLE = new Set([
	'up',
	'down',
	'left',
	'right',
	'pageup',
	'pagedown',
	'home',
	'end',
	'return',
	'escape',
	'tab',
	'backspace',
	'delete',
	'insert',
]);

const toKey = (raw: RawKeypress): Key => ({
	upArrow: raw.name === 'up',
	downArrow: raw.name === 'down',
	leftArrow: raw.name === 'left',
	rightArrow: raw.name === 'right',
	pageUp: raw.name === 'pageup',
	pageDown: raw.name === 'pagedown',
	home: raw.name === 'home',
	end: raw.name === 'end',
	return: raw.name === 'return',
	escape: raw.name === 'escape',
	tab: raw.name === 'tab',
	backspace: raw.name === 'backspace',
	delete: raw.name === 'delete',
	ctrl: raw.ctrl ?? false,
	shift: raw.shift ?? false,
	meta: raw.meta ?? false,
});

export type InputManager = {
	emitter: EventEmitter;
	isRawModeSupported: boolean;
	setRawMode: (enable: boolean) => void;
	destroy: () => void;
};

export type InputManagerOptions = {
	stdin: NodeJS.ReadStream;
	exitOnCtrlC: boolean;
	onCtrlC: () => void;
};

export const createInputManager = ({
	stdin,
	exitOnCtrlC,
	onCtrlC,
}: InputManagerOptions): InputManager => {
	const emitter = new EventEmitter();
	emitter.setMaxListeners(0);
	const isRawModeSupported = Boolean(stdin.isTTY) && typeof stdin.setRawMode === 'function';

	let rawModeUsers = 0;
	let listening = false;

	const handleKeypress = (str: string | undefined, raw: RawKeypress | undefined): void => {
		const key = toKey(raw ?? {});

		if (exitOnCtrlC && key.ctrl && raw?.name === 'c') {
			onCtrlC();
			return;
		}

		let input = '';
		if (raw?.name && NON_PRINTABLE.has(raw.name)) {
			input = '';
		} else if (raw?.ctrl && raw.name) {
			input = raw.name;
		} else {
			input = str ?? '';
		}

		emitter.emit('input', input, key);
	};

	const startListening = (): void => {
		// Defensive: callers gate this on rawModeUsers transitioning 0→1, so
		// the early-return is never tripped through the public API.
		/* v8 ignore next */
		if (listening) return;
		readline.emitKeypressEvents(stdin);
		stdin.on('keypress', handleKeypress);
		listening = true;
	};

	const stopListening = (): void => {
		if (!listening) return;
		stdin.off('keypress', handleKeypress);
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
				if (typeof (stdin as NodeJS.ReadStream).resume === 'function') {
					stdin.resume();
				}
			}
			return;
		}

		rawModeUsers = Math.max(0, rawModeUsers - 1);
		if (rawModeUsers === 0) {
			stdin.setRawMode!(false);
			stopListening();
			if (typeof (stdin as NodeJS.ReadStream).pause === 'function') {
				stdin.pause();
			}
		}
	};

	const destroy = (): void => {
		if (rawModeUsers > 0 && isRawModeSupported) {
			stdin.setRawMode!(false);
		}
		rawModeUsers = 0;
		stopListening();
		emitter.removeAllListeners();
	};

	return { emitter, isRawModeSupported, setRawMode, destroy };
};
