import chalk from 'chalk';
import type { LiteralUnion } from 'type-fest';
import { colorize, type ForegroundColorName } from '@vue-ink/core';

export type TextStyleFlags = {
	color?: LiteralUnion<ForegroundColorName, string> | undefined;
	backgroundColor?: LiteralUnion<ForegroundColorName, string> | undefined;
	dimColor?: boolean;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	inverse?: boolean;
};

/**
 * Apply chalk + colorize wrappers to `text` in the same order React Ink does.
 * Pure — safe to share across calls and to call inside a Vue `computed`. The
 * caller passes the resolved background color (own prop `?? inherited`) so
 * this stays free of injection concerns.
 */
export const applyTextStyles = (text: string, flags: TextStyleFlags): string => {
	let out = text;
	if (flags.dimColor) out = chalk.dim(out);
	if (flags.color) out = colorize(out, flags.color, 'foreground');
	if (flags.backgroundColor) out = colorize(out, flags.backgroundColor, 'background');
	if (flags.bold) out = chalk.bold(out);
	if (flags.italic) out = chalk.italic(out);
	if (flags.underline) out = chalk.underline(out);
	if (flags.strikethrough) out = chalk.strikethrough(out);
	if (flags.inverse) out = chalk.inverse(out);
	return out;
};
