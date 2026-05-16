import { defineComponent, h, onMounted } from 'vue';
import { Text, render, useApp, useStdin } from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const { exit } = useApp();
		const { setRawMode } = useStdin();
		onMounted(() => {
			setRawMode(true);
			setTimeout(() => exit(new Error('errored')), 500);
		});
		return () => h(Text, null, () => 'Hello World');
	},
});

const app = render(App);
try {
	await app.waitUntilExit();
} catch (error) {
	console.log((error as Error).message);
}
