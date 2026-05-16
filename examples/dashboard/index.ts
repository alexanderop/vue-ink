import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname}/`).href);

const { render } = await import('vueink');
const { default: Dashboard } = await import('./dashboard.vue');

const instance = render(Dashboard);
await instance.waitUntilExit();
