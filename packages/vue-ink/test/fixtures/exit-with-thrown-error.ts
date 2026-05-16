import { defineComponent, h } from 'vue';
import { render } from '../../src/index.ts';

// A render-phase throw becomes a rejected waitUntilExit() — caller is
// responsible for catching, otherwise the process exits with code 1.
const App = defineComponent({
	setup() {
		throw new Error('errored');
		// eslint-disable-next-line no-unreachable
		return () => h('div');
	},
});

const app = render(App);
try {
	await app.waitUntilExit();
} catch (error) {
	console.log((error as Error).message);
}
