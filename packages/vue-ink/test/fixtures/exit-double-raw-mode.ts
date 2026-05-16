import process from 'node:process';
import { defineComponent, h, onMounted } from 'vue';
import { Text, render, useStdin } from '../../src/index.ts';

// Regression: calling setRawMode(false) followed by setRawMode(true) must
// not detach the data listener — otherwise the subsequent 'q' keystroke
// is dropped and the test times out. Mirrors ink's exit-double-raw-mode.tsx.
const App = defineComponent({
	setup() {
		const { setRawMode } = useStdin();
		onMounted(() => {
			setRawMode(true);
			setTimeout(() => {
				setRawMode(false);
				setRawMode(true);
				// Signal "ready for input" so the driver can write 'q'.
				process.stdout.write('s');
			}, 500);
		});
		return () => h(Text, null, () => 'Hello World');
	},
});

const { unmount, waitUntilExit } = render(App);

process.stdin.on('data', (data) => {
	if (String(data) === 'q') unmount();
});

await waitUntilExit();
console.log('exited');
