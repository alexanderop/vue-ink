// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import wrapAnsi from 'wrap-ansi';
import cliTruncate from 'cli-truncate';
const cache = {};
const wrapText = (text, maxWidth, wrapType) => {
    const cacheKey = text + String(maxWidth) + String(wrapType);
    const cached = cache[cacheKey];
    if (cached)
        return cached;
    let wrappedText = text;
    if (wrapType === 'wrap') {
        wrappedText = wrapAnsi(text, maxWidth, { trim: false, hard: true });
    }
    if (wrapType === 'hard') {
        wrappedText = wrapAnsi(text, maxWidth, {
            trim: false,
            hard: true,
            wordWrap: false,
        });
    }
    if (wrapType?.startsWith('truncate')) {
        let position = 'end';
        if (wrapType === 'truncate-middle')
            position = 'middle';
        if (wrapType === 'truncate-start')
            position = 'start';
        wrappedText = cliTruncate(text, maxWidth, { position });
    }
    cache[cacheKey] = wrappedText;
    return wrappedText;
};
export default wrapText;
//# sourceMappingURL=wrap-text.js.map