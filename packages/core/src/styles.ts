// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink
// Trimmed to MVP: no positioning yet.
import { type Boxes, type BoxStyle } from 'cli-boxes';
import { type ForegroundColorName } from 'ansi-styles';
import { type LiteralUnion } from 'type-fest';
import Yoga, { type Node as YogaNode } from 'yoga-layout';

/**
 * Canonical color type for vue-ink. Accepts any of chalk's 16 ANSI color
 * names (`'red'`, `'cyan'`, `'gray'`, …) for autocomplete, plus arbitrary
 * strings for hex (`'#ff00aa'`), `rgb()`, or `hsl()` values. Used by every
 * color-bearing prop on `<Box>`, `<Text>`, and `Styles`.
 */
export type Color = LiteralUnion<ForegroundColorName, string>;

export type Styles = {
	/**
	 * Wrap or truncate text when its width exceeds the container. `wrap` (default)
	 * splits text into multiple lines. `hard` fills each line to the full column
	 * width, breaking words as necessary. `truncate-*` keeps a single line and
	 * cuts off the rest.
	 */
	readonly textWrap?:
		| 'wrap'
		| 'hard'
		| 'truncate-end'
		| 'truncate'
		| 'truncate-middle'
		| 'truncate-start';

	/**
	 * Controls how the element is positioned.
	 *
	 * When `position` is `static`, `top`, `right`, `bottom`, and `left` are ignored.
	 */
	readonly position?: 'absolute' | 'relative' | 'static';

	/** Top offset for positioned elements. */
	readonly top?: number | string;

	/** Right offset for positioned elements. */
	readonly right?: number | string;

	/** Bottom offset for positioned elements. */
	readonly bottom?: number | string;

	/** Left offset for positioned elements. */
	readonly left?: number | string;

	/**
	 * Margin on all sides. Equivalent to setting `marginTop`, `marginBottom`,
	 * `marginLeft`, and `marginRight`.
	 */
	readonly margin?: number;

	/** Horizontal margin. Equivalent to setting `marginLeft` and `marginRight`. */
	readonly marginX?: number;

	/** Vertical margin. Equivalent to setting `marginTop` and `marginBottom`. */
	readonly marginY?: number;

	/** Top margin. */
	readonly marginTop?: number;

	/** Bottom margin. */
	readonly marginBottom?: number;

	/** Left margin. */
	readonly marginLeft?: number;

	/** Right margin. */
	readonly marginRight?: number;

	/**
	 * Padding on all sides. Equivalent to setting `paddingTop`, `paddingBottom`,
	 * `paddingLeft`, and `paddingRight`.
	 */
	readonly padding?: number;

	/** Horizontal padding. Equivalent to setting `paddingLeft` and `paddingRight`. */
	readonly paddingX?: number;

	/** Vertical padding. Equivalent to setting `paddingTop` and `paddingBottom`. */
	readonly paddingY?: number;

	/** Top padding. */
	readonly paddingTop?: number;

	/** Bottom padding. */
	readonly paddingBottom?: number;

	/** Left padding. */
	readonly paddingLeft?: number;

	/** Right padding. */
	readonly paddingRight?: number;

	/**
	 * Defines the ability for a flex item to grow if necessary.
	 * See [flex-grow](https://css-tricks.com/almanac/properties/f/flex-grow/).
	 */
	readonly flexGrow?: number;

	/**
	 * Specifies the "flex shrink factor", which determines how much the flex item
	 * will shrink relative to the rest of the flex items in the flex container
	 * when there isn't enough space on the row.
	 * See [flex-shrink](https://css-tricks.com/almanac/properties/f/flex-shrink/).
	 */
	readonly flexShrink?: number;

	/**
	 * Establishes the main axis, defining the direction flex items are placed in
	 * the flex container.
	 * See [flex-direction](https://css-tricks.com/almanac/properties/f/flex-direction/).
	 */
	readonly flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';

	/**
	 * Initial size of the flex item, before any available space is distributed
	 * according to the flex factors.
	 * See [flex-basis](https://css-tricks.com/almanac/properties/f/flex-basis/).
	 */
	readonly flexBasis?: number | string;

	/**
	 * Defines whether flex items are forced onto a single line or can flow into
	 * multiple lines.
	 * See [flex-wrap](https://css-tricks.com/almanac/properties/f/flex-wrap/).
	 */
	readonly flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

	/**
	 * Defines the default behavior for how items are laid out along the cross
	 * axis (perpendicular to the main axis).
	 * See [align-items](https://css-tricks.com/almanac/properties/a/align-items/).
	 */
	readonly alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

	/**
	 * Overrides the `alignItems` value for a single flex item.
	 * See [align-self](https://css-tricks.com/almanac/properties/a/align-self/).
	 */
	readonly alignSelf?: 'flex-start' | 'center' | 'flex-end' | 'auto' | 'stretch' | 'baseline';

	/**
	 * Alignment along the cross axis when there are multiple lines of flex items
	 * (only relevant with `flexWrap`).
	 * See [align-content](https://css-tricks.com/almanac/properties/a/align-content/).
	 */
	readonly alignContent?:
		| 'flex-start'
		| 'flex-end'
		| 'center'
		| 'stretch'
		| 'space-between'
		| 'space-around'
		| 'space-evenly';

	/**
	 * Alignment along the main axis.
	 * See [justify-content](https://css-tricks.com/almanac/properties/j/justify-content/).
	 */
	readonly justifyContent?:
		| 'flex-start'
		| 'flex-end'
		| 'space-between'
		| 'space-around'
		| 'space-evenly'
		| 'center';

	/**
	 * Width of the element in spaces. Also accepts a percentage string, which is
	 * computed relative to the parent's width.
	 */
	readonly width?: number | string;

	/**
	 * Height of the element in lines (rows). Also accepts a percentage string,
	 * which is computed relative to the parent's height.
	 */
	readonly height?: number | string;

	/**
	 * Minimum width of the element.
	 * Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.
	 */
	readonly minWidth?: number | string;

	/**
	 * Minimum height of the element in lines (rows). Also accepts a percentage
	 * string, computed relative to the parent's height.
	 */
	readonly minHeight?: number | string;

	/**
	 * Maximum width of the element.
	 * Percentages aren't supported yet; see https://github.com/facebook/yoga/issues/872.
	 */
	readonly maxWidth?: number | string;

	/**
	 * Maximum height of the element in lines (rows). Also accepts a percentage
	 * string, computed relative to the parent's height.
	 */
	readonly maxHeight?: number | string;

	/**
	 * Aspect ratio (width / height). Use it with at least one size constraint
	 * (`width`, `height`, `minHeight`, or `maxHeight`) so the missing dimension
	 * can be derived.
	 */
	readonly aspectRatio?: number;

	/** Set to `none` to hide the element. */
	readonly display?: 'flex' | 'none';

	/**
	 * Size of the gap between an element's columns and rows. A shorthand for
	 * `columnGap` and `rowGap`.
	 */
	readonly gap?: number;

	/** Size of the gap between an element's columns. */
	readonly columnGap?: number;

	/** Size of the gap between an element's rows. */
	readonly rowGap?: number;

	/**
	 * Behavior for an element's overflow in both directions.
	 *
	 * @default 'visible'
	 */
	readonly overflow?: 'visible' | 'hidden';

	/**
	 * Behavior for an element's overflow in the horizontal direction.
	 *
	 * @default 'visible'
	 */
	readonly overflowX?: 'visible' | 'hidden';

	/**
	 * Behavior for an element's overflow in the vertical direction.
	 *
	 * @default 'visible'
	 */
	readonly overflowY?: 'visible' | 'hidden';

	/**
	 * Add a border with a specified style. If `borderStyle` is `undefined` (the
	 * default), no border will be added.
	 */
	readonly borderStyle?: keyof Boxes | BoxStyle;

	/**
	 * Whether the top border is visible.
	 *
	 * @default true
	 */
	readonly borderTop?: boolean;

	/**
	 * Whether the bottom border is visible.
	 *
	 * @default true
	 */
	readonly borderBottom?: boolean;

	/**
	 * Whether the left border is visible.
	 *
	 * @default true
	 */
	readonly borderLeft?: boolean;

	/**
	 * Whether the right border is visible.
	 *
	 * @default true
	 */
	readonly borderRight?: boolean;

	/**
	 * Change border color. A shorthand for setting `borderTopColor`,
	 * `borderRightColor`, `borderBottomColor`, and `borderLeftColor`.
	 */
	readonly borderColor?: Color;

	/** Change the top border color. Accepts the same values as `color` in `<Text>`. */
	readonly borderTopColor?: Color;

	/** Change the bottom border color. Accepts the same values as `color` in `<Text>`. */
	readonly borderBottomColor?: Color;

	/** Change the left border color. Accepts the same values as `color` in `<Text>`. */
	readonly borderLeftColor?: Color;

	/** Change the right border color. Accepts the same values as `color` in `<Text>`. */
	readonly borderRightColor?: Color;

	/**
	 * Change border background color. A shorthand for setting the per-edge
	 * border-background colors.
	 */
	readonly borderBackgroundColor?: Color;

	/** Top border background color. Accepts the same values as `backgroundColor` in `<Text>`. */
	readonly borderTopBackgroundColor?: Color;

	/** Bottom border background color. Accepts the same values as `backgroundColor` in `<Text>`. */
	readonly borderBottomBackgroundColor?: Color;

	/** Left border background color. Accepts the same values as `backgroundColor` in `<Text>`. */
	readonly borderLeftBackgroundColor?: Color;

	/** Right border background color. Accepts the same values as `backgroundColor` in `<Text>`. */
	readonly borderRightBackgroundColor?: Color;

	/**
	 * Dim the border color. A shorthand for setting all four per-edge
	 * `border*DimColor` flags.
	 *
	 * @default false
	 */
	readonly borderDimColor?: boolean;

	/**
	 * Dim the top border color.
	 *
	 * @default false
	 */
	readonly borderTopDimColor?: boolean;

	/**
	 * Dim the bottom border color.
	 *
	 * @default false
	 */
	readonly borderBottomDimColor?: boolean;

	/**
	 * Dim the left border color.
	 *
	 * @default false
	 */
	readonly borderLeftDimColor?: boolean;

	/**
	 * Dim the right border color.
	 *
	 * @default false
	 */
	readonly borderRightDimColor?: boolean;

	/**
	 * Background color for the element. Accepts the same values as `color` in
	 * the `<Text>` component.
	 */
	readonly backgroundColor?: Color;
};

const POSITION_EDGES = [
	['top', Yoga.EDGE_TOP],
	['right', Yoga.EDGE_RIGHT],
	['bottom', Yoga.EDGE_BOTTOM],
	['left', Yoga.EDGE_LEFT],
] as const;

const applyPositionStyles = (node: YogaNode, style: Styles): void => {
	if ('position' in style) {
		if (style.position === 'absolute') node.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE);
		else if (style.position === 'static') node.setPositionType(Yoga.POSITION_TYPE_STATIC);
		else node.setPositionType(Yoga.POSITION_TYPE_RELATIVE);
	}

	for (const [key, edge] of POSITION_EDGES) {
		if (!(key in style)) continue;
		const value = style[key];
		if (typeof value === 'string') node.setPositionPercent(edge, Number.parseFloat(value));
		else if (typeof value === 'number') node.setPosition(edge, value);
		// `undefined` (key explicitly cleared by the renderer when a prop
		// disappears on rerender) resets the offset so Yoga doesn't leak the
		// previous value across renders.
		else node.setPosition(edge, undefined);
	}
};

const applyMarginStyles = (node: YogaNode, style: Styles): void => {
	if ('margin' in style) node.setMargin(Yoga.EDGE_ALL, style.margin ?? 0);
	if ('marginX' in style) node.setMargin(Yoga.EDGE_HORIZONTAL, style.marginX ?? 0);
	if ('marginY' in style) node.setMargin(Yoga.EDGE_VERTICAL, style.marginY ?? 0);
	if ('marginLeft' in style) node.setMargin(Yoga.EDGE_START, style.marginLeft ?? 0);
	if ('marginRight' in style) node.setMargin(Yoga.EDGE_END, style.marginRight ?? 0);
	if ('marginTop' in style) node.setMargin(Yoga.EDGE_TOP, style.marginTop ?? 0);
	if ('marginBottom' in style) node.setMargin(Yoga.EDGE_BOTTOM, style.marginBottom ?? 0);
};

const applyPaddingStyles = (node: YogaNode, style: Styles): void => {
	if ('padding' in style) node.setPadding(Yoga.EDGE_ALL, style.padding ?? 0);
	if ('paddingX' in style) node.setPadding(Yoga.EDGE_HORIZONTAL, style.paddingX ?? 0);
	if ('paddingY' in style) node.setPadding(Yoga.EDGE_VERTICAL, style.paddingY ?? 0);
	if ('paddingLeft' in style) node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft ?? 0);
	if ('paddingRight' in style) node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight ?? 0);
	if ('paddingTop' in style) node.setPadding(Yoga.EDGE_TOP, style.paddingTop ?? 0);
	if ('paddingBottom' in style) node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom ?? 0);
};

const applyFlexStyles = (node: YogaNode, style: Styles): void => {
	if ('flexGrow' in style) node.setFlexGrow(style.flexGrow ?? 0);
	if ('flexShrink' in style)
		node.setFlexShrink(typeof style.flexShrink === 'number' ? style.flexShrink : 1);

	if ('flexWrap' in style) {
		if (style.flexWrap === 'nowrap') node.setFlexWrap(Yoga.WRAP_NO_WRAP);
		if (style.flexWrap === 'wrap') node.setFlexWrap(Yoga.WRAP_WRAP);
		if (style.flexWrap === 'wrap-reverse') node.setFlexWrap(Yoga.WRAP_WRAP_REVERSE);
	}

	if ('flexDirection' in style) {
		if (style.flexDirection === 'row') node.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
		if (style.flexDirection === 'row-reverse')
			node.setFlexDirection(Yoga.FLEX_DIRECTION_ROW_REVERSE);
		if (style.flexDirection === 'column') node.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN);
		if (style.flexDirection === 'column-reverse')
			node.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN_REVERSE);
	}

	if ('flexBasis' in style) {
		if (typeof style.flexBasis === 'number') node.setFlexBasis(style.flexBasis);
		else if (typeof style.flexBasis === 'string')
			node.setFlexBasisPercent(Number.parseInt(style.flexBasis, 10));
		else node.setFlexBasisAuto();
	}

	if ('alignItems' in style) {
		if (style.alignItems === 'stretch' || !style.alignItems) node.setAlignItems(Yoga.ALIGN_STRETCH);
		if (style.alignItems === 'flex-start') node.setAlignItems(Yoga.ALIGN_FLEX_START);
		if (style.alignItems === 'center') node.setAlignItems(Yoga.ALIGN_CENTER);
		if (style.alignItems === 'flex-end') node.setAlignItems(Yoga.ALIGN_FLEX_END);
		if (style.alignItems === 'baseline') node.setAlignItems(Yoga.ALIGN_BASELINE);
	}

	if ('alignSelf' in style) {
		if (style.alignSelf === 'auto' || !style.alignSelf) node.setAlignSelf(Yoga.ALIGN_AUTO);
		if (style.alignSelf === 'flex-start') node.setAlignSelf(Yoga.ALIGN_FLEX_START);
		if (style.alignSelf === 'center') node.setAlignSelf(Yoga.ALIGN_CENTER);
		if (style.alignSelf === 'flex-end') node.setAlignSelf(Yoga.ALIGN_FLEX_END);
		if (style.alignSelf === 'stretch') node.setAlignSelf(Yoga.ALIGN_STRETCH);
		if (style.alignSelf === 'baseline') node.setAlignSelf(Yoga.ALIGN_BASELINE);
	}

	if ('alignContent' in style) {
		// Default packing matches ink: keep wrapped rows at the cross-axis start
		// so fixed-height boxes don't grow unexpected gaps.
		if (style.alignContent === 'flex-start' || !style.alignContent)
			node.setAlignContent(Yoga.ALIGN_FLEX_START);
		if (style.alignContent === 'center') node.setAlignContent(Yoga.ALIGN_CENTER);
		if (style.alignContent === 'flex-end') node.setAlignContent(Yoga.ALIGN_FLEX_END);
		if (style.alignContent === 'space-between')
			node.setAlignContent(Yoga.ALIGN_SPACE_BETWEEN);
		if (style.alignContent === 'space-around') node.setAlignContent(Yoga.ALIGN_SPACE_AROUND);
		if (style.alignContent === 'space-evenly') node.setAlignContent(Yoga.ALIGN_SPACE_EVENLY);
		if (style.alignContent === 'stretch') node.setAlignContent(Yoga.ALIGN_STRETCH);
	}

	if ('justifyContent' in style) {
		if (style.justifyContent === 'flex-start' || !style.justifyContent)
			node.setJustifyContent(Yoga.JUSTIFY_FLEX_START);
		if (style.justifyContent === 'center') node.setJustifyContent(Yoga.JUSTIFY_CENTER);
		if (style.justifyContent === 'flex-end') node.setJustifyContent(Yoga.JUSTIFY_FLEX_END);
		if (style.justifyContent === 'space-between')
			node.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN);
		if (style.justifyContent === 'space-around') node.setJustifyContent(Yoga.JUSTIFY_SPACE_AROUND);
		if (style.justifyContent === 'space-evenly') node.setJustifyContent(Yoga.JUSTIFY_SPACE_EVENLY);
	}
};

const applyDimensionStyles = (node: YogaNode, style: Styles): void => {
	if ('width' in style) {
		if (typeof style.width === 'number') node.setWidth(style.width);
		else if (typeof style.width === 'string')
			node.setWidthPercent(Number.parseInt(style.width, 10));
		else node.setWidthAuto();
	}

	if ('height' in style) {
		if (typeof style.height === 'number') node.setHeight(style.height);
		else if (typeof style.height === 'string')
			node.setHeightPercent(Number.parseInt(style.height, 10));
		else node.setHeightAuto();
	}

	if ('minWidth' in style) {
		if (typeof style.minWidth === 'string')
			node.setMinWidthPercent(Number.parseInt(style.minWidth, 10));
		else node.setMinWidth(style.minWidth ?? 0);
	}

	if ('minHeight' in style) {
		if (typeof style.minHeight === 'string')
			node.setMinHeightPercent(Number.parseInt(style.minHeight, 10));
		else node.setMinHeight(style.minHeight ?? 0);
	}

	if ('maxWidth' in style) {
		if (typeof style.maxWidth === 'string')
			node.setMaxWidthPercent(Number.parseInt(style.maxWidth, 10));
		else node.setMaxWidth(style.maxWidth);
	}

	if ('maxHeight' in style) {
		if (typeof style.maxHeight === 'string')
			node.setMaxHeightPercent(Number.parseInt(style.maxHeight, 10));
		else node.setMaxHeight(style.maxHeight);
	}

	if ('aspectRatio' in style) {
		// `undefined` resets the constraint so a rerender that drops the prop
		// stops constraining the node.
		node.setAspectRatio(
			typeof style.aspectRatio === 'number' ? style.aspectRatio : Number.NaN,
		);
	}
};

const applyDisplayStyles = (node: YogaNode, style: Styles): void => {
	if ('display' in style) {
		node.setDisplay(style.display === 'flex' ? Yoga.DISPLAY_FLEX : Yoga.DISPLAY_NONE);
	}
};

const applyGapStyles = (node: YogaNode, style: Styles): void => {
	if ('gap' in style) node.setGap(Yoga.GUTTER_ALL, style.gap ?? 0);
	if ('columnGap' in style) node.setGap(Yoga.GUTTER_COLUMN, style.columnGap ?? 0);
	if ('rowGap' in style) node.setGap(Yoga.GUTTER_ROW, style.rowGap ?? 0);
};

const BORDER_EDGES = [
	['borderTop', Yoga.EDGE_TOP],
	['borderBottom', Yoga.EDGE_BOTTOM],
	['borderLeft', Yoga.EDGE_LEFT],
	['borderRight', Yoga.EDGE_RIGHT],
] as const;

const applyBorderStyles = (node: YogaNode, style: Styles): void => {
	if (!('borderStyle' in style) && !BORDER_EDGES.some(([key]) => key in style)) return;

	const borderWidth = style.borderStyle ? 1 : 0;
	for (const [key, edge] of BORDER_EDGES) {
		node.setBorder(edge, style[key] === false ? 0 : borderWidth);
	}
};

const styles = (node: YogaNode, style: Styles = {}): void => {
	applyPositionStyles(node, style);
	applyMarginStyles(node, style);
	applyPaddingStyles(node, style);
	applyFlexStyles(node, style);
	applyDimensionStyles(node, style);
	applyDisplayStyles(node, style);
	applyBorderStyles(node, style);
	applyGapStyles(node, style);
};

export default styles;
