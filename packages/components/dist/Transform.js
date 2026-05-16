import { defineComponent, h } from 'vue';
import { useTextHost } from "./text-context.js";
const Transform = defineComponent({
    name: 'Transform',
    props: {
        transform: {
            type: Function,
            required: true,
        },
        accessibilityLabel: {
            type: String,
            default: undefined,
        },
    },
    setup(props, { slots }) {
        const tag = useTextHost();
        return () => {
            const children = (slots.default?.() ?? []);
            if (children.length === 0)
                return null;
            const accessibility = props.accessibilityLabel !== undefined
                ? { label: props.accessibilityLabel }
                : undefined;
            return h(tag, {
                style: { flexGrow: 0, flexShrink: 1, flexDirection: 'row' },
                internal_transform: props.transform,
                internal_accessibility: accessibility,
            }, children);
        };
    },
});
export default Transform;
//# sourceMappingURL=Transform.js.map