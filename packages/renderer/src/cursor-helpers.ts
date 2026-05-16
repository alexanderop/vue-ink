// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
//
// Pure escape-sequence builders for the renderer's cursor accounting. Kept
// free of side-effects so the render hot-path can call them per-paint and
// unit tests can assert exact byte output.
import ansiEscapes from 'ansi-escapes';
import type { CursorPosition } from './context.ts';

export type { CursorPosition };

export const showCursorEscape = ansiEscapes.cursorShow;
export const hideCursorEscape = ansiEscapes.cursorHide;

/**
 * Compare two cursor positions. Returns `true` if they differ.
 */
export const cursorPositionChanged = (
	a: CursorPosition | undefined,
	b: CursorPosition | undefined,
): boolean => a?.x !== b?.x || a?.y !== b?.y;

/**
 * Build the escape sequence that moves the cursor from the bottom of the
 * just-painted output to the target position and shows it. Assumes the cursor
 * sits at (col 0, line visibleLineCount) — i.e. immediately after the last
 * output line.
 */
export const buildCursorSuffix = (
	visibleLineCount: number,
	cursorPosition: CursorPosition | undefined,
): string => {
	if (!cursorPosition) return '';

	const moveUp = visibleLineCount - cursorPosition.y;
	return (
		(moveUp > 0 ? ansiEscapes.cursorUp(moveUp) : '') +
		ansiEscapes.cursorTo(cursorPosition.x) +
		showCursorEscape
	);
};

/**
 * Build the escape sequence that walks the cursor back from
 * `previousCursorPosition` to the bottom-left of the previous frame. Must be
 * emitted before any erase or rewrite because the erase math assumes the
 * cursor sits below the frame.
 *
 * `previousLineCount` includes the trailing newline, so the visible last row
 * index is `previousLineCount - 1`.
 */
export const buildReturnToBottom = (
	previousLineCount: number,
	previousCursorPosition: CursorPosition | undefined,
): string => {
	if (!previousCursorPosition) return '';

	const down = previousLineCount - 1 - previousCursorPosition.y;
	return (
		(down > 0 ? ansiEscapes.cursorDown(down) : '') + ansiEscapes.cursorTo(0)
	);
};

export type CursorOnlyInput = {
	cursorWasShown: boolean;
	previousLineCount: number;
	previousCursorPosition: CursorPosition | undefined;
	visibleLineCount: number;
	cursorPosition: CursorPosition | undefined;
};

/**
 * Build the escape sequence for cursor-only updates (output unchanged, cursor
 * moved). Hides the cursor if it was previously shown, walks back to the
 * bottom, then repositions to the new cursor target.
 */
export const buildCursorOnlySequence = (input: CursorOnlyInput): string => {
	const hidePrefix = input.cursorWasShown ? hideCursorEscape : '';
	const returnToBottom = buildReturnToBottom(
		input.previousLineCount,
		input.previousCursorPosition,
	);
	const cursorSuffix = buildCursorSuffix(
		input.visibleLineCount,
		input.cursorPosition,
	);
	return hidePrefix + returnToBottom + cursorSuffix;
};

/**
 * Build the prefix that hides the cursor (if it was visible) and returns it
 * to the bottom-left of the previous frame before erasing or rewriting.
 * Returns an empty string when the cursor was not shown.
 */
export const buildReturnToBottomPrefix = (
	cursorWasShown: boolean,
	previousLineCount: number,
	previousCursorPosition: CursorPosition | undefined,
): string => {
	if (!cursorWasShown) return '';
	return (
		hideCursorEscape +
		buildReturnToBottom(previousLineCount, previousCursorPosition)
	);
};
