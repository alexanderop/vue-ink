import { defineComponent, h, onMounted } from 'vue';
import { Text, render, useApp } from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const { exit } = useApp();
		onMounted(() => {
			setTimeout(() => exit({ message: 'hello from vue-ink object' }), 500);
		});
		return () => h(Text, null, () => 'Testing');
	},
});

const app = render(App);
const result = (await app.waitUntilExit()) as { message: string };
console.log(`result:${result.message}`);
