# VueUse-style composable patterns

The canonical shape every composable in `packages/renderer/src/composables/`
must follow. Distilled from `repos/vueuse/` after auditing our prior monolithic
`composables.ts` and rewriting all ten composables to match. Treat this as a
checklist when adding a new composable — deviating from it is a smell.

## Folder layout

One composable per folder, test co-located:

```
packages/renderer/src/composables/
  _internal/                           ← shared building blocks
    try-on-scope-dispose.ts
    require-context.ts
    use-emitter-listener.ts
    index.ts
  _test/                               ← test-only utilities
    with-setup.ts
  index.ts                             ← public barrel
  useFoo/
    index.ts                           ← the composable
    index.test.ts                      ← co-located unit tests
```

Mirrors `repos/vueuse/packages/core/<composableName>/{index.ts,index.test.ts}`.
The barrel (`composables/index.ts`) is the only thing `src/index.ts` imports
from. Adding a composable means: new folder + new test + one line in the
barrel.

Tests are picked up by `packages/vue-ink/vitest.config.ts` via the second glob
in `test.include`: `packages/renderer/src/composables/**/*.test.ts`.

## API conventions

1. **Accept `MaybeRefOrGetter<T>` for reactive options**, not bare refs.
   Unwrap with `toValue()` once, inside a `computed()`. Single source of truth
   for ref/getter/raw, and getters like `() => state.editing` Just Work.

   ```ts
   import { computed, toValue, type MaybeRefOrGetter } from 'vue';

   export interface UseFooOptions {
     isActive?: MaybeRefOrGetter<boolean>;
   }

   const isActive = computed(() => toValue(options.isActive ?? true) !== false);
   ```

   *Anti-pattern:* `typeof opt === 'object' ? opt.value : opt` — rejects
   getters and re-runs a `watch` just to copy a bool into a ref.

2. **Subscription composables return a `Stop` function.** Imperative callers
   need to detach without remounting (one-shot prompts, route changes,
   conditional handlers). `Stop = () => void` from `_internal`.

   ```ts
   export const useInput = (handler, options = {}): Stop => { ... };
   ```

3. **Teardown via `tryOnScopeDispose`, never `onBeforeUnmount`.** Composables
   then work inside any `effectScope` — including tests, custom directives,
   and `createSharedComposable`-style sharing. `tryOnScopeDispose` is a no-op
   outside a scope (returns `false`), so callers in non-reactive code don't
   explode.

4. **`shallowRef` for primitives and POJOs.** `ref<{ columns, rows }>` paid
   for deep reactivity on two numbers. `useWindowSize` now returns
   `{ columns: ShallowRef<number>, rows: ShallowRef<number> }` (two refs, not
   `Ref<object>`) — VueUse-style, lets templates auto-unwrap with
   destructuring and lets watchers fire per-dim.

5. **Throw a named error when required context is missing.** Use
   `requireContext(KEY, 'useFoo()')` from `_internal`. The call-site string
   surfaces in the error — `error.message.includes('useFoo')` is how the
   tests assert it.

6. **Don't leak internals.** `useStdin` deliberately omits the `emitter` from
   its return; subscribers go through `useInput`/`usePaste` so raw-mode
   reference-counting stays correct.

7. **JSDoc on the public export.** Short, behavior-first. Mention `Stop`
   semantics, lifecycle ownership, and any TTY requirement.

## The shared event-listener primitive

`_internal/use-emitter-listener.ts` is the abstraction `useInput` and
`usePaste` are built on. It owns the `isActive` watcher, attach/detach
ref-counting, and `tryOnScopeDispose`. Any new subscription composable that
proxies an `EventEmitter` should reuse it — don't reinvent the
`listening`/`wrapped`/`start`/`stop` dance.

```ts
return useEmitterListener(emitter, 'paste', handler, {
  isActive: options.isActive,
  onAttach: () => { setRawMode(true); setBracketedPasteMode(true); },
  onDetach: () => { setBracketedPasteMode(false); setRawMode(false); },
});
```

`onAttach`/`onDetach` are where TTY mode toggles, focus claims, etc. happen.
Keep the listener function pure.

## Test patterns

VueUse's gold standard: mount the composable in a real `setup()` via a
throwaway renderer, run it inside an `effectScope`, assert on the return value
directly. No real terminal, no yoga, no `render()` choreography.

`_test/with-setup.ts` exports `withSetup(fn, contexts)`:

```ts
import { describe, it, expect } from 'vitest';
import { withSetup, fakeAppContext } from '../_test/with-setup.ts';
import { useApp } from './index.ts';

it('exit() delegates to the injected handler', () => {
  const app = fakeAppContext();
  const { result, unmount } = withSetup(() => useApp(), { app });
  result.exit(new Error('boom'));
  expect(app.exitMock).toHaveBeenCalledWith(expect.any(Error));
  unmount();
});
```

Rules:

- **No `defineComponent` in tests.** If you find yourself writing
  `let captured: ReturnType<typeof useFoo> | null = null` and a render setup
  function, you're not using `withSetup` — fix the test.
- **Fake the context, not the renderer.** `fakeAppContext`,
  `fakeStdinContext`, `fakeStdoutContext`, `fakeStderrContext`,
  `createFakeStdin`, `createFakeStdout` cover every injection. Build the
  emitter inline when the test needs to drive events through it.
- **`flush` is `withSetup`'s return.** `await flush()` after mutating a ref
  to let Vue's scheduler drain. Don't import `nextTick` directly in tests.
- **Lifecycle teardown is verified explicitly.** Every subscription
  composable's suite must include "detaches on scope dispose" — call
  `unmount()` then emit, expect zero handler calls.
- **Tests for "throws when not mounted" go through `withSetup` with no
  contexts.** The helper's `errorHandler` re-throws synchronously so the
  `expect(() => withSetup(...)).toThrow(/useFoo/)` pattern works without
  stderr noise.
- **Real focus manager in focus tests.** `useFocus`/`useFocusManager` tests
  build a real `createFocusManager(emitter)` instead of mocking — the manager
  is small, deterministic, and faking it would re-implement the unit under
  test.

## Anti-patterns (and what to do instead)

| Anti-pattern                                          | Use this                                   |
|------------------------------------------------------|--------------------------------------------|
| `onBeforeUnmount(stop)`                              | `tryOnScopeDispose(stop)`                  |
| `typeof opt === 'object' ? opt.value : opt`          | `toValue(opt)` + `MaybeRefOrGetter`        |
| `ref({ columns, rows })`                             | Two `shallowRef<number>`s                  |
| `let captured = null; ... captured = useFoo()`       | `const { result } = withSetup(() => ...)`  |
| `defineComponent({ setup() { return () => h(...) }})`| `withSetup(() => useFoo(), contexts)`      |
| Returning `void` from a subscription                 | Return `Stop`                              |
| `inject(KEY)!` with a `!`                            | `requireContext(KEY, 'useFoo()')`          |
| `nextTick()` + `queueMicrotask()` in every test      | `await flush()` from `withSetup`           |
| `/* v8 ignore */` on a guard                         | Test it directly — guard is reachable now  |

## Related

- [[testing/ink-strategy]] — the ink subprocess/pure-stdout split still
  applies to E2E renderer tests; `withSetup` is the layer below that.
- [[principles/subtract-before-you-add]] — the migration deleted 6 redundant
  test files and ~150 lines of duplicated `listening`/`start`/`stop`
  boilerplate from the monolithic `composables.ts`.
- [[principles/encode-lessons-in-structure]] — folder layout enforces the
  pattern; future contributors find the conventions by scanning the tree.
- `repos/vueuse/packages/core/_template/` — the upstream skeleton this
  mirrors.
- `repos/vueuse/packages/shared/tryOnScopeDispose/index.ts` and
  `createEventHook/index.ts` — the helpers we vendored conceptually into
  `_internal/`.
