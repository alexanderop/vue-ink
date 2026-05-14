import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createInputParser, type InputEvent } from '../../renderer/src/input-parser.ts';

const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';

const serializeEvent = (event: InputEvent): string =>
	typeof event === 'string' ? event : `${PASTE_START}${event.paste}${PASTE_END}`;

const runChunked = (
	chunks: readonly string[],
): { events: InputEvent[]; pending: string } => {
	const parser = createInputParser();
	const events: InputEvent[] = [];
	for (const chunk of chunks) events.push(...parser.push(chunk));
	return { events, pending: parser.flushPendingEscape() ?? '' };
};

// Single UTF-16-unit alphabet rich in protocol-significant bytes. No surrogate
// pairs — chunking invariance is defined on UTF-16 index splits and a split
// landing inside a surrogate pair is not a meaningful real-world case (Node's
// StringDecoder buffers multi-byte UTF-8 before delivering to stdin listeners).
const protocolUnit = fc.constantFrom(
	'\x1b', '[', 'O', 'A', 'B', 'C', 'D', '~', ';',
	'0', '1', '2', '5', '9',
	'm', 'h', 'a', 'u', '?',
	' ', '\x7f', '\x08', '\r', '\n', '\t',
	'x', '>',
);

const inputString = fc.string({ unit: protocolUnit, maxLength: 80 });

// Plain-text events have no internal boundary semantics — a chunk boundary
// that falls inside ASCII text legitimately produces two adjacent string
// events ("ab" vs ["a", "b"]). The parser's real contract is that escape
// sequences, paste events, and backspace bytes stay atomic. Joining adjacent
// plain-text events normalises away the chunk-boundary noise so the property
// asserts the contract instead of the incidental shape.
const isPlainText = (event: InputEvent): event is string =>
	typeof event === 'string' &&
	event !== '\x7f' &&
	event !== '\x08' &&
	!event.startsWith('\x1b');

const coalescePlainText = (events: readonly InputEvent[]): InputEvent[] => {
	const out: InputEvent[] = [];
	for (const event of events) {
		const previous = out[out.length - 1];
		if (isPlainText(event) && previous !== undefined && isPlainText(previous)) {
			out[out.length - 1] = previous + event;
		} else {
			out.push(event);
		}
	}
	return out;
};

const splitInto = (input: string, rawSplits: readonly number[]): string[] => {
	const splits = [
		...new Set(rawSplits.map((n) => n % (input.length + 1))),
	].sort((a, b) => a - b);
	const chunks: string[] = [];
	let last = 0;
	for (const s of splits) {
		chunks.push(input.slice(last, s));
		last = s;
	}
	chunks.push(input.slice(last));
	return chunks;
};

describe('createInputParser — properties', () => {
	it('round-trip: serialised events + flushed pending reconstruct the input', () => {
		fc.assert(
			fc.property(inputString, (input) => {
				const { events, pending } = runChunked([input]);
				const reconstructed = events.map(serializeEvent).join('') + pending;
				expect(reconstructed).toBe(input);
			}),
			{ numRuns: 500 },
		);
	});

	it('chunking invariance: escape sequences, paste, and backspace survive any chunk split', () => {
		fc.assert(
			fc.property(
				inputString,
				fc.array(fc.nat(), { maxLength: 10 }),
				(input, rawSplits) => {
					const whole = runChunked([input]);
					const chunked = runChunked(splitInto(input, rawSplits));
					expect(coalescePlainText(chunked.events)).toEqual(
						coalescePlainText(whole.events),
					);
					expect(chunked.pending).toBe(whole.pending);
				},
			),
			{ numRuns: 500 },
		);
	});

	it('backspace bytes outside paste are emitted one-per-event and never lost', () => {
		const plainAlphabet = fc.constantFrom('a', 'b', 'c', ' ', '\x7f', '\x08');
		fc.assert(
			fc.property(fc.string({ unit: plainAlphabet, maxLength: 30 }), (input) => {
				const { events } = runChunked([input]);
				for (const event of events) {
					if (typeof event !== 'string') continue;
					if (event === '\x7f' || event === '\x08') continue;
					expect(event.includes('\x7f')).toBe(false);
					expect(event.includes('\x08')).toBe(false);
				}
				const bsInInput = [...input].filter((c) => c === '\x7f' || c === '\x08').length;
				const bsInEvents = events.filter((e) => e === '\x7f' || e === '\x08').length;
				expect(bsInEvents).toBe(bsInInput);
			}),
			{ numRuns: 300 },
		);
	});
});
