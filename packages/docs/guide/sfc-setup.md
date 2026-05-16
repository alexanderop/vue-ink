# SFC setup

vue-ink renders Vue components — including `.vue` Single File Components. Node can't import `.vue` files natively, so you need a loader. The patterns below are what the examples in the repo use.

## tsx + on-the-fly compilation

The simplest path is a tiny loader that uses `@vue/compiler-sfc` to compile `.vue` files at import time, plus `tsx` for TypeScript.

```ts
// loader.ts
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./vue-loader.ts', pathToFileURL('./'))
```

See `examples/counter/` in the [repository](https://github.com/alexanderop/vue-ink/tree/main/examples/counter) for a complete working setup — including the loader, the SFC, and the entry script.

## With a bundler

If you're shipping a CLI to npm, bundling is the most user-friendly option:

- **Vite** with `@vitejs/plugin-vue` + `node` SSR target works well.
- **tsup** or **unbuild** with the Vue plugin works for simpler cases.

Bundling has two advantages:

1. End users don't need a loader.
2. SFCs are pre-compiled, so startup is faster.

## Running an SFC app

Once your loader is set up:

```ts
// index.ts
import { render } from 'vueink'
import App from './app.vue'

const instance = render(App)
await instance.waitUntilExit()
```

`waitUntilExit()` resolves when the user exits (Ctrl-C by default, configurable via `exitOnCtrlC`). Without it, the script will exit immediately and the terminal will only flash the first frame.
