# Internal components stay as `defineComponent + h()`, not `.vue` SFCs

`packages/components/src/{Box,Text,Newline,Spacer,Transform,Static}.ts` are
authored with `defineComponent({ setup: () => () => h(...) })` instead of
single-file components. This is a structural decision, not a stylistic one —
SFCs were tried (Text → Text.vue) and the experiment surfaced four problems
that the Vue ecosystem has chosen not to fix at the source.

## The four blockers

### 1. plugin-vue compiles SFCs in SSR mode under Vitest's node/forks pool

`@vitejs/plugin-vue`'s `transformMain` hard-wires this codegen into every SFC
when Vite's per-request `ssr` flag is true (no opt-out exists in the 6.x
`Options` interface):

```js
const _sfc_setup = _sfc_main.setup
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext()
  ;(ssrContext.modules || (ssrContext.modules = new Set())).add(filename)
  return _sfc_setup ? _sfc_setup(props, ctx) : undefined
}
```

Vitest 4 with `pool: 'forks'` defaults to `viteEnvironment: 'ssr'`, so every
SFC gets this wrapper. vue-ink is **not** an SSR runtime — no
`useSSRContext()` value exists during a custom-renderer mount, so
`ssrContext` is `undefined` and `.modules` throws.

Workaround: a custom Vitest environment with `viteEnvironment: 'client'`.
Works, but every consumer of `@vue-ink/components` who tests Vue components
in Node hits the same trap. The fix has to be reapplied in every downstream
test suite.

### 2. No production-grade `.vue` Node loader exists

`@vue-ink/components` is published with `main: ./src/index.ts` and consumed
by Node directly (via `tsx` for examples, or by Vite for app builds). For
SFCs to work in Node:

- `tsx` has no `.vue` handler.
- `vue-esm-loader` — 2 stars, ~767 dl/mo, single maintainer. Too thin.
- `vue3-sfc-loader` — explicitly browser-only.
- `unplugin-vue` — bundler plugin, not a Node `--import` hook.
- Nuxt sidesteps the question by using Vite at build time.

The `bin/vueink.ts` launcher and the `examples/` runner both spawn `node
--import=tsx`, so they would all need a custom Node loader hook on top.

### 3. plugin-vue forces `resolve.dedupe: ['vue']` from the Vite root

In a pnpm workspace where `vue` is hoisted under a leaf package (not the
workspace root), the dedupe lookup fails and Vite can't resolve `from 'vue'`
in test files at all. Workaround: explicit `resolve.alias` for `vue` pointing
at the actual install location.

### 4. `<slot />` template compilation inserts empty `#text` anchors

A template like:

```vue
<template v-if="cond">{{ x }}</template>
<slot v-else />
```

compiles into `_renderSlot(_ctx.$slots, "default", { key: 1 })`. In a custom
renderer this produces **empty `#text` anchor nodes** flanking the slot
content — block-tree invariants that keep Vue's `patchFlag` fast paths
working ([vuejs/core#8444](https://github.com/vuejs/core/issues/8444),
closed: no opt-out). They occupy `childNodes` positions and shift
`internal_transform`'s `index` argument off-by-one in `<Transform>` chains.

`defineComponent` + `h(tag, {}, slots.default())` returns the slot's children
directly, with no fragment anchors.

## Industry precedent

Every Node-targeting Vue custom renderer authors components in `.ts` with
`defineComponent + h()`:

- **[temir](https://github.com/webfansplz/temir)** (closest peer — Ink port):
  100% `.ts`, zero `.vue` in the renderer package.
- **[vue-termui](https://github.com/vue-terminal/vue-termui)**: 6/7
  functional `.ts`, only `Input.vue` is an SFC.
- **[vue-nodegui](https://github.com/nodegui/vue-nodegui)**: 17/17 widgets
  are `.ts`. `.vue` only in demos.
- **[TresJS](https://github.com/Tresjs/tres)**: 2 SFCs but both are DOM
  wrappers (`TresCanvas.vue`). Their actual renderer node types are auto-
  generated from the THREE namespace. Tests run in `jsdom`, sidestepping the
  SSR crash entirely.

SFCs work fine in **user-facing** code (examples, app entry points) — those
go through Vite's build pipeline where plugin-vue's environment is correct
and the runtime fragment-anchor cost is amortized into one node per app.

## The one thing worth keeping from the experiment

[[yoga-vs-dom-indices]] already documents that `ink-comment` Vue fragment
anchors occupy DOM-tree slots but not yoga-tree slots. `squashTextNodes` now
applies the same rule — empty `#text` and `ink-comment` siblings are skipped
when computing the `index` passed to `internal_transform`. This is a latent
bug fix; the slot-anchor shape surfaced it but the underlying invariant
predates this experiment.

## TL;DR

Keep authoring `packages/components/src/*.ts` with `defineComponent` +
`h()`. SFCs are for user app code, not internal renderer components.
