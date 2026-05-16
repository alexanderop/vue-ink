// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
//
// Self-contained renderer for the "overwrite the previous frame" pattern used
// by terminal UIs. Two flavours:
//
//   - `createStandard` — erase the whole previous frame and rewrite from
//     scratch every paint. Simple, low overhead per frame, predictable.
//   - `createIncremental` — line-level diff against the previous frame, skip
//     identical lines, only rewrite what changed. Eliminates flicker on busy
//     screens and is what `render({ incrementalRendering: true })` is built on.
//
// Both flavours share the same `LogUpdate` shape: callable for a paint, plus
// `clear`, `done`, `reset`, `sync`, `setCursorPosition`, `isCursorDirty`,
// `willRender`. `sync(str)` is the "the terminal just got cleared, here's the
// authoritative state" handshake — adopt `str` as the new baseline without
// erasing anything, then position the cursor if dirty.
//
// vue-ink's `render.ts` does NOT use this module; it inlines a bespoke
// log-update with extra hooks for `<Static>` scrollback and synchronized
// updates. This module exists so the surface can be tested at parity with
// ink and reused by tooling that needs the bare frame-overwrite primitive.
import type { Writable } from 'node:stream';
import ansiEscapes from 'ansi-escapes';
import {
	buildCursorOnlySequence,
	buildCursorSuffix,
	buildReturnToBottomPrefix,
	cursorPositionChanged,
	hideCursorEscape,
	showCursorEscape,
	type CursorPosition,
} from './cursor-helpers.ts';

export type { CursorPosition } from './cursor-helpers.ts';

export type LogUpdate = {
	clear: () => void;
	done: () => void;
	reset: () => void;
	sync: (str: string) => void;
	setCursorPosition: (position: CursorPosition | undefined) => void;
	isCursorDirty: () => boolean;
	willRender: (str: string) => boolean;
	(str: string): boolean;
};

// Count visible lines in a string, ignoring the trailing empty element that
// `split('\n')` produces when the string ends with '\n'.
const visibleLineCount = (lines: string[], str: string): number =>
	str.endsWith('\n') ? lines.length - 1 : lines.length;

const writeCursorHide = (stream: Writable): void => {
	stream.write(hideCursorEscape);
};

const writeCursorShow = (stream: Writable): void => {
	stream.write(showCursorEscape);
};

const createStandard = (
	stream: Writable,
	{ showCursor = false } = {},
): LogUpdate => {
	let previousLineCount = 0;
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let cursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;

	const getActiveCursor = (): CursorPosition | undefined =>
		cursorDirty ? cursorPosition : undefined;

	const hasChanges = (
		str: string,
		activeCursor: CursorPosition | undefined,
	): boolean => {
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		return str !== previousOutput || cursorChanged;
	};

	const render = (str: string): boolean => {
		if (!showCursor && !hasHiddenCursor) {
			writeCursorHide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		cursorDirty = false;
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);

		if (!hasChanges(str, activeCursor)) {
			return false;
		}

		const lines = str.split('\n');
		const visibleCount = visibleLineCount(lines, str);
		const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);

		if (str === previousOutput && cursorChanged) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown,
					previousLineCount,
					previousCursorPosition,
					visibleLineCount: visibleCount,
					cursorPosition: activeCursor,
				}),
			);
		} else {
			previousOutput = str;
			const returnPrefix = buildReturnToBottomPrefix(
				cursorWasShown,
				previousLineCount,
				previousCursorPosition,
			);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLineCount) +
					str +
					cursorSuffix,
			);
			previousLineCount = lines.length;
		}

		previousCursorPosition = activeCursor ? { ...activeCursor } : undefined;
		cursorWasShown = activeCursor !== undefined;
		return true;
	};

	render.clear = (): void => {
		const prefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLineCount,
			previousCursorPosition,
		);
		stream.write(prefix + ansiEscapes.eraseLines(previousLineCount));
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.done = (): void => {
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;

		if (!showCursor) {
			writeCursorShow(stream);
			hasHiddenCursor = false;
		}
	};

	render.reset = (): void => {
		previousOutput = '';
		previousLineCount = 0;
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.sync = (str: string): void => {
		const activeCursor = cursorDirty ? cursorPosition : undefined;
		cursorDirty = false;

		const lines = str.split('\n');
		previousOutput = str;
		previousLineCount = lines.length;

		if (!activeCursor && cursorWasShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(
				buildCursorSuffix(visibleLineCount(lines, str), activeCursor),
			);
		}

		previousCursorPosition = activeCursor ? { ...activeCursor } : undefined;
		cursorWasShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined): void => {
		cursorPosition = position;
		cursorDirty = true;
	};

	render.isCursorDirty = (): boolean => cursorDirty;
	render.willRender = (str: string): boolean =>
		hasChanges(str, getActiveCursor());

	return render;
};

const createIncremental = (
	stream: Writable,
	{ showCursor = false } = {},
): LogUpdate => {
	let previousLines: string[] = [];
	let previousOutput = '';
	let hasHiddenCursor = false;
	let cursorPosition: CursorPosition | undefined;
	let cursorDirty = false;
	let previousCursorPosition: CursorPosition | undefined;
	let cursorWasShown = false;

	const getActiveCursor = (): CursorPosition | undefined =>
		cursorDirty ? cursorPosition : undefined;

	const hasChanges = (
		str: string,
		activeCursor: CursorPosition | undefined,
	): boolean => {
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);
		return str !== previousOutput || cursorChanged;
	};

	const render = (str: string): boolean => {
		if (!showCursor && !hasHiddenCursor) {
			writeCursorHide(stream);
			hasHiddenCursor = true;
		}

		// Only use cursor if setCursorPosition was called since last render.
		// This ensures stale positions don't persist after component unmount.
		const activeCursor = getActiveCursor();
		cursorDirty = false;
		const cursorChanged = cursorPositionChanged(
			activeCursor,
			previousCursorPosition,
		);

		if (!hasChanges(str, activeCursor)) {
			return false;
		}

		const nextLines = str.split('\n');
		const visibleCount = visibleLineCount(nextLines, str);
		const previousVisible = visibleLineCount(previousLines, previousOutput);

		if (str === previousOutput && cursorChanged) {
			stream.write(
				buildCursorOnlySequence({
					cursorWasShown,
					previousLineCount: previousLines.length,
					previousCursorPosition,
					visibleLineCount: visibleCount,
					cursorPosition: activeCursor,
				}),
			);
			previousCursorPosition = activeCursor ? { ...activeCursor } : undefined;
			cursorWasShown = activeCursor !== undefined;
			return true;
		}

		const returnPrefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLines.length,
			previousCursorPosition,
		);

		if (str === '\n' || previousOutput.length === 0) {
			const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
			stream.write(
				returnPrefix +
					ansiEscapes.eraseLines(previousLines.length) +
					str +
					cursorSuffix,
			);
			cursorWasShown = activeCursor !== undefined;
			previousCursorPosition = activeCursor ? { ...activeCursor } : undefined;
			previousOutput = str;
			previousLines = nextLines;
			return true;
		}

		const hasTrailingNewline = str.endsWith('\n');

		// Aggregate all chunks for the incremental diff into a single write.
		const buffer: string[] = [];
		buffer.push(returnPrefix);

		// Clear extra lines if the current content's line count is lower than
		// the previous frame's. `extraSlot` accounts for the trailing newline
		// the previous output reserved.
		if (visibleCount < previousVisible) {
			const previousHadTrailingNewline = previousOutput.endsWith('\n');
			const extraSlot = previousHadTrailingNewline ? 1 : 0;
			buffer.push(
				ansiEscapes.eraseLines(previousVisible - visibleCount + extraSlot),
				ansiEscapes.cursorUp(visibleCount),
			);
		} else {
			buffer.push(ansiEscapes.cursorUp(previousLines.length - 1));
		}

		for (let i = 0; i < visibleCount; i += 1) {
			const isLastLine = i === visibleCount - 1;

			// Skip identical lines to prevent flicker.
			if (nextLines[i] === previousLines[i]) {
				// Don't move past the last line when there's no trailing newline,
				// otherwise the cursor overshoots the rendered block.
				if (!isLastLine || hasTrailingNewline) {
					buffer.push(ansiEscapes.cursorNextLine);
				}
				continue;
			}

			buffer.push(
				ansiEscapes.cursorTo(0) +
					nextLines[i] +
					ansiEscapes.eraseEndLine +
					// Don't append newline after the last line when the input
					// has no trailing newline (fullscreen mode).
					(isLastLine && !hasTrailingNewline ? '' : '\n'),
			);
		}

		const cursorSuffix = buildCursorSuffix(visibleCount, activeCursor);
		buffer.push(cursorSuffix);

		stream.write(buffer.join(''));

		cursorWasShown = activeCursor !== undefined;
		previousCursorPosition = activeCursor ? { ...activeCursor } : undefined;
		previousOutput = str;
		previousLines = nextLines;
		return true;
	};

	render.clear = (): void => {
		const prefix = buildReturnToBottomPrefix(
			cursorWasShown,
			previousLines.length,
			previousCursorPosition,
		);
		stream.write(prefix + ansiEscapes.eraseLines(previousLines.length));
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.done = (): void => {
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;

		if (!showCursor) {
			writeCursorShow(stream);
			hasHiddenCursor = false;
		}
	};

	render.reset = (): void => {
		previousOutput = '';
		previousLines = [];
		previousCursorPosition = undefined;
		cursorWasShown = false;
	};

	render.sync = (str: string): void => {
		const activeCursor = cursorDirty ? cursorPosition : undefined;
		cursorDirty = false;

		const lines = str.split('\n');
		previousOutput = str;
		previousLines = lines;

		if (!activeCursor && cursorWasShown) {
			stream.write(hideCursorEscape);
		}

		if (activeCursor) {
			stream.write(
				buildCursorSuffix(visibleLineCount(lines, str), activeCursor),
			);
		}

		previousCursorPosition = activeCursor ? { ...activeCursor } : undefined;
		cursorWasShown = activeCursor !== undefined;
	};

	render.setCursorPosition = (position: CursorPosition | undefined): void => {
		cursorPosition = position;
		cursorDirty = true;
	};

	render.isCursorDirty = (): boolean => cursorDirty;
	render.willRender = (str: string): boolean =>
		hasChanges(str, getActiveCursor());

	return render;
};

export type LogUpdateOptions = {
	showCursor?: boolean;
	incremental?: boolean;
};

const create = (
	stream: Writable,
	{ showCursor = false, incremental = false }: LogUpdateOptions = {},
): LogUpdate => {
	if (incremental) {
		return createIncremental(stream, { showCursor });
	}
	return createStandard(stream, { showCursor });
};

const logUpdate = { create };
export default logUpdate;
