import { defineComponent, h, onMounted } from 'vue';
import { Text, render, useApp } from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const { exit } = useApp();
		onMounted(() => {
			setTimeout(() => exit('hello from vue-ink'), 500);
		});
		return () => h(Text, null, () => 'Testing');
	},
});

const app = render(App);
const result = await app.waitUntilExit();
console.log(`result:${String(result)}`);
