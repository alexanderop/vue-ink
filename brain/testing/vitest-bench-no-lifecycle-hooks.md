# `*.bench.ts` doesn't run `beforeAll` / `beforeEach`

vitest's `bench` runner does **not** wire tinybench's per-task
`beforeAll` / `beforeEach` hooks, and the vitest-runner `beforeAll`
import is a no-op inside benches.

Symptom: a bench that mounts in `beforeAll` will time two microtask
awaits and report suspicious ~170ns means across every scenario.

Fix: mount synchronously at describe-body evaluation time and keep the
tree mounted for the whole run. See `packages/vue-ink/bench/rerender.bench.ts`
(comment at line 14-17) and `renderer-core.bench.ts` for the working
pattern.

## Related

- [[../renderer/output-hot-path]] — the renderer code paths these benches guard against regressions in.
