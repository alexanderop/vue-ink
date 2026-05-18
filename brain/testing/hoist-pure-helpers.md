# Hoist pure test helpers out of `describe()`

oxlint runs in lefthook pre-commit with `unicorn/consistent-function-scoping`
enabled. A helper declared inside `describe()` (or any nested block) that
doesn't close over a parent-scope variable fails the lint and blocks the
commit:

```ts
// ❌ blocks commit
describe('createInputManager — bufferInput', () => {
  const drainMicrotasks = (): Promise<void> =>
    new Promise((resolve) => queueMicrotask(() => resolve()));
  // ...
});

// ✅
const drainMicrotasks = (): Promise<void> =>
  new Promise((resolve) => queueMicrotask(() => resolve()));

describe('createInputManager — bufferInput', () => {
  // ...
});
```

Rule applies to every file lefthook lints, not just tests. Write pure
helpers at module scope from the start — discovering the rule from a
pre-commit failure costs a re-stage and a re-commit.

Caveat: helpers that *do* capture loop variables, fixtures, or other
block-scope state are fine to leave inline. The rule only fires when the
function makes no use of its surrounding scope.
