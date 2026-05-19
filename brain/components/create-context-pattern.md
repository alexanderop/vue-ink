# `createContext` pattern for typed provide/inject pairs

`packages/components/src/helpers/create-context.ts` wraps an `InjectionKey`
plus its provide/inject pair into a single factory call:

```ts
const [useBackgroundColor, provideBackgroundColor] = createContext<() => string | undefined>(
  "vue-ink:background-color",
);
```

Borrowed from reka-ui / shadcn-vue. Used by `background-context.ts`,
`accessibility-context.ts`, and (internally) `text-context.ts`.

## What it actually buys

Ordered by weight — none of these are LOC wins:

1. **The symbol stays private.** With a raw exported `InjectionKey` any
   consumer can call `inject(KEY)` / `provide(KEY, x)` with the wrong type
   or in the wrong direction. The factory closes the key over the returned
   tuple, so only the intended `useFoo()` / `provideFoo(value)` are
   reachable.
2. **Call sites read as composables.** No `inject(KEY, null)` default
   boilerplate at every reader, no `provide(KEY, …)` import dance.
3. **Provider and consumer can't desync on type.** Both sides resolve from
   the same `<T>` generic at the factory call. Renaming or retyping is one
   edit.
4. **Cross-package symbol identity is opt-in and explicit.** Pass
   `{ global: true }` to seed via `Symbol.for(name)` instead of a fresh
   `Symbol(name)`. The accessibility context relies on this so
   `@vue-ink/renderer` and `@vue-ink/components` share identity through
   Node's global symbol registry — previously a comment-plus-cast scattered
   across both files.

## What it does **not** buy

- **No LOC reduction at the declaration site.** `background-context.ts`
  went from 4 lines to ~9. Savings show up at call sites, not declarations.
- **No runtime perf change.** Same `inject`/`provide` underneath.
- **No new capability.** Vue provide/inject already does all this — the
  factory is pure ergonomics.

## Scope (deliberately small)

The current `createContext` returns `[() => T | undefined, (value: T) =>
void]`. Every component-side context is optional (consumers have sensible
fallbacks), so no required variant exists yet.

The renderer has 8 `InjectionKey` + `requireContext` pairs in
`packages/renderer/src/context.ts` and
`composables/_internal/require-context.ts`. Extending the factory with a
required variant (`createRequiredContext<T>(name, callSite)` that throws)
would collapse ~3 lines per composable into 1 — the bigger structural win,
but out of scope until someone actually does that migration. See
[[../renderer/no-sfc-components]] for why we don't pull in reka-ui's full
context factory wholesale.

## When to reach for it

Any new shared state between vue-ink components or composables that
previously would have been a hand-rolled `InjectionKey`. If the context is
shared across packages, set `global: true` and pick a stable name —
**never** rely on `Symbol.for` accidentally; declare it.

## Anti-patterns

- **Don't migrate `text-context.ts`'s `useTextHost()` into a bare
  `createContext` pair at the call site.** It does inject + provide + tag
  selection in one call — bespoke semantics that consumers depend on.
  Internal: the key is built with `createContext`; external: `useTextHost`
  stays the only export.
- **Don't introduce a required variant inside the components package** just
  because the renderer has one. Keep `requireContext` where it belongs
  (renderer-internal) until a second user appears.
