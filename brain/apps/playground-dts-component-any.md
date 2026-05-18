# Components used to type as `any` in the dts-bundle

Fixed in 2026-05. Kept as a guard against regressing the rollup
config.

## Symptom

In `packages/vue-ink/dist/index.bundle.d.ts`, every component
declared as `any`:

```ts
declare const Box: any;
declare const Text: any;
declare const Newline: any;
declare const Spacer: any;
declare const Transform: any;
declare const Static: any;
```

Per-package emit (`packages/components/dist/Box.d.ts`) was correct —
the full `DefineComponent<...>` survives `tsc`. The `any` was
re-introduced by [[playground-dts-bundle]]'s flatten step. In the
playground that meant hover/autocomplete on `<Box>` etc. showed no
prop info even though the bundle was wired correctly per
[[playground-monaco-types]].

## Why it happened

`@vue-ink/components` `package.json` resolves `types` to
`./src/index.ts`. With `respectExternal: true`, rollup-plugin-dts
followed that into source and **re-derived** the `.d.ts` for
`Box.ts` itself. On

```ts
const Box = defineComponent({ props: { ...buildBoxProps(), ariaLabel: ... } });
```

its type-flattener couldn't reconstruct Vue's deeply-conditional
`DefineComponent<...>` return across the workspace boundary — the
`...buildBoxProps()` spread makes the inferred props record
particularly hard to serialize — so it bailed and wrote `any`.

## Fix

`rollup.dts.config.mjs` now has a `resolveWorkspaceDist` plugin that
intercepts `@vue-ink/{components,renderer,core}` imports and rewrites
them to each workspace's pre-built `dist/index.d.ts`. rollup-plugin-dts
consumes the already-emitted `DefineComponent` types instead of
re-deriving them from source.

Consequence: the dts-bundle step now **requires** every `@vue-ink/*`
workspace to be built first. `pnpm build` at the root already runs
in topo order (core → renderer/components → vue-ink), so it works
out of the box. If you run `pnpm --filter vueink build:dts-bundle`
in isolation against an unbuilt workspace, the config throws a clear
error pointing at the missing `dist/index.d.ts`.

The alternative — annotating each component as
`const Box: DefineComponent<BoxProps> = defineComponent({...})` —
was rejected because it duplicates the prop record in two places
(runtime + type), drifts easily, and gives users a worse hover
(loses `buildBoxProps()`-derived defaults).

## Related

- [[playground-dts-bundle]] — the bundling config
- [[playground-monaco-types]] — consumer side (Volar)
