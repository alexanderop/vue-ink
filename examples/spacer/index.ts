import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: SpacerDemo } = await import('./spacer.vue');

const instance = render(SpacerDemo);
await instance.waitUntilExit();
