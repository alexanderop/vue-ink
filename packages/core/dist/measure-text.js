// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import widestLine from 'widest-line';
const cache = new Map();
const measureText = (text) => {
    if (text.length === 0)
        return { width: 0, height: 0 };
    const cached = cache.get(text);
    if (cached)
        return cached;
    const width = widestLine(text);
    const height = text.split('\n').length;
    const dimensions = { width, height };
    cache.set(text, dimensions);
    return dimensions;
};
export default measureText;
//# sourceMappingURL=measure-text.js.map