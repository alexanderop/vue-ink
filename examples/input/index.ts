import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: InputDemo } = await import('./input.vue');

const instance = render(InputDemo);
await instance.waitUntilExit();
