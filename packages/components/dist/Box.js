import { defineComponent, h, inject, provide, shallowRef } from 'vue';
import { BACKGROUND_COLOR_INJECT_KEY } from "./background-context.js";
const sizeKeys = [
    'width',
    'height',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'flexBasis',
    'top',
    'right',
    'bottom',
    'left',
];
const numberKeys = [
    'padding',
    'paddingX',
    'paddingY',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'margin',
    'marginX',
    'marginY',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'flexGrow',
    'flexShrink',
    'gap',
    'columnGap',
    'rowGap',
    'aspectRatio',
];
const stringKeys = [
    'position',
    'flexDirection',
    'flexWrap',
    'alignItems',
    'alignSelf',
    'alignContent',
    'justifyContent',
    'display',
    'overflow',
    'overflowX',
    'overflowY',
    'borderColor',
    'borderTopColor',
    'borderBottomColor',
    'borderLeftColor',
    'borderRightColor',
    'borderBackgroundColor',
    'borderTopBackgroundColor',
    'borderBottomBackgroundColor',
    'borderLeftBackgroundColor',
    'borderRightBackgroundColor',
    'backgroundColor',
];
const booleanKeys = [
    'borderTop',
    'borderBottom',
    'borderLeft',
    'borderRight',
    'borderDimColor',
    'borderTopDimColor',
    'borderBottomDimColor',
    'borderLeftDimColor',
    'borderRightDimColor',
];
const buildProps = () => {
    const props = {};
    for (const key of sizeKeys)
        props[key] = { type: [Number, String] };
    for (const key of numberKeys)
        props[key] = { type: Number };
    for (const key of stringKeys)
        props[key] = { type: String };
    // Vue defaults Boolean props to `false` when unset. The renderer needs to
    // distinguish "user said false" from "user didn't say" (so `borderTop`
    // stays on when only `borderStyle` is set), so we override the default.
    for (const key of booleanKeys)
        props[key] = { type: Boolean, default: undefined };
    props['borderStyle'] = { type: [String, Object] };
    return props;
};
const Box = defineComponent({
    name: 'Box',
    props: {
        ...buildProps(),
        // Declared camelCase so `props.ariaLabel` etc. are typed at the call
        // site. Vue camelizes incoming attr keys before lookup, so users can
        // still write `<Box aria-label="…">` (template) or
        // `h(Box, { 'aria-label': '…' })` (h syntax).
        ariaLabel: { type: String, default: undefined },
        ariaHidden: { type: Boolean, default: undefined },
        ariaRole: {
            type: String,
            default: undefined,
        },
        ariaState: {
            type: Object,
            default: undefined,
        },
    },
    setup(props, { slots, expose }) {
        // Inherit the nearest ancestor's backgroundColor when this Box doesn't
        // set its own — mirrors ink's behaviour where a middle non-bg Box does
        // not break inheritance for descendant Text nodes.
        const parentBackground = inject(BACKGROUND_COLOR_INJECT_KEY, null);
        provide(BACKGROUND_COLOR_INJECT_KEY, () => props.backgroundColor ?? parentBackground?.());
        // Vue assigns a template ref placed on a component to its expose proxy.
        // We forward the underlying `ink-box` DOMElement via `$element` so
        // `useBoxMetrics` (and any future Yoga-aware composable) can reach the
        // node without users having to drop down to the host element type.
        const elementRef = shallowRef(null);
        expose({
            get $element() {
                return elementRef.value;
            },
        });
        // Skip aria keys in the style sweep below — they're applied as
        // accessibility metadata, not Yoga style.
        const ariaKeys = new Set(['ariaLabel', 'ariaHidden', 'ariaRole', 'ariaState']);
        return () => {
            const style = {
                flexWrap: 'nowrap',
                flexDirection: 'row',
                flexGrow: 0,
                flexShrink: 1,
            };
            for (const key of Object.keys(props)) {
                if (ariaKeys.has(key))
                    continue;
                const value = props[key];
                if (value !== undefined) {
                    style[key] = value;
                }
            }
            style['overflowX'] =
                props.overflowX ?? props.overflow ?? 'visible';
            style['overflowY'] =
                props.overflowY ?? props.overflow ?? 'visible';
            const accessibility = props.ariaLabel !== undefined ||
                props.ariaHidden !== undefined ||
                props.ariaRole !== undefined ||
                props.ariaState !== undefined
                ? {
                    label: props.ariaLabel,
                    hidden: props.ariaHidden || undefined,
                    role: props.ariaRole,
                    state: props.ariaState,
                }
                : undefined;
            return h('ink-box', {
                ref: elementRef,
                style,
                internal_accessibility: accessibility,
            }, slots.default?.());
        };
    },
});
export default Box;
//# sourceMappingURL=Box.js.map