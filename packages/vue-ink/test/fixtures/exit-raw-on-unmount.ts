import { defineComponent, h, onMounted } from 'vue';
import { Text, render, useStdin } from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const { setRawMode } = useStdin();
		onMounted(() => {
			setRawMode(true);
		});
		return () => h(Text, null, () => 'Hello World');
	},
});

const app = render(App);
setTimeout(() => app.unmount(), 500);
await app.waitUntilExit();
console.log('exited');
