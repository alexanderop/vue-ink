import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname}/`).href);

const { render } = await import('vueink');
const { default: Snake } = await import('./snake.vue');

const instance = render(Snake);
await instance.waitUntilExit();
