import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('../vue-loader.mjs', pathToFileURL(`${import.meta.dirname  }/`).href);

const { render } = await import('vue-ink');
const { default: TaskBoardDemo } = await import('./task-board.vue');

const instance = render(TaskBoardDemo);
await instance.waitUntilExit();
