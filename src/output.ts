// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import {
	type StyledChar,
	styledCharsFromTokens,
	styledCharsToString,
	tokenize,
} from '@alcalzone/ansi-tokenize';
import {type OutputTransformer} from './render-node-to-output.ts';

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
type ClipOperation = {type: 'clip'; clip: Clip};
type UnclipOperation = {type: 'unclip'};
type Clip = {
	x1: number | undefined;
	x2: number | undefined;
	y1: number | undefined;
	y2: number | undefined;
};

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

	write(
		x: number,
		y: number,
		text: string,
		options: {transformers: OutputTransformer[]},
	): void {
		if (!text) return;
		this.operations.push({type: 'write', x, y, text, transformers: options.transformers});
	}

	clip(clip: Clip): void {
		this.operations.push({type: 'clip', clip});
	}

	unclip(): void {
		this.operations.push({type: 'unclip'});
	}

	get(): {output: string; height: number} {
		const output: StyledChar[][] = [];

		for (let y = 0; y < this.height; y++) {
			const row: StyledChar[] = [];
			for (let x = 0; x < this.width; x++) {
				row.push({type: 'char', value: ' ', fullWidth: false, styles: []});
			}
			output.push(row);
		}

		const clips: Clip[] = [];

		for (const operation of this.operations) {
			if (operation.type === 'clip') clips.push(operation.clip);
			if (operation.type === 'unclip') clips.pop();

			if (operation.type === 'write') {
				const {text, transformers} = operation;
				let {x, y} = operation;
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
						lines = lines.map(line => {
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

				let offsetY = 0;
				for (let [index, line] of lines.entries()) {
					const currentLine = output[y + offsetY];
					if (!currentLine) continue;

					for (const transformer of transformers) {
						line = transformer(line, index);
					}

					const characters = this.caches.getStyledChars(line);
					let offsetX = x;

					if (characters.length === 0) {
						offsetY++;
						continue;
					}

					for (const character of characters) {
						currentLine[offsetX] = character;
						const characterWidth = Math.max(
							1,
							this.caches.getStringWidth(character.value),
						);
						if (characterWidth > 1) {
							for (let i = 1; i < characterWidth; i++) {
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

					offsetY++;
				}
			}
		}

		const generated = output
			.map(line => {
				const cleaned = line.filter(item => item !== undefined);
				return styledCharsToString(cleaned).trimEnd();
			})
			.join('\n');

		return {output: generated, height: output.length};
	}
}
