import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vue-ink');
const { default: Colors } = await import('./colors.vue');

const instance = render(Colors);
await instance.waitUntilExit();
