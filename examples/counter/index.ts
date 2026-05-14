import {register} from 'node:module';
import {pathToFileURL} from 'node:url';

register('./vue-loader.mjs', pathToFileURL(import.meta.dirname + '/').href);

const {render} = await import('../../src/index.ts');
const {default: Counter} = await import('./counter.vue');

const instance = render(Counter);
await instance.waitUntilExit();
