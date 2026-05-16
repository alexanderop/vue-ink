import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vueink');
const { default: TextStyles } = await import('./text-styles.vue');

const instance = render(TextStyles);
await instance.waitUntilExit();
