---
name: capture-composable-from-setup
description: Port idiom for tests that render a tree AND need a composable's imperative API — capture the return into an outer `let` inside setup().
metadata:
  type: project
---

# Capture imperative composable APIs into an outer `let`

When a ported test needs to:

1. Render a real component tree (so the renderer mounts and `useFoo()`
   has the right context), **and**
2. Call imperative methods on the composable's return (e.g.
   `focusNext()`, `enableFocus()`, `reset()`),

the React idiom is `useEffect` on a prop that triggers the call. The
Vue equivalent is to **capture the composable result into an outer
`let` from inside `setup()`** so the test body can call it directly.

```ts
let captured!: ReturnType<typeof useFocusManager>;

const Test = defineComponent({
  setup() {
    captured = useFocusManager();
    return () => h(Box, null, () => [...]);
  },
});

await render(Test);
captured.focusNext();
await waitUntilFlush();
captured.disableFocus();
```

Reactive props that ink toggles via `rerender(<Test newProp />)`
become module-scoped `ref()`s that the test mutates in place; pair
each mutation with `await waitUntilFlush()` so Vue's commit lands
before the next assertion. See `packages/vue-ink/test/Focus.test.ts`
for the canonical example (added 2026-05-19 during the
`focus.tsx → Focus.test.ts` port).

## Why not `withSetup`?

`withSetup(() => useFoo())` mounts the composable in a bare
`effectScope` with no renderer attached — perfect for pure-composable
unit tests but **wrong** when the composable needs the renderer's
provided context (`useFocusManager` reaches into the focus manager
provided by `render()`).

| Need                              | Use                   |
| --------------------------------- | --------------------- |
| Composable unit test, no renderer | `withSetup(...)`      |
| Composable + real render tree     | `let captured!` idiom |
| Renderer behavior only            | Plain `render(App)`   |

## Related

- [[../porting/from-react-ink]] — the "hooks → composables" shape
  changes and the `Stop` return convention.
- [[ink-strategy]] — split between the internal helpers
  (`test/helpers.ts`) and the public `@vue-ink/testing-library`.
