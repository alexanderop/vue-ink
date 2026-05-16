import { type PropType } from 'vue';
import { type AccessibilityRole, type AccessibilityState, type Styles } from '@vue-ink/core';
import { type Boxes, type BoxStyle } from 'cli-boxes';
export type BoxProps = Omit<Styles, 'textWrap'> & {
    /** Label announced to screen readers in place of the Box's children. */
    'aria-label'?: string;
    /** Hide the Box (and its subtree) from screen-reader output. */
    'aria-hidden'?: boolean;
    /** Role announced to screen readers. */
    'aria-role'?: AccessibilityRole;
    /** State flags announced as `(checked, busy)` prefixes. */
    'aria-state'?: AccessibilityState;
};
declare const Box: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    ariaLabel: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    ariaHidden: {
        type: BooleanConstructor;
        default: undefined;
    };
    ariaRole: {
        type: PropType<AccessibilityRole | undefined>;
        default: undefined;
    };
    ariaState: {
        type: PropType<AccessibilityState | undefined>;
        default: undefined;
    };
    top: {
        type: PropType<number | string>;
    };
    right: {
        type: PropType<number | string>;
    };
    bottom: {
        type: PropType<number | string>;
    };
    left: {
        type: PropType<number | string>;
    };
    flexBasis: {
        type: PropType<number | string>;
    };
    width: {
        type: PropType<number | string>;
    };
    height: {
        type: PropType<number | string>;
    };
    minWidth: {
        type: PropType<number | string>;
    };
    minHeight: {
        type: PropType<number | string>;
    };
    maxWidth: {
        type: PropType<number | string>;
    };
    maxHeight: {
        type: PropType<number | string>;
    };
    margin: {
        type: PropType<number>;
    };
    marginX: {
        type: PropType<number>;
    };
    marginY: {
        type: PropType<number>;
    };
    marginLeft: {
        type: PropType<number>;
    };
    marginRight: {
        type: PropType<number>;
    };
    marginTop: {
        type: PropType<number>;
    };
    marginBottom: {
        type: PropType<number>;
    };
    padding: {
        type: PropType<number>;
    };
    paddingX: {
        type: PropType<number>;
    };
    paddingY: {
        type: PropType<number>;
    };
    paddingLeft: {
        type: PropType<number>;
    };
    paddingRight: {
        type: PropType<number>;
    };
    paddingTop: {
        type: PropType<number>;
    };
    paddingBottom: {
        type: PropType<number>;
    };
    flexGrow: {
        type: PropType<number>;
    };
    flexShrink: {
        type: PropType<number>;
    };
    aspectRatio: {
        type: PropType<number>;
    };
    gap: {
        type: PropType<number>;
    };
    columnGap: {
        type: PropType<number>;
    };
    rowGap: {
        type: PropType<number>;
    };
    position: {
        type: PropType<"absolute" | "relative" | "static" | undefined>;
    };
    flexWrap: {
        type: PropType<"wrap" | "nowrap" | "wrap-reverse" | undefined>;
    };
    flexDirection: {
        type: PropType<"row" | "column" | "row-reverse" | "column-reverse" | undefined>;
    };
    alignItems: {
        type: PropType<"flex-start" | "center" | "flex-end" | "stretch" | "baseline" | undefined>;
    };
    alignSelf: {
        type: PropType<"flex-start" | "center" | "flex-end" | "stretch" | "baseline" | "auto" | undefined>;
    };
    alignContent: {
        type: PropType<"flex-start" | "center" | "flex-end" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined>;
    };
    justifyContent: {
        type: PropType<"flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly" | undefined>;
    };
    display: {
        type: PropType<"flex" | "none" | undefined>;
    };
    overflow: {
        type: PropType<"visible" | "hidden" | undefined>;
    };
    overflowX: {
        type: PropType<"visible" | "hidden" | undefined>;
    };
    overflowY: {
        type: PropType<"visible" | "hidden" | undefined>;
    };
    borderColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderTopColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderBottomColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderLeftColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderRightColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderTopBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderBottomBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderLeftBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderRightBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    backgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderTop: {
        type: PropType<boolean>;
    };
    borderBottom: {
        type: PropType<boolean>;
    };
    borderLeft: {
        type: PropType<boolean>;
    };
    borderRight: {
        type: PropType<boolean>;
    };
    borderDimColor: {
        type: PropType<boolean>;
    };
    borderTopDimColor: {
        type: PropType<boolean>;
    };
    borderBottomDimColor: {
        type: PropType<boolean>;
    };
    borderLeftDimColor: {
        type: PropType<boolean>;
    };
    borderRightDimColor: {
        type: PropType<boolean>;
    };
    borderStyle: {
        type: PropType<keyof Boxes | BoxStyle>;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    ariaLabel: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    ariaHidden: {
        type: BooleanConstructor;
        default: undefined;
    };
    ariaRole: {
        type: PropType<AccessibilityRole | undefined>;
        default: undefined;
    };
    ariaState: {
        type: PropType<AccessibilityState | undefined>;
        default: undefined;
    };
    top: {
        type: PropType<number | string>;
    };
    right: {
        type: PropType<number | string>;
    };
    bottom: {
        type: PropType<number | string>;
    };
    left: {
        type: PropType<number | string>;
    };
    flexBasis: {
        type: PropType<number | string>;
    };
    width: {
        type: PropType<number | string>;
    };
    height: {
        type: PropType<number | string>;
    };
    minWidth: {
        type: PropType<number | string>;
    };
    minHeight: {
        type: PropType<number | string>;
    };
    maxWidth: {
        type: PropType<number | string>;
    };
    maxHeight: {
        type: PropType<number | string>;
    };
    margin: {
        type: PropType<number>;
    };
    marginX: {
        type: PropType<number>;
    };
    marginY: {
        type: PropType<number>;
    };
    marginLeft: {
        type: PropType<number>;
    };
    marginRight: {
        type: PropType<number>;
    };
    marginTop: {
        type: PropType<number>;
    };
    marginBottom: {
        type: PropType<number>;
    };
    padding: {
        type: PropType<number>;
    };
    paddingX: {
        type: PropType<number>;
    };
    paddingY: {
        type: PropType<number>;
    };
    paddingLeft: {
        type: PropType<number>;
    };
    paddingRight: {
        type: PropType<number>;
    };
    paddingTop: {
        type: PropType<number>;
    };
    paddingBottom: {
        type: PropType<number>;
    };
    flexGrow: {
        type: PropType<number>;
    };
    flexShrink: {
        type: PropType<number>;
    };
    aspectRatio: {
        type: PropType<number>;
    };
    gap: {
        type: PropType<number>;
    };
    columnGap: {
        type: PropType<number>;
    };
    rowGap: {
        type: PropType<number>;
    };
    position: {
        type: PropType<"absolute" | "relative" | "static" | undefined>;
    };
    flexWrap: {
        type: PropType<"wrap" | "nowrap" | "wrap-reverse" | undefined>;
    };
    flexDirection: {
        type: PropType<"row" | "column" | "row-reverse" | "column-reverse" | undefined>;
    };
    alignItems: {
        type: PropType<"flex-start" | "center" | "flex-end" | "stretch" | "baseline" | undefined>;
    };
    alignSelf: {
        type: PropType<"flex-start" | "center" | "flex-end" | "stretch" | "baseline" | "auto" | undefined>;
    };
    alignContent: {
        type: PropType<"flex-start" | "center" | "flex-end" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined>;
    };
    justifyContent: {
        type: PropType<"flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly" | undefined>;
    };
    display: {
        type: PropType<"flex" | "none" | undefined>;
    };
    overflow: {
        type: PropType<"visible" | "hidden" | undefined>;
    };
    overflowX: {
        type: PropType<"visible" | "hidden" | undefined>;
    };
    overflowY: {
        type: PropType<"visible" | "hidden" | undefined>;
    };
    borderColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderTopColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderBottomColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderLeftColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderRightColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderTopBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderBottomBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderLeftBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderRightBackgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    backgroundColor: {
        type: PropType<import("type-fest").LiteralUnion<keyof import("ansi-styles").ForegroundColor, string> | undefined>;
    };
    borderTop: {
        type: PropType<boolean>;
    };
    borderBottom: {
        type: PropType<boolean>;
    };
    borderLeft: {
        type: PropType<boolean>;
    };
    borderRight: {
        type: PropType<boolean>;
    };
    borderDimColor: {
        type: PropType<boolean>;
    };
    borderTopDimColor: {
        type: PropType<boolean>;
    };
    borderBottomDimColor: {
        type: PropType<boolean>;
    };
    borderLeftDimColor: {
        type: PropType<boolean>;
    };
    borderRightDimColor: {
        type: PropType<boolean>;
    };
    borderStyle: {
        type: PropType<keyof Boxes | BoxStyle>;
    };
}>> & Readonly<{}>, {
    ariaLabel: string | undefined;
    ariaHidden: boolean;
    ariaRole: AccessibilityRole | undefined;
    ariaState: AccessibilityState | undefined;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default Box;
//# sourceMappingURL=Box.d.ts.map