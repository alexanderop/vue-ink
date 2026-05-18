# Vue DevTools

vue-ink can connect a running app to the [Vue DevTools](https://devtools.vuejs.org/) standalone GUI over WebSocket, so you can inspect the live component tree, props, and setup state of your terminal UI in the same Components panel you use for browser apps. The integration is opt-in (gated on `DEV=true`) and `@vue/devtools` is an optional peer dependency — it only loads when you ask for it.

## Install

Add `@vue/devtools` as a dev dependency in your consumer project:

```sh
pnpm add -D @vue/devtools
```

```sh
npm install -D @vue/devtools
```

```sh
yarn add -D @vue/devtools
```

## Launch the standalone GUI

The DevTools standalone app hosts a WebSocket server on port `8098` and a UI window. Run it in a separate terminal before starting your app:

```sh
pnpm dlx @vue/devtools
```

```sh
npx @vue/devtools
```

A window will open and wait for a client to connect.

## Enable in your app

Set `DEV=true` in the environment when launching your app:

```sh
DEV=true node ./my-cli.ts
```

That's it — vue-ink probes `ws://localhost:8098` on startup and, if it answers, dynamically imports the devtools loader and connects. If the GUI isn't running, vue-ink prints a warning and falls back to a normal render without devtools.

```ts
// my-cli.ts
import { render } from 'vueink'
import App from './app.vue'

// Start with: DEV=true node ./my-cli.ts
const instance = render(App)
await instance.waitUntilExit()
```

You don't need to import anything devtools-related yourself. `render()` handles the conditional connection internally.

## What's visible

- **Components tab** — the live tree of every Vue component currently mounted. Hover to highlight, click to inspect props, refs, and computed values. Updates in real time as your app re-renders.
- **Composables surface as setup state** — `useInput`, `useFocus`, refs returned from `setup()`, etc. show up on their owning component's inspector panel.
- **Timeline** — Vue's reactivity events (component updates, custom events) are logged just like in a browser app.

## Caveats

- **DOM Elements panel is not useful.** vue-ink's "DOM" is a tree of `ink-box` / `ink-text` / `ink-virtual-text` host nodes — they are not HTML elements and the browser-oriented Elements panel can't render them. Use the **Components tab** instead; that's where the interesting state lives.
- **Performance.** Connecting devtools enables Vue's full devtools hooks, which add overhead to every reactive update. Don't ship `DEV=true` to users.
- **One process at a time.** The standalone GUI accepts one client connection; if you run two `DEV=true` apps at once, only the first connects.

## How it works

When `process.env.DEV === 'true'`, `render()` tries to resolve `@vue/devtools`. If the package is installed, it dynamically imports `@vue-ink/renderer`'s `devtools.ts`, which:

1. Polyfills `window` on Node so `@vue/devtools` can register its global hook.
2. Probes `ws://localhost:8098` with a 2-second timeout.
3. On success, calls `devtools.connect('http://localhost', 8098)`. Vue's devtools buffer (`APP_INIT`) replays once the hook attaches, so the tree appears immediately.
4. On failure, logs a hint pointing at `pnpm dlx @vue/devtools`.

This mirrors react-ink's [`reconciler.ts` devtools gate](https://github.com/vadimdemedes/ink/blob/master/src/reconciler.ts). The source lives in `packages/renderer/src/devtools.ts`.
