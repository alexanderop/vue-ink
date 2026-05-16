import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: FlexLayout } = await import('./flex-layout.vue');

const instance = render(FlexLayout);
await instance.waitUntilExit();
