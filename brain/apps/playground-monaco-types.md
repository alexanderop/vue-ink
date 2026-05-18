# Monaco IntelliSense uses a different pipe than runtime imports

The Vue REPL has **two completely independent** module-resolution pipes.
The playground only wires the runtime pipe, which is why hover/autocomplete
on `Box`, `useInput`, etc. silently does nothing today.

| Pipe                     | Resolves via                                                                                                                                                                                    | Wired in playground?                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Runtime (iframe + xterm) | `importMap` for the REPL iframe; `REWRITE_RULES` blob proxies for xterm                                                                                                                         | Yes — see [[playground-dual-execution]]                                  |
| Editor types (Monaco)    | `createNpmFileSystem` (`repos/repl/src/monaco/resource.ts:34`) — lazily fetches `package.json` + `.d.ts` from **unpkg**, pinned by `store.dependencyVersion`. `resourceLinks` can swap the CDN. | **No** — Volar tries unpkg for `vue-ink`/`vueink`, gets stale or missing |

The runtime stub `VUE_INK_STUB_EXPORTS` in `App.vue` keeps the iframe from
throwing on missing exports, but those are **runtime values only**. Monaco's
Volar worker (`repos/repl/src/monaco/vue.worker.ts`) never sees them.

## The hidden-file escape hatch

Volar's `getSyncUris()` in `vue.worker.ts:92` pulls **every file in the
store** into the language service. So a `.d.ts` file added via
`store.setFiles({...}, mainFile)` (or as a hidden file) participates in
type-checking. Wrap the contents in
`declare module 'vue-ink' { … } declare module 'vueink' { … }` to teach
Volar both bare specifiers (only one resolves through unpkg; the other is
just an alias at runtime).

## Why `dist/index.d.ts` can't be injected as-is

`packages/vue-ink/dist/index.d.ts` is pure re-exports from
`@vue-ink/renderer` / `@vue-ink/components`. Volar won't follow those
specifiers without those packages also being on disk in the virtual fs.
We flatten into one self-contained file via `rollup.dts.config.mjs` and
expose it as the `./dts-bundle` subpath; `App.vue` imports it with
`?raw`. The flatten step has its own gotchas — see
[[playground-dts-bundle]].

## The `vue-ink` vs `vueink` name story

Default playground files import `'vue-ink'`; the published package is
`vueink`. Runtime aliases both via `REWRITE_RULES`, but unpkg only knows
about `vueink`. Either name picked for the d.ts shim must `declare module`
**both** strings or the other will silently miss.

## Related

- [[playground-dts-bundle]] — how the injected `.d.ts` gets built
- [[playground-dual-execution]] — the runtime side of the same problem
- [[playground-blob-imports]] — how runtime imports actually resolve
