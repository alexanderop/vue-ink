import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { Text, render } from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const counter = ref(0);
		let timer: NodeJS.Timeout | undefined;
		onMounted(() => {
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

const instance = render(App);
setTimeout(() => {
	instance.unmount();
}, 500);
await instance.waitUntilExit();
console.log('exited');
