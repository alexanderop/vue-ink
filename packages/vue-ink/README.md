# vueink

A Vue 3 port of [Ink](https://github.com/vadimdemedes/ink) — render Vue components to the terminal.

This is the umbrella package most apps should install. It re-exports the components, composables, and `render()` from `@vue-ink/renderer` + `@vue-ink/components`.

## Install

```sh
npm install vueink vue
```

Requires Node.js `>=22` and Vue `>=3.5`.

## Quick start

```ts
import { render, Text } from 'vueink';
import { defineComponent, h } from 'vue';

const App = defineComponent({
	setup: () => () => h(Text, { color: 'green' }, () => 'Hello world'),
});

render(App);
```

## Docs

Full README, parity table, and porting notes live in the [project repo](https://github.com/alexanderop/vue-ink).

## License

MIT — see the [LICENSE](./LICENSE).
