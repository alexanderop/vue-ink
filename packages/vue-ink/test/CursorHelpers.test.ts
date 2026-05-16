// Ported from repos/ink/test/cursor-helpers.tsx (MIT — https://github.com/vadimdemedes/ink)
import { describe, expect, test } from 'vitest';
import ansiEscapes from 'ansi-escapes';
import {
	buildCursorOnlySequence,
	buildCursorSuffix,
	buildReturnToBottom,
	buildReturnToBottomPrefix,
	cursorPositionChanged,
	hideCursorEscape,
	showCursorEscape,
} from '@vue-ink/renderer';

describe('cursorPositionChanged', () => {
	test('both undefined returns false', () => {
		expect(cursorPositionChanged(undefined, undefined)).toBe(false);
	});

	test('same position returns false', () => {
		expect(cursorPositionChanged({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(false);
	});

	test('different x returns true', () => {
		expect(cursorPositionChanged({ x: 1, y: 2 }, { x: 3, y: 2 })).toBe(true);
	});

	test('different y returns true', () => {
		expect(cursorPositionChanged({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(true);
	});

	test('undefined vs defined returns true', () => {
		expect(cursorPositionChanged(undefined, { x: 0, y: 0 })).toBe(true);
		expect(cursorPositionChanged({ x: 0, y: 0 }, undefined)).toBe(true);
	});
});

describe('buildCursorSuffix', () => {
	test('returns empty string when cursorPosition is undefined', () => {
		expect(buildCursorSuffix(3, undefined)).toBe('');
	});

	test('moves up and positions cursor', () => {
		const result = buildCursorSuffix(3, { x: 5, y: 1 });
		expect(result).toBe(
			ansiEscapes.cursorUp(2) + ansiEscapes.cursorTo(5) + showCursorEscape,
		);
	});

	test('no cursorUp when cursor is at last visible line', () => {
		const result = buildCursorSuffix(3, { x: 0, y: 3 });
		expect(result).toBe(ansiEscapes.cursorTo(0) + showCursorEscape);
	});

	test('cursor at first line of single-line output', () => {
		const result = buildCursorSuffix(1, { x: 4, y: 0 });
		expect(result).toBe(
			ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(4) + showCursorEscape,
		);
	});
});

describe('buildReturnToBottom', () => {
	test('returns empty string when previousCursorPosition is undefined', () => {
		expect(buildReturnToBottom(4, undefined)).toBe('');
	});

	test('moves down to bottom', () => {
		const result = buildReturnToBottom(4, { x: 5, y: 0 });
		expect(result).toBe(ansiEscapes.cursorDown(3) + ansiEscapes.cursorTo(0));
	});

	test('no cursorDown when cursor already at bottom', () => {
		const result = buildReturnToBottom(4, { x: 0, y: 3 });
		expect(result).toBe(ansiEscapes.cursorTo(0));
	});
});

describe('buildCursorOnlySequence', () => {
	test('builds full sequence with hide prefix when cursor was shown', () => {
		const result = buildCursorOnlySequence({
			cursorWasShown: true,
			previousLineCount: 2,
			previousCursorPosition: { x: 0, y: 0 },
			visibleLineCount: 1,
			cursorPosition: { x: 3, y: 0 },
		});
		const expected =
			hideCursorEscape +
			buildReturnToBottom(2, { x: 0, y: 0 }) +
			buildCursorSuffix(1, { x: 3, y: 0 });
		expect(result).toBe(expected);
	});

	test('no hide prefix when cursor was not shown', () => {
		const result = buildCursorOnlySequence({
			cursorWasShown: false,
			previousLineCount: 0,
			previousCursorPosition: undefined,
			visibleLineCount: 1,
			cursorPosition: { x: 3, y: 0 },
		});
		expect(result.startsWith(hideCursorEscape)).toBe(false);
		expect(result.includes(showCursorEscape)).toBe(true);
	});
});

describe('buildReturnToBottomPrefix', () => {
	test('returns empty string when cursor was not shown', () => {
		expect(buildReturnToBottomPrefix(false, 4, { x: 0, y: 0 })).toBe('');
	});

	test('returns hide + returnToBottom when cursor was shown', () => {
		const result = buildReturnToBottomPrefix(true, 4, { x: 0, y: 0 });
		expect(result).toBe(hideCursorEscape + buildReturnToBottom(4, { x: 0, y: 0 }));
	});

	test('with undefined previousCursorPosition still hides cursor', () => {
		const result = buildReturnToBottomPrefix(true, 4, undefined);
		expect(result).toBe(hideCursorEscape + buildReturnToBottom(4, undefined));
	});
});
