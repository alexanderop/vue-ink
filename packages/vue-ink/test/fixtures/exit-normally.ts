import { defineComponent, h } from 'vue';
import { Text, render } from '../../src/index.ts';

const App = defineComponent({
	setup: () => () => h(Text, null, () => 'Hello World'),
});

const { waitUntilExit } = render(App);
await waitUntilExit();
console.log('exited');
