import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: KittyKeysDemo } = await import('./kitty-keys.vue');

const instance = render(KittyKeysDemo);
await instance.waitUntilExit();
