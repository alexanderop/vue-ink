// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import colorize from "./colorize.js";
const renderBackground = (x, y, node, output) => {
    const { style, yogaNode } = node;
    if (!style.backgroundColor || !yogaNode)
        return;
    const inset = (edge) => (style.borderStyle && edge !== false ? 1 : 0);
    const top = inset(style.borderTop);
    const left = inset(style.borderLeft);
    const contentWidth = yogaNode.getComputedWidth() - left - inset(style.borderRight);
    const contentHeight = yogaNode.getComputedHeight() - top - inset(style.borderBottom);
    if (contentWidth <= 0 || contentHeight <= 0)
        return;
    const line = colorize(' '.repeat(contentWidth), style.backgroundColor, 'background');
    const block = contentHeight === 1 ? line : Array(contentHeight).fill(line).join('\n');
    output.write(x + left, y + top, block, { transformers: [] });
};
export default renderBackground;
//# sourceMappingURL=render-background.js.map