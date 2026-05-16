import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: Borders } = await import('./borders.vue');

const instance = render(Borders);
await instance.waitUntilExit();
