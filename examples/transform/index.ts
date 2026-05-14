import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vue-ink');
const { default: TransformDemo } = await import('./transform.vue');

const instance = render(TransformDemo);
await instance.waitUntilExit();
