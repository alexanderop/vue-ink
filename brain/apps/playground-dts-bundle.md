# `dist/index.bundle.d.ts` — the rollup-plugin-dts gotcha

`packages/vue-ink/rollup.dts.config.mjs` flattens the workspace's
`@vue-ink/*` re-exports into one self-contained `.d.ts` that the
playground injects as a hidden Volar file (see [[playground-monaco-types]]).

The non-obvious part is the **two-flag pair + resolver plugin** that
make the bundle actually work:

```js
external: (id) => !isRelative(id) && !(id in workspaceDistPaths),
plugins: [resolveWorkspaceDist, dts({ respectExternal: true })],
```

- `dts()` defaults to treating _every_ non-relative import as external.
  That means `@vue-ink/renderer` is treated like `vue` — never followed
  — so the bundle is empty re-exports.
- `respectExternal: true` flips that default to "follow everything,"
  which inlines `@vue-ink/*` (good) **and** drags in all of Vue's
  internal runtime-core types (~24k lines; bad).
- The `external` callback rescues us by re-marking anything outside
  the `@vue-ink/` namespace as external again.
- `resolveWorkspaceDist` rewrites `@vue-ink/{components,renderer,core}`
  imports to each workspace's pre-built `dist/index.d.ts` so
  rollup-plugin-dts consumes already-emitted `DefineComponent` types.
  Without this, components flattened to `any` —
  see [[playground-dts-component-any]].

Symptom of getting this wrong: the bundle file balloons past ~5000
lines and contains `ComponentInternalInstance`, `VNode`, etc. — Vue
internals leaking in.

Externals that **must** stay external (Volar resolves them through
unpkg via `dependencyVersion`): `vue`, `yoga-layout`, `cli-boxes`,
`ansi-styles`, `type-fest`, all `node:*`.

The script runs as part of `pnpm --filter vueink build` (chained from
the regular `build` script). If you only run the tsdown step the
bundle won't regenerate and the playground will serve stale types.

## Related

- [[playground-monaco-types]] — the consumer side (hidden Volar file)
- [[playground-blob-imports]] — runtime resolution (different pipe)
