import { type PropType } from 'vue';
import { type Styles } from '@vue-ink/core';
export type TextProps = {
    color?: string;
    backgroundColor?: string;
    dimColor?: boolean;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    inverse?: boolean;
    wrap?: Styles['textWrap'];
    'aria-label'?: string;
    'aria-hidden'?: boolean;
};
declare const Text: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    color: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    backgroundColor: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    dimColor: {
        type: BooleanConstructor;
        default: boolean;
    };
    bold: {
        type: BooleanConstructor;
        default: boolean;
    };
    italic: {
        type: BooleanConstructor;
        default: boolean;
    };
    underline: {
        type: BooleanConstructor;
        default: boolean;
    };
    strikethrough: {
        type: BooleanConstructor;
        default: boolean;
    };
    inverse: {
        type: BooleanConstructor;
        default: boolean;
    };
    wrap: {
        type: PropType<Styles["textWrap"]>;
        default: string;
    };
    ariaLabel: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    ariaHidden: {
        type: BooleanConstructor;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    color: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    backgroundColor: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    dimColor: {
        type: BooleanConstructor;
        default: boolean;
    };
    bold: {
        type: BooleanConstructor;
        default: boolean;
    };
    italic: {
        type: BooleanConstructor;
        default: boolean;
    };
    underline: {
        type: BooleanConstructor;
        default: boolean;
    };
    strikethrough: {
        type: BooleanConstructor;
        default: boolean;
    };
    inverse: {
        type: BooleanConstructor;
        default: boolean;
    };
    wrap: {
        type: PropType<Styles["textWrap"]>;
        default: string;
    };
    ariaLabel: {
        type: PropType<string | undefined>;
        default: undefined;
    };
    ariaHidden: {
        type: BooleanConstructor;
        default: undefined;
    };
}>> & Readonly<{}>, {
    wrap: "wrap" | "hard" | "truncate-end" | "truncate" | "truncate-middle" | "truncate-start" | undefined;
    bold: boolean;
    color: string | undefined;
    backgroundColor: string | undefined;
    ariaLabel: string | undefined;
    ariaHidden: boolean;
    dimColor: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    inverse: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default Text;
//# sourceMappingURL=Text.d.ts.map