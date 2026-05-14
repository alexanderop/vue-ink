// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
import cliBoxes from 'cli-boxes';
import chalk from 'chalk';
import colorize from './colorize.ts';
import { type DOMElement } from './dom.ts';
import type Output from './output.ts';

type Edge = {
	color: string | undefined;
	bg: string | undefined;
	dim: boolean | undefined;
	show: boolean;
};

const stylePiece = (segment: string, { color, bg, dim }: Edge): string => {
	let styled = colorize(segment, color, 'foreground');
	styled = colorize(styled, bg, 'background');
	if (dim) styled = chalk.dim(styled);
	return styled;
};

const renderBorder = (x: number, y: number, node: DOMElement, output: Output): void => {
	const { style, yogaNode } = node;
	if (!style.borderStyle || !yogaNode) return;

	const width = yogaNode.getComputedWidth();
	const height = yogaNode.getComputedHeight();
	const box = typeof style.borderStyle === 'string' ? cliBoxes[style.borderStyle] : style.borderStyle;

	const resolve = (
		color: string | undefined,
		bg: string | undefined,
		dim: boolean | undefined,
		show: boolean | undefined,
	): Edge => ({
		color: color ?? style.borderColor,
		bg: bg ?? style.borderBackgroundColor,
		dim: dim ?? style.borderDimColor,
		show: show !== false,
	});

	const top = resolve(style.borderTopColor, style.borderTopBackgroundColor, style.borderTopDimColor, style.borderTop);
	const bottom = resolve(style.borderBottomColor, style.borderBottomBackgroundColor, style.borderBottomDimColor, style.borderBottom);
	const left = resolve(style.borderLeftColor, style.borderLeftBackgroundColor, style.borderLeftDimColor, style.borderLeft);
	const right = resolve(style.borderRightColor, style.borderRightBackgroundColor, style.borderRightDimColor, style.borderRight);

	const contentWidth = width - (left.show ? 1 : 0) - (right.show ? 1 : 0);
	const verticalHeight = height - (top.show ? 1 : 0) - (bottom.show ? 1 : 0);

	const horizontalEdge = (edge: Edge, l: string, mid: string, r: string): string =>
		stylePiece(
			(left.show ? l : '') + mid.repeat(contentWidth) + (right.show ? r : ''),
			edge,
		);

	const verticalEdge = (edge: Edge, glyph: string): string =>
		`${stylePiece(glyph, edge)}\n`.repeat(verticalHeight);

	const offsetY = top.show ? 1 : 0;

	if (top.show) output.write(x, y, horizontalEdge(top, box.topLeft, box.top, box.topRight), { transformers: [] });
	if (left.show) output.write(x, y + offsetY, verticalEdge(left, box.left), { transformers: [] });
	if (right.show) output.write(x + width - 1, y + offsetY, verticalEdge(right, box.right), { transformers: [] });
	if (bottom.show)
		output.write(x, y + height - 1, horizontalEdge(bottom, box.bottomLeft, box.bottom, box.bottomRight), {
			transformers: [],
		});
};

export default renderBorder;
