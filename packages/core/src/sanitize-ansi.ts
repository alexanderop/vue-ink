// Strip control characters that would desync the terminal cursor while
// preserving SGR escape sequences (colors, bold, etc.). Adapted from ink (MIT)
// — https://github.com/vadimdemedes/ink — without the full tokenizer; the
// state machine below covers the SGR-only case our render path emits.
//
// Preserved:
//   - Printable characters
//   - TAB (\t), LF (\n), and CRLF
//   - SGR sequences: `ESC [ params* intermediates* m`
// Stripped:
//   - Bell (\x07), backspace (\x08), other C0 controls (\x00-\x1F except \t/\n)
//   - DEL (\x7F)
//   - Lone CR not followed by LF
//   - CSI sequences whose final byte is not 'm' (cursor moves, clears, etc.)
//   - Lone ESC and other escape sequence forms (OSC/DCS not in scope yet)
const CSI_PARAM = (code: number) => code >= 0x30 && code <= 0x3f;
const CSI_INTERMEDIATE = (code: number) => code >= 0x20 && code <= 0x2f;
const CSI_FINAL = (code: number) => code >= 0x40 && code <= 0x7e;

// Matches any byte the state machine below would act on: C0 controls except
// \t/\n (range covers \r and ESC too) and DEL. Bails out for clean strings —
// the common case on this hot path (squash-text-nodes runs on every render).
const NEEDS_SANITIZE = /[\x00-\x08\x0B-\x1F\x7F]/;

const sanitizeAnsi = (text: string): string => {
	if (!NEEDS_SANITIZE.test(text)) return text;

	let out = '';

	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i]!;

		if (ch === '\x1B' && text[i + 1] === '[') {
			let j = i + 2;
			while (j < text.length && CSI_PARAM(text.charCodeAt(j))) j += 1;
			while (j < text.length && CSI_INTERMEDIATE(text.charCodeAt(j))) j += 1;
			const finalChar = text[j];
			if (finalChar !== undefined && CSI_FINAL(finalChar.charCodeAt(0))) {
				if (finalChar === 'm') out += text.slice(i, j + 1);
				i = j;
				continue;
			}
			// Malformed CSI — drop the lone ESC and keep parsing.
			continue;
		}

		const code = ch.charCodeAt(0);

		if (ch === '\r') {
			if (text[i + 1] === '\n') {
				out += '\r\n';
				i += 1;
			}
			continue;
		}

		if (code < 0x20 && code !== 0x09 && code !== 0x0a) continue;
		if (code === 0x7f) continue;

		out += ch;
	}

	return out;
};

export default sanitizeAnsi;
