import { EventEmitter } from 'events';
import type { Terminal } from '@xterm/xterm';

// vue-ink hands its `render()` two Node streams. In the browser we synthesise
// objects with just enough shape — `isTTY`, `columns`, `rows`, `write`, the
// `resize` event on stdout; `setRawMode`, `resume`, `pause` and `data` events
// on stdin — so the renderer's TTY paths run unchanged.

export type Shims = {
	stdout: NodeJS.WriteStream;
	stdin: NodeJS.ReadStream;
	stderr: NodeJS.WriteStream;
	dispose: () => void;
};

type WriteShim = EventEmitter & {
	isTTY: boolean;
	columns: number;
	rows: number;
	write: NodeJS.WriteStream['write'];
	cursorTo: () => boolean;
	moveCursor: () => boolean;
	clearLine: () => boolean;
	clearScreenDown: () => boolean;
	getColorDepth: () => number;
	hasColors: () => boolean;
	end: () => WriteShim;
};

type ReadShim = EventEmitter & {
	isTTY: boolean;
	isRaw: boolean;
	setRawMode: NodeJS.ReadStream['setRawMode'];
	resume: () => ReadShim;
	pause: () => ReadShim;
	setEncoding: () => ReadShim;
	ref: () => ReadShim;
	unref: () => ReadShim;
	read: () => null;
};

const pickCallback = (a: unknown, b: unknown): (() => void) | undefined => {
	if (typeof a === 'function') return a as () => void;
	if (typeof b === 'function') return b as () => void;
	return undefined;
};

const noopWriteStream = (term: Terminal): WriteShim => {
	const s = new EventEmitter() as WriteShim;
	s.isTTY = true;
	s.columns = term.cols;
	s.rows = term.rows;
	s.write = ((chunk: string | Uint8Array, cbOrEnc?: unknown, cb?: unknown): boolean => {
		term.write(chunk as string);
		pickCallback(cbOrEnc, cb)?.();
		return true;
	}) as NodeJS.WriteStream['write'];
	// xterm.js reads the ANSI the renderer emits via `write`, so these methods
	// just need to exist for cursor-restore / shutdown paths to not throw.
	s.cursorTo = () => true;
	s.moveCursor = () => true;
	s.clearLine = () => true;
	s.clearScreenDown = () => true;
	s.getColorDepth = () => 24;
	s.hasColors = () => true;
	s.end = () => s;
	return s;
};

export const createShims = (term: Terminal): Shims => {
	// stdout and stderr both write into the same xterm — one shim covers both.
	const stdout = noopWriteStream(term);

	const stdin = new EventEmitter() as ReadShim;
	stdin.isTTY = true;
	stdin.isRaw = false;
	stdin.setRawMode = ((mode: boolean) => {
		stdin.isRaw = Boolean(mode);
		return stdin;
	}) as NodeJS.ReadStream['setRawMode'];
	stdin.resume = () => stdin;
	stdin.pause = () => stdin;
	stdin.setEncoding = () => stdin;
	stdin.ref = () => stdin;
	stdin.unref = () => stdin;
	stdin.read = () => null;

	const onResize = term.onResize(({ cols, rows }) => {
		stdout.columns = cols;
		stdout.rows = rows;
		stdout.emit('resize');
	});

	// xterm fires this for every keystroke and pasted chunk. The renderer's
	// input parser handles both `Buffer` and `string` (input.ts:166-167).
	const onData = term.onData((data) => {
		stdin.emit('data', data);
	});

	return {
		stdout: stdout as unknown as NodeJS.WriteStream,
		stdin: stdin as unknown as NodeJS.ReadStream,
		stderr: stdout as unknown as NodeJS.WriteStream,
		dispose: () => {
			onResize.dispose();
			onData.dispose();
		},
	};
};
