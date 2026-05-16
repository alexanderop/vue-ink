// Kitty keyboard protocol flags.
// @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/
export const kittyFlags = {
    disambiguateEscapeCodes: 1,
    reportEventTypes: 2,
    reportAlternateKeys: 4,
    reportAllKeysAsEscapeCodes: 8,
    reportAssociatedText: 16,
};
export const resolveKittyFlags = (flags) => {
    let result = 0;
    for (const flag of flags) {
        result |= kittyFlags[flag];
    }
    return result;
};
// Push/pop the kitty progressive enhancement stack. Non-kitty terminals
// silently ignore both escapes, so writing them unconditionally is safe.
export const enableKittyKeyboard = (flags) => `\x1b[>${resolveKittyFlags(flags)}u`;
export const disableKittyKeyboard = () => '\x1b[<u';
// Kitty modifier bits in the modifier parameter of CSI u sequences.
// Note: the wire value is (modifiers - 1) — caller is expected to subtract 1.
export const kittyModifiers = {
    shift: 1,
    alt: 2,
    ctrl: 4,
    super: 8,
    hyper: 16,
    meta: 32,
    capsLock: 64,
    numLock: 128,
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
const isDigit = (byte) => byte >= ZERO_BYTE && byte <= NINE_BYTE;
const matchResponse = (buffer, startIndex) => {
    if (buffer[startIndex] !== ESC_BYTE ||
        buffer[startIndex + 1] !== OPEN_BRACKET_BYTE ||
        buffer[startIndex + 2] !== QUESTION_MARK_BYTE) {
        return undefined;
    }
    let index = startIndex + 3;
    const digitsStart = index;
    while (index < buffer.length && isDigit(buffer[index]))
        index += 1;
    if (index === digitsStart)
        return undefined;
    if (index === buffer.length)
        return { state: 'partial' };
    if (buffer[index] === LETTER_U_BYTE)
        return { state: 'complete', endIndex: index };
    return undefined;
};
export const hasCompleteKittyQueryResponse = (buffer) => {
    for (let i = 0; i < buffer.length; i += 1) {
        const match = matchResponse(buffer, i);
        if (match?.state === 'complete')
            return true;
    }
    return false;
};
// Re-emit any buffered data the user typed during detection so it isn't
// lost — strip only the protocol response bytes and any trailing partial
// match (which may still complete on the next chunk).
export const stripKittyQueryResponses = (buffer) => {
    const kept = [];
    let i = 0;
    while (i < buffer.length) {
        const match = matchResponse(buffer, i);
        if (match?.state === 'complete') {
            i = match.endIndex + 1;
            continue;
        }
        if (match?.state === 'partial')
            break;
        kept.push(buffer[i]);
        i += 1;
    }
    return kept;
};
// Query the terminal for kitty keyboard protocol support. Unsupporting
// terminals simply won't respond — the timeout handles that.
export const kittyQueryEscape = '\x1b[?u';
//# sourceMappingURL=kitty-keyboard.js.map