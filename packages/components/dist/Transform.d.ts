import { type PropType } from 'vue';
import { type OutputTransformer } from '@vue-ink/core';
export type TransformProps = {
    transform: OutputTransformer;
    accessibilityLabel?: string;
};
declare const Transform: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    transform: {
        type: PropType<OutputTransformer>;
        required: true;
    };
    accessibilityLabel: {
        type: StringConstructor;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}> | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    transform: {
        type: PropType<OutputTransformer>;
        required: true;
    };
    accessibilityLabel: {
        type: StringConstructor;
        default: undefined;
    };
}>> & Readonly<{}>, {
    accessibilityLabel: string;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default Transform;
//# sourceMappingURL=Transform.d.ts.map