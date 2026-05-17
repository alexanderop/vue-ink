# `isCiEnv()` treats any truthy env value as in-CI

`packages/renderer/src/render.ts:116-125` inlines `is-in-ci`'s logic:

```ts
const isCiEnv = (): boolean => {
  const { env } = process;
  return Boolean(
    env['CI'] ||
      env['CONTINUOUS_INTEGRATION'] ||
      env['BUILD_NUMBER'] ||
      env['RUN_ID'],
  );
};
```

`Boolean(env['CI'])` returns `true` for any non-empty string —
including `'false'`, `'0'`, and `'no'`. A user (or a test harness) that
sets `CI=false` to mean "not in CI" gets the opposite: `interactive`
flips off (`render.ts:321`), the alternate screen never enters, the
throttle disengages, frames go out one-shot.

## How it surfaces

- Test fixtures that need `interactive: true` work around it by
  `delete`-ing `CI` from `process.env` before calling `render()`.
- A user on a workstation with `CI=false` exported (e.g. inherited from
  a misconfigured shell rc) will see vue-ink behave as if in CI.

## The fix

Parse the string. The shape used by most CI-detection libs:

```ts
const truthy = (v: string | undefined): boolean =>
  v !== undefined && v !== '' && v !== '0' && v.toLowerCase() !== 'false';

const isCiEnv = (): boolean => {
  const { env } = process;
  return (
    truthy(env['CI']) ||
    truthy(env['CONTINUOUS_INTEGRATION']) ||
    env['BUILD_NUMBER'] !== undefined ||
    env['RUN_ID'] !== undefined
  );
};
```

`BUILD_NUMBER` and `RUN_ID` are presence-checks (CI providers either
set them with a real ID or don't set them at all), so `undefined`
suffices there.

## Why ink doesn't hit this

ink uses the `is-in-ci` npm package directly
(`repos/ink/src/render.ts`). That package handles the falsy-string
parsing. The vue-ink inline reproduces the *list* of env vars but not
the *parsing*.

## Related

- [[../porting/tracker-drift]] — pattern of "ink uses library X, vue-ink
  inlines it and loses an edge case." Same shape as the `patch-console`
  drift.
