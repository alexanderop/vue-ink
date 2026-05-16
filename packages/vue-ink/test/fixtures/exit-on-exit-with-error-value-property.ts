import { defineComponent, h, onMounted } from 'vue';
import { Text, render, useApp } from '../../src/index.ts';

// An Error subclass with an extra `value` property is still treated as an
// error by waitUntilExit (rejects), even if the value is otherwise innocuous.
const App = defineComponent({
	setup() {
		const { exit } = useApp();
		onMounted(() => {
			setTimeout(() => {
				const error = new Error('errored') as Error & { value: string };
				error.value = 'hello from error';
				exit(error);
			}, 500);
		});
		return () => h(Text, null, () => 'Testing');
	},
});

const app = render(App);
try {
	await app.waitUntilExit();
} catch (error) {
	console.log((error as Error).message);
}
