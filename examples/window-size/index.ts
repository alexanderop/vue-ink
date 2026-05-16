import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: WindowSizeDemo } = await import('./window-size.vue');

const instance = render(WindowSizeDemo);
await instance.waitUntilExit();
