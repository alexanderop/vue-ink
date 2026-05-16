import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname}/`).href);

const { render } = await import('vueink');
const { default: TestRunner } = await import('./test-runner.vue');

const instance = render(TestRunner);
await instance.waitUntilExit();
