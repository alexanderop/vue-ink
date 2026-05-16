import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue';
import { Text, render } from '../../src/index.ts';

// Fixture that increments a counter five times then stops scheduling new
// timers. The render() instance has no waitUntilExit() awaiter, so the
// renderer's keep-alive mechanism must release once the event loop has no
// more work to do — otherwise the process hangs.
const App = defineComponent({
	setup() {
		const counter = ref(0);
		let timer: NodeJS.Timeout | undefined;
		onMounted(() => {
			const onTimeout = (): void => {
				if (counter.value > 4) return;
				counter.value += 1;
				timer = setTimeout(onTimeout, 20);
			};
			timer = setTimeout(onTimeout, 20);
		});
		onUnmounted(() => {
			if (timer) clearTimeout(timer);
		});
		return () => h(Text, null, () => `Counter: ${counter.value}`);
	},
});

render(App);
