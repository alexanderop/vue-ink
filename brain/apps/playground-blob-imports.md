# Playground blob-imports: what the runner can and can't control

`apps/playground/src/playground/runner.ts` rewrites user code's bare
specifiers, wraps the result in a `Blob`, and `await import(blobURL)`s
it. Two constraints on this path are not visible from the code and
catch reviewers off guard.

## Browser pins module records forever

`await import(blobURL)` registers the module in the browser's ESM
module map. `URL.revokeObjectURL(blobURL)` releases the *URL*, **not
the module record**. Every recompile creates a new module. Memory
grows monotonically per keystroke; nothing the playground does can
unpin it. This is a browser limitation, not a runner bug.

Mitigation isn't cleanup — it's avoidance. Short-circuit when the
compiled source is byte-identical to the last run (the existing
`compiledJs === lastCompiledJs` guard in `runCompiled` does this) so
the common "same code, watcher re-fired" path doesn't allocate a new
module.

Anyone trying to "fix the leak" by tweaking `dispose()` is wasting
their time. Leave a comment on `URL.revokeObjectURL` if it tempts a
future reader.

## `REWRITE_RULES` only matches `from`-style imports

The regexes in `runner.ts:REWRITE_RULES` are anchored to `from
'vue-ink'` / `from 'vue'` patterns. They miss:

- `await import('vue-ink')` — dynamic import
- `import 'vue-ink'` — side-effect import
- `import * as X from 'vue-ink'` — namespace import (this one
  *should* match the existing `from` pattern, double-check before
  trusting)
- `require('vue-ink')` shapes if anything ever introduces them

If the playground starts advertising dynamic imports to users, the
rewrites will silently no-op and the iframe will resolve `vue-ink`
through `importMap` instead — i.e. it'll hit the stub, not the
xterm-bound proxy. Symptom: the user's code "runs" but produces no
terminal output.

`@vue/repl` exposes `transformImports` on the store; that's the
documented hook if this needs to grow.

## Related

- [[playground-dual-execution]] — why the importMap stub exists at
  all, and the rewrite-rule ordering invariant
- [[../renderer/host-portability]] — the renderer-side contract these
  shims have to satisfy
