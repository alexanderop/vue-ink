import { defineComponent, h } from 'vue';
import Box from "./Box.js";
const Spacer = defineComponent({
    name: 'Spacer',
    setup() {
        return () => h(Box, { flexGrow: 1 });
    },
});
export default Spacer;
//# sourceMappingURL=Spacer.js.map