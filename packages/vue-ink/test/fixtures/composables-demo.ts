// Fixture driven by composables-e2e.test.ts via node-pty. Exercises useStdout,
// useStderr, useWindowSize, useApp and useInput together in a real TTY.
//
// Lifecycle:
//   - on mount: write "boot" to stdout above the live frame.
//   - frame: "cols=<columns> rows=<rows> tick=<n>" — tick increments via setInterval.
//   - on resize (driven by pty.resize from the test), useWindowSize fires a
//     watcher that writes "resized:<cols>x<rows>" to stderr.
//   - 'q' on stdin → useApp().exit().
import { defineComponent, h, onMounted, ref, watch } from 'vue';
import {
	render,
	Text,
	useApp,
	useInput,
	useStderr,
	useStdout,
	useWindowSize,
} from '../../src/index.ts';

const App = defineComponent({
	setup() {
		const { write: writeStdout } = useStdout();
		const { write: writeStderr } = useStderr();
		const size = useWindowSize();
		const { exit } = useApp();

		onMounted(() => {
			writeStdout('boot\n');
		});

		useInput((input) => {
			if (input === 'q') exit();
		});

		const firstSize = `${size.value.columns}x${size.value.rows}`;
		watch(
			() => `${size.value.columns}x${size.value.rows}`,
			(next) => {
				if (next !== firstSize) writeStderr(`resized:${next}\n`);
			},
		);

		const tick = ref(0);
		const timer = setInterval(() => {
			tick.value += 1;
		}, 200);
		// Don't keep the event loop alive after unmount — without unref(), the
		// interval would block node from exiting even though the renderer is torn down.
		timer.unref();

		return () =>
			h(Text, null, () => `cols=${size.value.columns} rows=${size.value.rows} tick=${tick.value}`);
	},
});

const instance = render(App);
await instance.waitUntilExit();
