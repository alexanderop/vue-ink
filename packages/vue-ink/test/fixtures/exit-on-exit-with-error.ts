import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { Text, render, useApp } from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const counter = ref(0);
		const { exit } = useApp();
		let timer: NodeJS.Timeout | undefined;
		onMounted(() => {
			setTimeout(() => exit(new Error('errored')), 500);
			timer = setInterval(() => {
				counter.value += 1;
			}, 100);
		});
		onUnmounted(() => {
			if (timer) clearInterval(timer);
		});
		return () => h(Text, null, () => `Counter: ${counter.value}`);
	},
});

const app = render(App);
try {
	await app.waitUntilExit();
} catch (error) {
	console.log((error as Error).message);
}
