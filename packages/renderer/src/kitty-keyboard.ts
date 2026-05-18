/**
 * Bitmask values for the Kitty progressive keyboard enhancement protocol.
 * Combine the flag names you care about (most apps want just
 * `disambiguateEscapeCodes`) and the runtime ORs them into the wire value.
 *
 * @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
 */
export const kittyFlags = {
	disambiguateEscapeCodes: 1,
	reportEventTypes: 2,
	reportAlternateKeys: 4,
	reportAllKeysAsEscapeCodes: 8,
	reportAssociatedText: 16,
} as const;

/** A single Kitty keyboard protocol flag name — the keys of {@link kittyFlags}. */
export type KittyFlagName = keyof typeof kittyFlags;

export const resolveKittyFlags = (flags: KittyFlagName[]): number => {
	let result = 0;
	for (const flag of flags) {
		result |= kittyFlags[flag];
	}
	return result;
};

// Push/pop the kitty progressive enhancement stack. Non-kitty terminals
// silently ignore both escapes, so writing them unconditionally is safe.
export const enableKittyKeyboard = (flags: KittyFlagName[]): string =>
	`\x1b[>${resolveKittyFlags(flags)}u`;
export const disableKittyKeyboard = (): string => '\x1b[<u';

/**
 * Modifier bits used in the modifier parameter of CSI `u` sequences. Useful
 * if you parse Kitty CSI sequences directly; vue-ink's normalized
 * {@link Key} record exposes the same bits as named booleans.
 *
 * Note: the wire value is `modifiers - 1` — callers are expected to subtract
 * one before sending or comparing against terminal output.
 */
export const kittyModifiers = {
	shift: 1,
	alt: 2,
	ctrl: 4,
	super: 8,
	hyper: 16,
	meta: 32,
	capsLock: 64,
	numLock: 128,
} as const;

/**
 * Options for the Kitty keyboard protocol negotiation in {@link RenderOptions.kittyKeyboard}.
 */
export type KittyKeyboardOptions = {
	/**
	 * - `auto` (default): probe the terminal at startup and enable only if
	 *   the response indicates support.
	 * - `enabled`: force-enable without probing. Useful if you know the
	 *   terminal supports it and want to skip the startup query.
	 * - `disabled`: never enable. Stays on the legacy keypress pipeline.
	 */
	mode?: 'auto' | 'enabled' | 'disabled';
	/**
	 * Protocol flags to request from the terminal. Defaults to
	 * `['disambiguateEscapeCodes']` — the minimum useful upgrade over the
	 * legacy pipeline.
	 */
	flags?: KittyFlagName[];
};

// CSI ? <digits> u — the response a kitty-capable terminal sends to a
// `CSI ? u` query. We parse manually instead of via `parseKeypress` because
// detection runs before the normal input pipeline is wired up.
const ESC_BYTE = 0x1b;
const OPEN_BRACKET_BYTE = 0x5b;
const QUESTION_MARK_BYTE = 0x3f;
const LETTER_U_BYTE = 0x75;
const ZERO_BYTE = 0x30;
const NINE_BYTE = 0x39;

type ResponseMatch =
	| { state: 'complete'; endIndex: number }
	| { state: 'partial' };

const isDigit = (byte: number): boolean =>
	byte >= ZERO_BYTE && byte <= NINE_BYTE;

const matchResponse = (
	buffer: number[],
	startIndex: number,
): ResponseMatch | undefined => {
	if (
		buffer[startIndex] !== ESC_BYTE ||
		buffer[startIndex + 1] !== OPEN_BRACKET_BYTE ||
		buffer[startIndex + 2] !== QUESTION_MARK_BYTE
	) {
		return undefined;
	}
	let index = startIndex + 3;
	const digitsStart = index;
	while (index < buffer.length && isDigit(buffer[index]!)) index += 1;
	if (index === digitsStart) return undefined;
	if (index === buffer.length) return { state: 'partial' };
	if (buffer[index] === LETTER_U_BYTE) return { state: 'complete', endIndex: index };
	return undefined;
};

export const hasCompleteKittyQueryResponse = (buffer: number[]): boolean => {
	for (let i = 0; i < buffer.length; i += 1) {
		const match = matchResponse(buffer, i);
		if (match?.state === 'complete') return true;
	}
	return false;
};

// Re-emit any buffered data the user typed during detection so it isn't
// lost — strip only the protocol response bytes and any trailing partial
// match (which may still complete on the next chunk).
export const stripKittyQueryResponses = (buffer: number[]): number[] => {
	const kept: number[] = [];
	let i = 0;
	while (i < buffer.length) {
		const match = matchResponse(buffer, i);
		if (match?.state === 'complete') {
			i = match.endIndex + 1;
			continue;
		}
		if (match?.state === 'partial') break;
		kept.push(buffer[i]!);
		i += 1;
	}
	return kept;
};

// Query the terminal for kitty keyboard protocol support. Unsupporting
// terminals simply won't respond — the timeout handles that.
export const kittyQueryEscape = '\x1b[?u';
