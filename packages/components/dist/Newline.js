import { defineComponent, h } from 'vue';
import { useTextHost } from "./text-context.js";
const Newline = defineComponent({
    name: 'Newline',
    props: {
        count: { type: Number, default: 1 },
    },
    setup(props) {
        const tag = useTextHost();
        return () => h(tag, null, '\n'.repeat(props.count));
    },
});
export default Newline;
//# sourceMappingURL=Newline.js.map