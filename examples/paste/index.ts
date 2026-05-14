import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vue-ink');
const { default: PasteDemo } = await import('./paste.vue');

const instance = render(PasteDemo);
await instance.waitUntilExit();
