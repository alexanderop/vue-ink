import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname}/`).href);

const { render } = await import('vueink');
const { default: Chat } = await import('./chat.vue');

const instance = render(Chat);
await instance.waitUntilExit();
