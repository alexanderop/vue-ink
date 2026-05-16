// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import { styledCharsFromTokens, styledCharsToString, tokenize, } from '@alcalzone/ansi-tokenize';
// One shared, frozen sentinel for filling sparse gaps in the styled-row path
// of stringifyRow. The prior implementation allocated a fresh
// `{ type, value, fullWidth, styles: [] }` per cell which dominated
// FlatList(1000) re-renders (~12ms / frame for 80×1000 = 80k allocations).
// Safe because writes replace the slot wholesale — they never mutate the
// sentinel.
const EMPTY_CELL = Object.freeze({
    type: 'char',
    value: ' ',
    fullWidth: false,
    styles: [],
});
class OutputCaches {
    widths = new Map();
    blockWidths = new Map();
    styledChars = new Map();
    getStyledChars(line) {
        let cached = this.styledChars.get(line);
        if (cached === undefined) {
            cached = styledCharsFromTokens(tokenize(line));
            this.styledChars.set(line, cached);
        }
        return cached;
    }
    getStringWidth(text) {
        let cached = this.widths.get(text);
        if (cached === undefined) {
            cached = stringWidth(text);
            this.widths.set(text, cached);
        }
        return cached;
    }
    getWidestLine(text) {
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
    width;
    height;
    operations = [];
    caches = new OutputCaches();
    constructor(options) {
        this.width = options.width;
        this.height = options.height;
    }
    write(x, y, text, options) {
        if (!text)
            return;
        this.operations.push({ type: 'write', x, y, text, transformers: options.transformers });
    }
    clip(clip) {
        this.operations.push({ type: 'clip', clip });
    }
    unclip() {
        this.operations.push({ type: 'unclip' });
    }
    get() {
        const output = new Array(this.height);
        // Per-row column past the last written cell. Stays 0 for untouched
        // rows (they emit ""), and bounds the scan/concat in stringifyRow so
        // we never walk trailing space that trimEnd would discard anyway —
        // for FlatList(1000) that's the difference between 80k cells/frame
        // and ~6k cells/frame.
        const rowEnds = new Array(this.height).fill(0);
        const clips = [];
        for (const operation of this.operations) {
            if (operation.type === 'clip')
                clips.push(operation.clip);
            if (operation.type === 'unclip')
                clips.pop();
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
                        if (x + width < clip.x1 || x > clip.x2)
                            continue;
                    }
                    if (clipV) {
                        const height = lines.length;
                        if (y + height < clip.y1 || y > clip.y2)
                            continue;
                    }
                    if (clipH) {
                        lines = lines.map((line) => {
                            const from = x < clip.x1 ? clip.x1 - x : 0;
                            const width = this.caches.getStringWidth(line);
                            const to = x + width > clip.x2 ? clip.x2 - x : width;
                            return sliceAnsi(line, from, to);
                        });
                        if (x < clip.x1)
                            x = clip.x1;
                    }
                    if (clipV) {
                        const from = y < clip.y1 ? clip.y1 - y : 0;
                        const height = lines.length;
                        const to = y + height > clip.y2 ? clip.y2 - y : height;
                        lines = lines.slice(from, to);
                        if (y < clip.y1)
                            y = clip.y1;
                    }
                }
                // Classic for loops over `lines` / `characters` avoid the per-call
                // iterator allocations that `for…of` and `.entries()` incur —
                // non-trivial for FlatList(1000) where this fires once per row.
                const transformerCount = transformers.length;
                const linesLen = lines.length;
                for (let index = 0; index < linesLen; index += 1) {
                    const rowIndex = y + index;
                    if (rowIndex < 0 || rowIndex >= this.height)
                        continue;
                    const rawLine = lines[index];
                    let line = rawLine;
                    if (transformerCount > 0) {
                        for (let t = 0; t < transformerCount; t += 1) {
                            line = transformers[t](line, index);
                        }
                    }
                    const characters = this.caches.getStyledChars(line);
                    const charsLen = characters.length;
                    if (charsLen === 0)
                        continue;
                    let currentLine = output[rowIndex];
                    if (currentLine === undefined) {
                        currentLine = [];
                        output[rowIndex] = currentLine;
                    }
                    let offsetX = x;
                    for (let c = 0; c < charsLen; c += 1) {
                        const character = characters[c];
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
                    if (offsetX > rowEnds[rowIndex])
                        rowEnds[rowIndex] = offsetX;
                }
            }
        }
        const rows = new Array(this.height);
        for (let y = 0; y < this.height; y += 1) {
            const row = output[y];
            rows[y] = row === undefined ? '' : stringifyRow(row, rowEnds[y]);
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
const stringifyRow = (line, end) => {
    if (end === 0)
        return '';
    let plain = '';
    for (let i = 0; i < end; i += 1) {
        const cell = line[i];
        if (cell !== undefined && cell.styles.length > 0) {
            // Fill any sparse gaps with the shared EMPTY_CELL so
            // styledCharsToString gets a contiguous run.
            const filled = new Array(end);
            for (let j = 0; j < end; j += 1)
                filled[j] = line[j] ?? EMPTY_CELL;
            return styledCharsToString(filled).trimEnd();
        }
        plain += cell?.value ?? ' ';
    }
    return plain.trimEnd();
};
//# sourceMappingURL=output.js.map