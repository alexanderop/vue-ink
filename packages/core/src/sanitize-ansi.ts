// Strip ANSI escape sequences that would conflict with Ink's layout.
// Preserved: SGR sequences (colors, bold, etc. — final byte 'm') and
// OSC control strings (hyperlinks, etc.).
// Stripped: cursor movement, screen clearing, DCS/PM/APC/SOS, lone ESC,
// C0/C1 controls (except TAB, LF, and CRLF pairs).
//
// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink — uses the
// shared `tokenizeAnsi` so behaviour stays aligned with the canonical parser.
// Diverges from ink in one place: ink leaves the text token's bytes intact,
// while vue-ink also strips C0 controls (lone CR, BEL, backspace, DEL) inside
// text tokens so a literal `'a\x07b'` collapses to `'ab'`. This matches the
// historical vue-ink sanitizer behaviour the renderer relied on.
import { hasAnsiControlCharacters, tokenizeAnsi } from './ansi-tokenizer.ts';

const sgrParametersRegex = /^[\d:;]*$/;

// Matches every C0 control we want to strip inside a text token (everything
// below 0x20 except TAB/LF, plus DEL). Used as a fast-path bail when the
// string is genuinely clean.
const NEEDS_SANITIZE = /[\x00-\x08\x0B-\x1F\x7F]/;

const stripC0FromText = (text: string): string => {
	if (!NEEDS_SANITIZE.test(text)) return text;

	let out = '';

	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i]!;
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

const sanitizeAnsi = (text: string): string => {
	if (!hasAnsiControlCharacters(text)) {
		return stripC0FromText(text);
	}

	let output = '';

	for (const token of tokenizeAnsi(text)) {
		if (token.type === 'osc') {
			output += token.value;
			continue;
		}

		if (token.type === 'text') {
			output += stripC0FromText(token.value);
			continue;
		}

		if (
			token.type === 'csi' &&
			token.finalCharacter === 'm' &&
			token.intermediateString === '' &&
			sgrParametersRegex.test(token.parameterString)
		) {
			output += token.value;
		}
	}

	return output;
};

export default sanitizeAnsi;
