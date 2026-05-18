# `vite-plugin-node-polyfills` shims don't resolve in a pnpm workspace

`apps/playground/vite.config.ts` runs `nodePolyfills({ globals: { Buffer, process } })`
to make the renderer browser-buildable. The plugin works by injecting
`import … from 'vite-plugin-node-polyfills/shims/<name>'` into any file that
references `Buffer` / `global` / `process` — including workspace sources like
`packages/renderer/src/render.ts` that get pulled into the build graph the
moment `apps/playground/src/playground/runner.ts` statically imports `vueink`.

Rollup's default resolver looks for the shim package **next to the importer**.
pnpm doesn't hoist `vite-plugin-node-polyfills` outside `apps/playground/`, so
the import emitted inside `packages/renderer/src/render.ts` fails with:

```
Could not load …/packages/renderer/src/shims/process
```

Symptom looks like a Vite config bug but is purely a pnpm layout issue. The
fix is a `pre`-stage Rollup plugin that maps the three shim specifiers to
their absolute on-disk locations via `createRequire(import.meta.url).resolve`
— see `apps/playground/vite.config.ts:19-35`.

## Why it only bites in production

In dev, Vite's module graph stays anchored at the playground app and the
renderer is served on demand from its source path — the shim package lives
next to the entrypoint that needs it. In `vite build`, Rollup walks the
import graph eagerly across workspace boundaries and emits the shim import
inside the renderer file's resolution context.

If a future change removes the static `import * as vueinkNs from 'vueink'`
in `runner.ts` (e.g. fully lazy-loading vue-ink through the blob proxy), the
resolver plugin becomes dead code — workspace files would never enter the
build graph and the polyfill plugin would only touch the app's own sources.
Don't delete the resolver speculatively though; the failure mode is loud.

## Related

- [[playground-url-import-meta-trap]] — the sibling production-only trap
- [[playground-deploy]]
- [[../renderer/host-portability]]
