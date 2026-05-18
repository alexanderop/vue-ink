# `isCiEnv()` — falsy-string parsing

`packages/renderer/src/render.ts:116-131` inlines `is-in-ci`'s logic.
Earlier versions wrapped every env var in `Boolean(...)`, which treated
any non-empty string (including `'false'`, `'0'`, `'no'`) as in-CI.
Fixed 2026-05-17: `CI` and `CONTINUOUS_INTEGRATION` are now string-parsed,
`BUILD_NUMBER` / `RUN_ID` stay presence-only.

```ts
const isTruthyEnv = (v: string | undefined): boolean =>
  v !== undefined && v !== '' && v !== '0' && v.toLowerCase() !== 'false';

const isCiEnv = (): boolean => {
  const { env } = process;
  return (
    isTruthyEnv(env['CI']) ||
    isTruthyEnv(env['CONTINUOUS_INTEGRATION']) ||
    env['BUILD_NUMBER'] !== undefined ||
    env['RUN_ID'] !== undefined
  );
};
```

`isTruthyEnv` is hoisted to module scope rather than nested inside
`isCiEnv` — oxlint's `unicorn/consistent-function-scoping` rule fails
the lefthook pre-commit hook otherwise. See [[../testing/hoist-pure-helpers]].

`BUILD_NUMBER` and `RUN_ID` are presence-checks (CI providers either
set them with a real ID or don't set them at all), so `undefined`
suffices there — a literal `"0"` from Jenkins still counts as in-CI.

## Regression coverage

`packages/vue-ink/test/RenderInteractive.test.ts`:
- `CI='false'` on a TTY → interactive stays on, per-frame writes happen.
- `CI='true'` on a TTY → interactive flips off, one buffered final write.
- `BUILD_NUMBER='0'` → in-CI (presence-only).

Each test snapshots and restores `process.env` so it doesn't leak into
the rest of the suite.

## Why ink doesn't hit this

ink uses the `is-in-ci` npm package directly
(`repos/ink/src/render.ts`). That package handles the falsy-string
parsing. The vue-ink inline reproduces the *list* of env vars but not
the *parsing*.

## Related

- [[../porting/tracker-drift]] — pattern of "ink uses library X, vue-ink
  inlines it and loses an edge case." Same shape as the `patch-console`
  drift.
