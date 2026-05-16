import { computed, defineComponent, h, inject } from 'vue';
import chalk from 'chalk';
import { colorize } from '@vue-ink/core';
import { BACKGROUND_COLOR_INJECT_KEY } from "./background-context.js";
import { useTextHost } from "./text-context.js";
const Text = defineComponent({
    name: 'Text',
    props: {
        color: { type: String, default: undefined },
        backgroundColor: {
            type: String,
            default: undefined,
        },
        dimColor: { type: Boolean, default: false },
        bold: { type: Boolean, default: false },
        italic: { type: Boolean, default: false },
        underline: { type: Boolean, default: false },
        strikethrough: { type: Boolean, default: false },
        inverse: { type: Boolean, default: false },
        wrap: {
            type: String,
            default: 'wrap',
        },
        // Declared camelCase so `props.ariaLabel` is typed at the call site.
        // Vue camelizes incoming attr keys before lookup, so users can still
        // write `<Text aria-label="…">` (template) or `h(Text, { 'aria-label':
        // '…' })` (h syntax) — both resolve to this key at runtime.
        ariaLabel: { type: String, default: undefined },
        ariaHidden: { type: Boolean, default: undefined },
    },
    setup(props, { slots }) {
        // A <Box backgroundColor> ancestor provides this getter; the Text's own
        // `backgroundColor` prop takes precedence.
        const inheritedBackground = inject(BACKGROUND_COLOR_INJECT_KEY, null);
        const tag = useTextHost();
        // Rebuild the chalk pipeline only when a relevant style flag changes —
        // this keeps `internal_transform`'s identity stable across renders, so
        // patchProp's identity short-circuit avoids redundant work.
        const transform = computed(() => {
            const { color, backgroundColor, dimColor, bold, italic, underline, strikethrough, inverse } = props;
            const bg = backgroundColor ?? inheritedBackground?.();
            return (text) => {
                let out = text;
                if (dimColor)
                    out = chalk.dim(out);
                if (color)
                    out = colorize(out, color, 'foreground');
                if (bg)
                    out = colorize(out, bg, 'background');
                if (bold)
                    out = chalk.bold(out);
                if (italic)
                    out = chalk.italic(out);
                if (underline)
                    out = chalk.underline(out);
                if (strikethrough)
                    out = chalk.strikethrough(out);
                if (inverse)
                    out = chalk.inverse(out);
                return out;
            };
        });
        return () => {
            const children = (slots.default?.() ?? []);
            const accessibility = props.ariaLabel !== undefined || props.ariaHidden !== undefined
                ? {
                    label: props.ariaLabel,
                    hidden: props.ariaHidden || undefined,
                }
                : undefined;
            return h(tag, {
                style: {
                    flexGrow: 0,
                    flexShrink: 1,
                    flexDirection: 'row',
                    textWrap: props.wrap,
                },
                internal_transform: transform.value,
                internal_accessibility: accessibility,
            }, children);
        };
    },
});
export default Text;
//# sourceMappingURL=Text.js.map