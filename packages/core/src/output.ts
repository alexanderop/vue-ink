// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import {
	type StyledChar,
	styledCharsFromTokens,
	styledCharsToString,
	tokenize,
} from '@alcalzone/ansi-tokenize';
import { type OutputTransformer } from './render-node-to-output.ts';

type Options = {
	width: number;
	height: number;
};

type Operation = WriteOperation | ClipOperation | UnclipOperation;
type WriteOperation = {
	type: 'write';
	x: number;
	y: number;
	text: string;
	transformers: OutputTransformer[];
};
type ClipOperation = { type: 'clip'; clip: Clip };
type UnclipOperation = { type: 'unclip' };
type Clip = {
	x1: number | undefined;
	x2: number | undefined;
	y1: number | undefined;
	y2: number | undefined;
};

// One shared, frozen sentinel for filling sparse gaps in the styled-row path
// of stringifyRow. The prior implementation allocated a fresh
// `{ type, value, fullWidth, styles: [] }` per cell which dominated
// FlatList(1000) re-renders (~12ms / frame for 80×1000 = 80k allocations).
// Safe because writes replace the slot wholesale — they never mutate the
// sentinel.
const EMPTY_CELL: StyledChar = Object.freeze({
	type: 'char',
	value: ' ',
	fullWidth: false,
	styles: [],
}) as StyledChar;

class OutputCaches {
	widths = new Map<string, number>();
	blockWidths = new Map<string, number>();
	styledChars = new Map<string, StyledChar[]>();

	getStyledChars(line: string): StyledChar[] {
		let cached = this.styledChars.get(line);
		if (cached === undefined) {
			cached = styledCharsFromTokens(tokenize(line));
			this.styledChars.set(line, cached);
		}
		return cached;
	}

	getStringWidth(text: string): number {
		let cached = this.widths.get(text);
		if (cached === undefined) {
			cached = stringWidth(text);
			this.widths.set(text, cached);
		}
		return cached;
	}

	getWidestLine(text: string): number {
		let cached = this.blockWidths.get(text);
		if (cached === undefined) {
			let lineWidth = 0;
			for (const line of text.split('\n')) {
				lineWidth = Math.max(lineWidth, this.getStringWidth(line));
			}
			cached = lineWidth;
			this.blockWidths.set(text, cached);
		}
		return cached;
	}
}

export default class Output {
	width: number;
	height: number;
	private readonly operations: Operation[] = [];
	private readonly caches: OutputCaches = new OutputCaches();

	constructor(options: Options) {
		this.width = options.width;
		this.height = options.height;
	}

	write(x: number, y: number, text: string, options: { transformers: OutputTransformer[] }): void {
		if (!text) return;
		this.operations.push({ type: 'write', x, y, text, transformers: options.transformers });
	}

	clip(clip: Clip): void {
		this.operations.push({ type: 'clip', clip });
	}

	unclip(): void {
		this.operations.push({ type: 'unclip' });
	}

	get(): { output: string; height: number } {
		const output: (StyledChar[] | undefined)[] = new Array(this.height);
		// Per-row column past the last written cell. Stays 0 for untouched
		// rows (they emit ""), and bounds the scan/concat in stringifyRow so
		// we never walk trailing space that trimEnd would discard anyway —
		// for FlatList(1000) that's the difference between 80k cells/frame
		// and ~6k cells/frame.
		const rowEnds: number[] = new Array(this.height).fill(0);

		const clips: Clip[] = [];

		for (const operation of this.operations) {
			if (operation.type === 'clip') clips.push(operation.clip);
			if (operation.type === 'unclip') clips.pop();

			if (operation.type === 'write') {
				const { text, transformers } = operation;
				let { x, y } = operation;
				let lines = text.split('\n');
				const clip = clips.at(-1);

				if (clip) {
					const clipH = typeof clip.x1 === 'number' && typeof clip.x2 === 'number';
					const clipV = typeof clip.y1 === 'number' && typeof clip.y2 === 'number';
					if (clipH) {
						const width = this.caches.getWidestLine(text);
						if (x + width < clip.x1! || x > clip.x2!) continue;
					}
					if (clipV) {
						const height = lines.length;
						if (y + height < clip.y1! || y > clip.y2!) continue;
					}
					if (clipH) {
						lines = lines.map((line) => {
							const from = x < clip.x1! ? clip.x1! - x : 0;
							const width = this.caches.getStringWidth(line);
							const to = x + width > clip.x2! ? clip.x2! - x : width;
							return sliceAnsi(line, from, to);
						});
						if (x < clip.x1!) x = clip.x1!;
					}
					if (clipV) {
						const from = y < clip.y1! ? clip.y1! - y : 0;
						const height = lines.length;
						const to = y + height > clip.y2! ? clip.y2! - y : height;
						lines = lines.slice(from, to);
						if (y < clip.y1!) y = clip.y1!;
					}
				}

				// Classic for loops over `lines` / `characters` avoid the per-call
				// iterator allocations that `for…of` and `.entries()` incur —
				// non-trivial for FlatList(1000) where this fires once per row.
				const transformerCount = transformers.length;
				const linesLen = lines.length;
				for (let index = 0; index < linesLen; index += 1) {
					const rowIndex = y + index;
					if (rowIndex < 0 || rowIndex >= this.height) continue;

					const rawLine = lines[index]!;
					let line = rawLine;
					if (transformerCount > 0) {
						for (let t = 0; t < transformerCount; t += 1) {
							line = transformers[t]!(line, index);
						}
					}

					const characters = this.caches.getStyledChars(line);
					const charsLen = characters.length;
					if (charsLen === 0) continue;

					let currentLine = output[rowIndex];
					if (currentLine === undefined) {
						currentLine = [];
						output[rowIndex] = currentLine;
					}

					let offsetX = x;
					// Wide chars (CJK, emoji) occupy two cells: leading cell + a
					// trailing placeholder with value ''. If our write lands on the
					// placeholder, the leading half of the existing wide char must
					// be replaced with a space — otherwise the terminal renders a
					// half-visible glyph. Mirrors ink's output.ts boundary cleanup.
					if (
						currentLine[offsetX]?.value === '' &&
						offsetX > 0 &&
						this.caches.getStringWidth(currentLine[offsetX - 1]?.value ?? '') > 1
					) {
						currentLine[offsetX - 1] = {
							type: 'char',
							value: ' ',
							fullWidth: false,
							styles: [],
						};
					}
					for (let c = 0; c < charsLen; c += 1) {
						const character = characters[c]!;
						currentLine[offsetX] = character;
						const characterWidth = Math.max(1, this.caches.getStringWidth(character.value));
						if (characterWidth > 1) {
							for (let i = 1; i < characterWidth; i += 1) {
								currentLine[offsetX + i] = {
									type: 'char',
									value: '',
									fullWidth: false,
									styles: character.styles,
								};
							}
						}
						offsetX += characterWidth;
					}
					// Symmetric cleanup on the right: if the write ended on the
					// leading cell of a wide char, its trailing placeholder is now
					// orphaned and must become a space.
					if (currentLine[offsetX]?.value === '') {
						currentLine[offsetX] = {
							type: 'char',
							value: ' ',
							fullWidth: false,
							styles: [],
						};
					}
					if (offsetX > rowEnds[rowIndex]!) rowEnds[rowIndex] = offsetX;
				}
			}
		}

		const rows: string[] = new Array(this.height);
		for (let y = 0; y < this.height; y += 1) {
			const row = output[y];
			rows[y] = row === undefined ? '' : stringifyRow(row, rowEnds[y]!);
		}
		return { output: rows.join('\n'), height: this.height };
	}
}

// Rows are sparse arrays: only written cells are populated. Untouched gaps
// are `undefined` and rendered as default-style spaces. The end-bound (column
// past the last written cell) lets us skip the trailing run that trimEnd
// would discard anyway — for FlatList(1000) this is the difference between
// walking 80k cells/frame and a few thousand.
//
// Single pass: accumulate plain characters until a styled cell is hit, then
// switch to the styled path (which has to walk the full row to build the
// styledCharsToString input). Pure-plain rows — the common case — finish in
// one walk; mixed rows pay one walk and one fill.
const stringifyRow = (line: StyledChar[], end: number): string => {
	if (end === 0) return '';
	let plain = '';
	for (let i = 0; i < end; i += 1) {
		const cell = line[i];
		if (cell !== undefined && cell.styles.length > 0) {
			// Fill any sparse gaps with the shared EMPTY_CELL so
			// styledCharsToString gets a contiguous run.
			const filled: StyledChar[] = new Array(end);
			for (let j = 0; j < end; j += 1) filled[j] = line[j] ?? EMPTY_CELL;
			return styledCharsToString(filled).trimEnd();
		}
		plain += cell?.value ?? ' ';
	}
	return plain.trimEnd();
};
