import { defineComponent, h, onMounted } from 'vue';
import { Box, Static, Text, render, useApp } from '../../src/index.ts';

// Regression for ink#397: a render that exits synchronously must still
// flush Static items once, not zero times and not twice. The test asserts
// A, B, C appear exactly once each and the error reaches waitUntilExit.
const App = defineComponent({
	setup() {
		const { exit } = useApp();
		onMounted(() => {
			exit(new Error('errored'));
		});
		return () =>
			h(Box, { flexDirection: 'column' }, () => [
				h(
					Static,
					{ items: ['A', 'B', 'C'] },
					{ default: ({ item }: { item: string }) => h(Text, null, () => item) },
				),
				h(Text, null, () => 'Dynamic'),
			]);
	},
});

const app = render(App);
try {
	await app.waitUntilExit();
} catch (error) {
	console.log((error as Error).message);
}
