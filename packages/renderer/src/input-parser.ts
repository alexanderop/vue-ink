// Streaming parser that splits raw stdin bytes into:
//   - opaque escape sequences (one event per CSI / SS3 / meta-prefix)
//   - plain text runs (with backspace 0x7F/0x08 split into their own events)
//   - bracketed-paste events ({ paste: '...' })
// Holds incomplete sequences across chunks via `pending`.
// Ported from ink's input-parser.ts.

const ESC = '\x1b';
const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

export type InputEvent = string | { readonly paste: string };

type ParsedInput = {
	readonly events: InputEvent[];
	readonly pending: string;
};

type ParsedSequence =
	| { readonly sequence: string; readonly nextIndex: number }
	| 'pending'
	| undefined;

const isCsiParameterByte = (b: number): boolean => b >= 0x30 && b <= 0x3f;
const isCsiIntermediateByte = (b: number): boolean => b >= 0x20 && b <= 0x2f;
const isCsiFinalByte = (b: number): boolean => b >= 0x40 && b <= 0x7e;

const parseCsiSequence = (
	input: string,
	startIndex: number,
	prefixLength: number,
): ParsedSequence => {
	const csiPayloadStart = startIndex + prefixLength + 1;
	let index = csiPayloadStart;
	for (; index < input.length; index += 1) {
		const byte = input.codePointAt(index);
		if (byte === undefined) return 'pending';

		if (isCsiParameterByte(byte) || isCsiIntermediateByte(byte)) continue;

		// Preserve legacy ESC[[A / ESC[[5~ — the second `[` at the payload start
		// is part of the prefix, not a final byte.
		if (byte === 0x5b && index === csiPayloadStart) continue;

		if (isCsiFinalByte(byte)) {
			return {
				sequence: input.slice(startIndex, index + 1),
				nextIndex: index + 1,
			};
		}

		return undefined;
	}

	return 'pending';
};

const parseSs3Sequence = (
	input: string,
	startIndex: number,
	prefixLength: number,
): ParsedSequence => {
	const nextIndex = startIndex + prefixLength + 2;
	if (nextIndex > input.length) return 'pending';

	const finalByte = input.codePointAt(nextIndex - 1);
	if (finalByte === undefined || !isCsiFinalByte(finalByte)) return undefined;

	return {
		sequence: input.slice(startIndex, nextIndex),
		nextIndex,
	};
};

const parseControlSequence = (
	input: string,
	startIndex: number,
	prefixLength: number,
): ParsedSequence => {
	const sequenceType = input[startIndex + prefixLength];
	if (sequenceType === undefined) return 'pending';

	if (sequenceType === '[') return parseCsiSequence(input, startIndex, prefixLength);
	if (sequenceType === 'O') return parseSs3Sequence(input, startIndex, prefixLength);

	return undefined;
};

const parseEscapedCodePoint = (
	input: string,
	escapeIndex: number,
): { readonly sequence: string; readonly nextIndex: number } => {
	const nextCodePoint = input.codePointAt(escapeIndex + 1);
	const nextCodePointLength =
		nextCodePoint !== undefined && nextCodePoint > 0xff_ff ? 2 : 1;
	const nextIndex = escapeIndex + 1 + nextCodePointLength;

	return {
		sequence: input.slice(escapeIndex, nextIndex),
		nextIndex,
	};
};

type ParsedEscapeSequence =
	| { readonly sequence: string; readonly nextIndex: number }
	| 'pending';

const parseEscapeSequence = (
	input: string,
	escapeIndex: number,
): ParsedEscapeSequence => {
	if (escapeIndex === input.length - 1) return 'pending';

	const next = input[escapeIndex + 1]!;
	if (next === ESC) {
		if (escapeIndex + 2 >= input.length) return 'pending';

		const doubleEscapeSequence = parseControlSequence(input, escapeIndex, 2);
		if (doubleEscapeSequence === 'pending') return 'pending';
		if (doubleEscapeSequence) return doubleEscapeSequence;

		return {
			sequence: input.slice(escapeIndex, escapeIndex + 2),
			nextIndex: escapeIndex + 2,
		};
	}

	const controlSequence = parseControlSequence(input, escapeIndex, 1);
	if (controlSequence === 'pending') return 'pending';
	if (controlSequence) return controlSequence;

	return parseEscapedCodePoint(input, escapeIndex);
};

// When stdin coalesces held-down backspace into a multi-byte chunk like
// "\x7f\x7f\x7f", parseKeypress doesn't recognize the multi-byte string as
// a key. Split each backspace byte into its own event. Other control chars
// (\r, \t) are NOT split because they can legitimately appear inside pasted
// text.
const splitBackspaceBytes = (text: string, events: InputEvent[]): void => {
	let textSegmentStart = 0;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index]!;
		if (character === '\x7f' || character === '\x08') {
			if (index > textSegmentStart) {
				events.push(text.slice(textSegmentStart, index));
			}
			events.push(character);
			textSegmentStart = index + 1;
		}
	}

	if (textSegmentStart < text.length) {
		events.push(text.slice(textSegmentStart));
	}
};

const parseKeypresses = (input: string): ParsedInput => {
	const events: InputEvent[] = [];
	let index = 0;
	const pendingFrom = (pendingStartIndex: number): ParsedInput => ({
		events,
		pending: input.slice(pendingStartIndex),
	});

	while (index < input.length) {
		const escapeIndex = input.indexOf(ESC, index);
		if (escapeIndex === -1) {
			splitBackspaceBytes(input.slice(index), events);
			return { events, pending: '' };
		}

		if (escapeIndex > index) {
			splitBackspaceBytes(input.slice(index, escapeIndex), events);
		}

		const parsedEscapeSequence = parseEscapeSequence(input, escapeIndex);
		if (parsedEscapeSequence === 'pending') return pendingFrom(escapeIndex);

		if (parsedEscapeSequence.sequence === PASTE_START) {
			const afterStart = parsedEscapeSequence.nextIndex;
			const endIndex = input.indexOf(PASTE_END, afterStart);
			if (endIndex === -1) return pendingFrom(escapeIndex);

			events.push({ paste: input.slice(afterStart, endIndex) });
			index = endIndex + PASTE_END.length;
			continue;
		}

		events.push(parsedEscapeSequence.sequence);
		index = parsedEscapeSequence.nextIndex;
	}

	return { events, pending: '' };
};

export type InputParser = {
	push: (chunk: string) => InputEvent[];
	hasPendingEscape: () => boolean;
	flushPendingEscape: () => string | undefined;
	reset: () => void;
};

export const createInputParser = (): InputParser => {
	let pending = '';

	return {
		push(chunk) {
			const { events, pending: nextPending } = parseKeypresses(pending + chunk);
			pending = nextPending;
			return events;
		},
		hasPendingEscape() {
			// Don't flush while we're mid-paste-start (`\x1b[200` or `\x1b[200~`
			// waiting for content) or mid-paste-end — otherwise a bare-Esc timer
			// would chop the paste in half.
			return (
				pending.startsWith(ESC) &&
				!pending.startsWith(PASTE_START) &&
				pending !== '\x1b[200'
			);
		},
		flushPendingEscape() {
			if (!pending.startsWith(ESC)) return undefined;
			const pendingEscape = pending;
			pending = '';
			return pendingEscape;
		},
		reset() {
			pending = '';
		},
	};
};
