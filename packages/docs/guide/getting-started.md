# Getting Started

vue-ink is a Vue 3 port of [Ink](https://github.com/vadimdemedes/ink) — render Vue components to the terminal.

Use Vue's reactivity, components, and SFCs to build interactive command-line apps. Layout is handled by [Yoga](https://www.yogalayout.dev/) (the same flexbox engine Ink uses), so `<Box>` and `<Text>` behave the way you'd expect coming from Ink or React Native.

> Status: early / experimental (`0.0.1`). API mirrors a subset of Ink.

## Requirements

- Node.js `>=22`

## Install

```sh
npm install vueink vue
```

```sh
pnpm add vueink vue
```

```sh
yarn add vueink vue
```

> The package is published as `vueink` on npm (the `vue-ink` name was taken). The project is still called vue-ink everywhere else.

## Hello world

```ts
import { render, Text } from 'vueink'
import { defineComponent, h } from 'vue'

const App = defineComponent({
	setup() {
		return () => h(Text, { color: 'green' }, () => 'Hello world')
	},
})

render(App)
```

That single file is a complete TUI app. Run it with `node` (or `tsx` if you want TypeScript).

## With SFCs

```vue
<!-- counter.vue -->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Text } from 'vueink'

const counter = ref(0)
let timer = null

onMounted(() => {
	timer = setInterval(() => {
		counter.value++
	}, 100)
})

onBeforeUnmount(() => {
	if (timer) clearInterval(timer)
})
</script>

<template>
	<Text color="green">{{ counter }} tests passed</Text>
</template>
```

```ts
import { render } from 'vueink'
import Counter from './counter.vue'

const instance = render(Counter)
await instance.waitUntilExit()
```

See `examples/counter` in the [repository](https://github.com/alexanderop/vue-ink) for a complete SFC setup (including a minimal loader). See [SFC setup](./sfc-setup) for the loader patterns used in the examples.

## Packages

`vueink` is an umbrella entry — most apps only install this. If you want to depend on individual pieces:

| package                    | what it exports                                                       |
|----------------------------|-----------------------------------------------------------------------|
| `vueink`                   | umbrella entry — components + renderer re-exports                     |
| `@vue-ink/components`      | `<Box>`, `<Text>`, `<Newline>`, `<Spacer>`, `<Static>`, `<Transform>` |
| `@vue-ink/renderer`        | Vue custom renderer + composables + `render()` / `renderToString()`   |
| `@vue-ink/core`            | Terminal DOM, layout, output pipeline (no Vue dependency)             |
| `@vue-ink/testing-library` | `render`, `lastFrame`, `frames`, fake stdin/stdout                    |

## Next steps

- [How it works](./how-it-works) — the mental model from first principles
- [API reference](/api/render) — every public function and component
- [Ink → vue-ink parity](/reference/ink-parity) — the full checklist
