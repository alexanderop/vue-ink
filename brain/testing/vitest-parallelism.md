# Vitest config: forks isolate, no need for `maxWorkers: 1`

`packages/vue-ink/vitest.config.ts` sets `pool: 'forks'`. Each test file
runs in its own forked process — timer/state leakage **cannot cross
fork boundaries**.

A previous defensive `maxWorkers: 1` (serial mode) was unnecessary and
held the suite at ~16.4s. Removing it: 3.0s. Switching to `threads`
inside the fork pool: 2.6s. Adding `isolate: false`: 1.4s (12×).

Tests already use `createCaptureStream` / `createFakeStdin` instead of
real `process.stdout` / `stdin`, so the "afraid of cross-test leakage"
concern was about a leak path that didn't exist.

## Vitest 4 migration gotcha

Migrating vitest 2 → 4 required an explicit `vite: ^7.x` root devDep —
pnpm otherwise pins a transitive `vite@5` from `vite-plus` and tests
crash on install. Also `poolOptions.forks.singleFork: true` was removed
in favor of top-level `maxWorkers: 1`, and `coverage.all: true` was
deprecated in favor of `coverage.include` patterns.

## Related

- [[../porting/inlined-deps-lose-edge-cases]] — similar shape: a
  "defensive" workaround that turned out to mask the real problem.
