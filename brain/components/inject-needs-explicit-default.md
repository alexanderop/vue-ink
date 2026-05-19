# `inject(key)` without a default breaks layout tests, not just emits warnings

`createContext`'s `useFoo()` calls `inject(key, undefined)` — the explicit
`undefined` is **structurally required**, not cosmetic. Dropping it (i.e. bare
`inject(key)`) regresses two `vueink` tests with `{ width: NaN, height: NaN }`
even though every call site has a `?? fallback`.

Symptom seen this session: `MeasureElement.test.ts` and
`IncrementalRendering.test.ts` failed after migrating to bare `inject(key)`.
Vue logged `[Vue warn]: injection "Symbol(vue-ink:background-color)" not
found`, then layout came back as `NaN`. Re-adding the `undefined` default made
both pass.

## Why (working theory)

Vue's warning formatter walks the component tree to render the "at <Box> at
<App>" trace. In a custom renderer that walk appears to interact with
post-commit / Yoga measurement timing badly enough to surface as NaN
dimensions. The agent did not pin down the exact mechanism — only that
suppressing the warning makes the failure go away deterministically.

The source comment on `create-context.ts` claims "runtime behaviour is
identical — only the warning differs." That is **wrong in this codebase**.
Don't trust it; the tests are the source of truth.

## How to apply

- New `createContext`-style factories: always pass `undefined` (or a real
  fallback) as the second arg to `inject`.
- Hand-written `inject(KEY)` in any component package file: same rule.
- If you see "injection not found" warnings during a vueink test run,
  treat it as a real bug not log noise — it can corrupt layout output.

See [[create-context-pattern]] for the factory itself.
