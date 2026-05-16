import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: FocusDemo } = await import('./focus.vue');

const instance = render(FocusDemo);
await instance.waitUntilExit();
