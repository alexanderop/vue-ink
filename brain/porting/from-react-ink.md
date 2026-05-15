# Porting an app from React Ink to vue-ink

Field notes for moving an existing `ink` app over. The component surface
is intentionally 1:1 where possible, but **reactivity shape, lifecycle
hooks, and a handful of unported features** will bite anyone doing a
mechanical translation.

Read alongside [[../testing/ink-strategy]] and
[[../composables/vueuse-patterns]]. The renderer-internal landmines are
in [[../renderer/yoga-vs-dom-indices]],
[[../renderer/nested-text-must-be-virtual]],
[[../renderer/output-hot-path]], [[../renderer/input-pipeline]] — read
those only if you're extending the renderer, not porting an app.

Everything below was verified against `repos/ink/src/` and
`packages/{vue-ink,renderer,components,core}/src/` on
2026-05-15. When in doubt, **grep the vendored repos**, don't trust
training data.

## TL;DR mental model

| ink (React)                                    | vue-ink                                  |
|------------------------------------------------|------------------------------------------|
| `react-reconciler` host config                 | `@vue/runtime-core` `createRenderer`     |
| `hostContext.isInsideText` in `createInstance` | `provide(INSIDE_TEXT_KEY)` in `<Text>`   |
| `useState` / `setState`                        | `ref` / assignment                       |
| `useEffect(fn, deps)` / `useLayoutEffect`      | `watchEffect` / `watch`                  |
| `useEffect(fn, [])` + cleanup                  | `onMounted` + `onBeforeUnmount`          |
| `useMemo`                                      | `computed`                               |
| `useRef`                                       | `shallowRef` (or plain `let` in setup)   |
| `useCallback`                                  | Just inline — no stale-closure problem   |
| Hook returns value                             | Composable returns value **or `Stop`**   |
| JSX                                            | SFC `<template>` or `h(...)` render fn   |
| Concurrent Mode / Suspense                     | n/a (Vue's scheduler instead)            |

## Full parity table (what's there, what's missing)

### Components

| ink           | vue-ink         | Status      | Notes                                 |
|---------------|-----------------|-------------|---------------------------------------|
| `<Box>`       | `<Box>`         | ✓ partial   | No `aria-label` / `aria-hidden` / `aria-role` / `aria-state` props yet |
| `<Text>`      | `<Text>`        | ✓ partial   | No `aria-label` / `aria-hidden` props yet |
| `<Newline>`   | `<Newline>`     | ✓           | `count?: number` (default 1)          |
| `<Spacer>`    | `<Spacer>`      | ✓           | Equivalent to `<Box flexGrow={1}>`    |
| `<Transform>` | `<Transform>`   | ✓ partial   | No `accessibilityLabel` prop yet      |
| `<Static>`    | **not ported**  | ❌ gap       | Logs / write-once areas. Workaround: write to `useStdout().write()` for ephemeral above-the-fold output |

### Hooks → composables

| ink                          | vue-ink                                   | Status      |
|------------------------------|-------------------------------------------|-------------|
| `useApp()`                   | `useApp()`                                | ✓ (same `{exit, waitUntilRenderFlush}`) |
| `useStdin()`                 | `useStdin()`                              | ✓ (`{stdin, isRawModeSupported, setRawMode, setBracketedPasteMode}`) — **no `internal_eventEmitter`** |
| `useStdout()`                | `useStdout()`                             | ✓ (`{stdout, write}`)                   |
| `useStderr()`                | `useStderr()`                             | ✓ (`{stderr, write}`)                   |
| `useInput(fn, opts)`         | `useInput(fn, opts) → Stop`               | ✓ shape differs (Stop return, `MaybeRefOrGetter` opts) |
| `usePaste(fn, opts)`         | `usePaste(fn, opts) → Stop`               | ✓ same shape diff                       |
| `useFocus({...})`            | `useFocus({...}) → {isFocused, focus}`    | ✓ `isFocused` is `ComputedRef<boolean>` |
| `useFocusManager()`          | `useFocusManager()`                       | ✓ adds `activeId: Ref<string>`          |
| `useWindowSize()`            | `useWindowSize()`                         | ✓ shape differs: two `ShallowRef<number>` instead of one object |
| `useIsScreenReaderEnabled()` | `useIsScreenReaderEnabled()`              | ✓ returns `Ref<boolean>`                |
| `useAnimation({...})`        | `useAnimation({...})`                     | ✓ returns four `ShallowRef`s + reset    |
| `useCursor()`                | **not ported**                            | ❌ gap — no API to position cursor for IME |
| `useBoxMetrics(ref)`         | **not ported**                            | ❌ gap — no per-Box measured layout API |

### `RenderOptions`

| ink                       | vue-ink                  | Status                              |
|---------------------------|--------------------------|-------------------------------------|
| `stdout`                  | `stdout`                 | ✓                                   |
| `stdin`                   | `stdin`                  | ✓                                   |
| `stderr`                  | `stderr`                 | ✓                                   |
| `debug`                   | `debug`                  | ✓ same semantics (no erase, no throttle) |
| `exitOnCtrlC`             | `exitOnCtrlC`            | ✓ default `true`                    |
| `patchConsole`            | `patchConsole`           | ✓ default `true`, ref-counted across concurrent renders |
| `onRender(metrics)`       | `onRender(metrics)`      | ✓ metrics shape: `{frame, durationMs, lineCount, output}` |
| `isScreenReaderEnabled`   | `isScreenReaderEnabled`  | ✓ env: `INK_SCREEN_READER=true`     |
| `maxFps`                  | `maxFps`                 | ✓ default `30`                      |
| `kittyKeyboard`           | `kittyKeyboard`          | ⚠️ no auto-detect — must set `mode: 'enabled'` explicitly |
| `interactive`             | `interactive`            | ✓ auto-detected `isTTY && !isCi`    |
| `incrementalRendering`    | **not ported**           | ❌ gap                              |
| `alternateScreen`         | **not ported**           | ❌ gap — full-screen TUIs share the scroll buffer |
| `concurrent`              | n/a                      | Vue's scheduler is always async-batched |

### `Instance`

| ink                       | vue-ink                  | Status   |
|---------------------------|--------------------------|----------|
| `rerender(component)`     | `rerender(component)`    | ✓        |
| `unmount()`               | `unmount()`              | ✓        |
| `waitUntilExit()`         | `waitUntilExit()`        | ✓ — see hang gotcha below |
| `waitUntilRenderFlush()`  | `waitUntilRenderFlush()` | ✓        |
| `clear()`                 | `clear()`                | ✓        |
| `cleanup()`               | **removed**              | ⚠️ use `unmount()` — alias was removed in cleanup pass |

### Test helpers

| ink                                       | vue-ink                          | Status |
|-------------------------------------------|----------------------------------|--------|
| `renderToString(node, {columns?})`        | `renderToString(component, {columns?})` from `packages/vue-ink/test/helpers` | ✓ |
| `renderToStringAsync(...)`                | (same — already async-aware)     | ✓     |
| `renderAsync(...)` → TestInstance         | `renderReusable(component, opts)` → `{stdout, instance, flush, output, rawOutput}` | ✓ |
| `act(fn)` / `withAct(fn)`                 | `flush()` from `withSetup` / `renderReusable` | ✓ |
| Fake stdout EventEmitter                  | `createCaptureStream(columns?)` with `.frames` array | ✓ |
| Fixture + `node-pty` `term(fixture)`      | Same pattern — fixtures in `packages/vue-ink/test/fixtures/`, driven by node-pty | ✓ |

## Components in detail

### `<Box>`

53+ style props, identical names to ink (`width`, `height`, `padding*`,
`margin*`, `flex*`, `gap*`, `border*`, `position`, `display`, etc.).

Vue-ink-specific defaults:

```ts
{ flexWrap: 'nowrap', flexDirection: 'row', flexGrow: 0, flexShrink: 1 }
```

Same as ink. Provides `BACKGROUND_COLOR_INJECT_KEY` so a nested `<Text>`
inherits the parent's `backgroundColor` without re-passing the prop.

**Gaps**: `aria-label`, `aria-hidden`, `aria-role`, `aria-state` are
**not** wired through to the accessibility output tree yet. If your
ink app uses screen-reader hints, expect to leave those out for now.

### `<Text>`

Props: `color`, `backgroundColor`, `dimColor`, `bold`, `italic`,
`underline`, `strikethrough`, `inverse`, `wrap` (`'wrap' | 'truncate' |
'truncate-start' | 'truncate-middle' | 'truncate-end'`, default
`'wrap'`).

**Gaps**: no `aria-label` / `aria-hidden`. If your ink app passes
`aria-label` to substitute screen-reader content, you'll need a manual
conditional with `useIsScreenReaderEnabled()` until those props land.

**SFC gotcha**: Vue compiles `<template>` with whitespace normalization,
so multi-line text inside `<Text>` collapses to one line. Use
interpolation when you need newlines:

```vue
<!-- WRONG: collapses to one line -->
<Text>line one
line two</Text>

<!-- RIGHT -->
<Text>{{ `line one\nline two` }}</Text>
```

### `<Newline>`, `<Spacer>`, `<Transform>`

- `<Newline count?>` — must be inside `<Text>`. Renders `'\n'.repeat(count)`.
- `<Spacer>` — equivalent to `<Box flexGrow={1}>`. Trivial.
- `<Transform transform>` — `transform: (children: string, index: number) => string`.
  The `accessibilityLabel` prop from ink is not yet wired.

All three participate in the `INSIDE_TEXT_KEY` provide/inject system so
nested `<Text>`/`<Newline>`/`<Transform>` are rewritten to
`ink-virtual-text` automatically. See
[[../renderer/nested-text-must-be-virtual]].

### `<Static>`: not ported

If your ink app uses `<Static items children>` for a log-style "render
once then keep" region, you have three options:

1. **Use `useStdout().write(text)`** for one-shot lines that should
   appear above the live frame. ink's Static does more (re-renders only
   new items and stitches them above), but `write()` is the closest
   primitive.
2. **Move the static items into a sibling `<Box>` above the dynamic
   region.** Yoga handles re-layout cheaply, so for small lists this is
   fine.
3. **Wait or port it.** Static lives in `repos/ink/src/components/Static.tsx`
   — the contract is small. Replicating it in vue-ink means: provide
   internal `internal_static` on the Box, hook it into the reconciler
   resetAfterCommit phase. See ink's `reconciler.ts` for the
   `onStaticChange` / `onImmediateRender` ordering trick.

## Hooks → composables: the three shape changes

Internalise these three and the rest of the port is mechanical.

### 1. Subscription composables return a `Stop` function

ink's `useInput(handler)` returns `void` and detaches on unmount.
vue-ink's `useInput(handler)` returns `Stop = () => void` so imperative
callers (one-shot prompts, conditional handlers, route changes) can
detach without remounting the host component.

```ts
// ink
useInput((input, key) => { ... });

// vue-ink
const stop = useInput((input, key) => { ... });
// later: stop()
```

Applies to `useInput`, `usePaste`, `useFocus` (also auto-detaches on
scope dispose, so ignoring `Stop` is safe).

### 2. Reactive options take `MaybeRefOrGetter<T>`, not plain values

```ts
// ink — re-runs the hook when state.editing changes
useInput((input, key) => { ... }, { isActive: state.editing });

// vue-ink — all three forms work
useInput(handler, { isActive: true });                  // raw
useInput(handler, { isActive: editingRef });            // ref
useInput(handler, { isActive: () => state.editing });   // getter
```

Anti-pattern (we tried it, deleted it):
`typeof opt === 'object' ? opt.value : opt` — rejects getters. Use
`toValue(opt)` inside a `computed()`. See
[[../composables/vueuse-patterns]].

### 3. Return values are refs, not values

```ts
// ink — re-renders implicitly when terminal resizes
const {columns, rows} = useStdout();  // useStdout doesn't actually return these; useWindowSize does

// vue-ink — explicit reactivity
const {columns, rows} = useWindowSize();   // two ShallowRef<number>
// in template: {{ columns }}
// in script:  columns.value
```

`useWindowSize` returns **two `ShallowRef<number>`** (not one
`Ref<{columns, rows}>`). Two reasons:

- Deep reactivity on two numbers is wasted work.
- Destructuring auto-unwraps in templates — matches VueUse idioms.

This pattern applies broadly: `useIsScreenReaderEnabled() → Ref<boolean>`,
`useFocus() → { isFocused: ComputedRef<boolean>, focus }`,
`useAnimation() → { frame, time, delta: ShallowRef<number>, reset }`.

## Reactivity model translation

| ink                                            | vue-ink                                  |
|------------------------------------------------|------------------------------------------|
| `const [n, setN] = useState(0); setN(n + 1)`   | `const n = ref(0); n.value++`            |
| `useEffect(() => { ... }, [x])`                | `watch(x, () => { ... })`                |
| `useEffect(() => { ... }, [])` (mount-once)    | `onMounted(() => { ... })`               |
| `useEffect(() => { ... return cleanup }, [])`  | `onMounted` + `onBeforeUnmount(cleanup)` |
| `useLayoutEffect(...)`                         | `watchEffect(fn, { flush: 'sync' })` or `onMounted` with `nextTick` |
| `useMemo(() => compute, [deps])`               | `computed(() => compute)`                |
| `useCallback(fn, deps)`                        | Inline the function — no stale closure   |
| `useRef<T>(null)` + `.current =`               | `shallowRef<T>(null)` + `.value =`       |
| `forwardRef` / `useImperativeHandle`           | Just expose a method from setup          |

Re-renders are scheduled by Vue's queue, not by `setState` calls. A
synchronous burst of mutations coalesces into one frame naturally — no
`unstable_batchedUpdates` equivalent needed.

## Lifecycle gotchas (the ones that bite)

### Composables: `tryOnScopeDispose`, not `onBeforeUnmount`

Inside a composable, never reach for `onBeforeUnmount(stop)` — it only
works in component setup. Use `tryOnScopeDispose(stop)` from
`_internal` so the composable also runs inside `effectScope` (tests,
custom directives, shared composables).

User code in component setup can use `onBeforeUnmount` freely.

### `setInterval` keeps the event loop alive

```ts
// WRONG — process never exits
onMounted(() => {
  setInterval(() => { counter.value++ }, 100);
});

// RIGHT
let timer: NodeJS.Timeout | null = null;
onMounted(() => { timer = setInterval(...) });
onBeforeUnmount(() => { if (timer) clearInterval(timer) });
```

Same trap as React, but it surfaces more often in CLI apps because the
top-level component often runs the whole app lifetime.

### `waitUntilExit()` hangs without input handlers

If your top-level component has **no** `useInput` / `useApp` / paste
handler / focus hook, vue-ink never enables raw mode, so stdin stays
paused and `waitUntilExit()` never resolves. Two ways out:

1. Call `instance.unmount()` when the work is done (one-shot render).
2. Add `useInput((input, key) => { if (key.escape) useApp().exit() })`.

Same trap exists in ink but most apps mask it by mounting at least one
input hook.

### `requireContext` for required injections

`useApp()` / `useStdin()` / etc. throw if called outside `render()`.
They use `requireContext(KEY, 'useFoo()')` so the error message
includes the composable name — `expect(...).toThrow(/useFoo/)` is the
test assertion shape. Don't `inject(KEY)!` with a bang in new
composables; surface a real error.

### `useFocus` requires raw mode

`useFocus` enables raw mode while focused (so Tab cycling works) and
releases when unfocused. If `isRawModeSupported` is false (no TTY),
`useInput`/`useFocus` throw. Test fixtures must use `createFakeStdin({
isTTY: true, supportsRawMode: true })`.

## Reconciler landmines (renderer extensions only)

Skip this section if you're writing app code. These bite when adding
host elements or extending the renderer.

1. **Yoga child indices ≠ DOM child indices.** `v-for` compiles to a
   Fragment with a comment anchor; the anchor occupies a `childNodes`
   slot but no yoga slot. Use `toYogaIndex(childNodes, domIndex)` for
   any insert-at-anchor path. Append-to-end and remove-by-node are
   already safe. See [[../renderer/yoga-vs-dom-indices]].

2. **Nested `<Text>` must rewrite to `ink-virtual-text`.** Yoga aborts
   if you `insertChild` into a node with a measure function. ink does
   this rewrite in `hostContext` at `createInstance` time. Vue's
   `createRenderer` doesn't expose parent host there, so we do it at
   the **component layer** via `useTextHost()` (in
   `packages/components/src/text-context.ts`). Any new component that
   may emit `ink-text` must call `useTextHost()`. See
   [[../renderer/nested-text-must-be-virtual]].

3. **Don't use `readline.emitKeypressEvents`** for stdin parsing — it
   mangles meta, multi-byte unicode, and Shift+Tab. The three-layer
   pipeline (parser → keypress → manager) handles kitty, paste, and
   backspace-batching correctly. See [[../renderer/input-pipeline]].

4. **The output hot path is `Output.get()`, not yoga.** Yoga's dirty
   bits make `calculateLayout` free for clean subtrees. Frame budget
   lives in the stringify pass. Share an `EMPTY_CELL` sentinel, sparse
   rows, per-row write extent. See [[../renderer/output-hot-path]].

## Testing port

ink uses Ava + a fake stdout EventEmitter; vue-ink uses Vitest +
`createCaptureStream`. The patterns translate cleanly.

```ts
// pure render (ink uses { stdout: fakeStdout, debug: true })
const out = await renderToString(App, { columns: 80 });
expect(stripAnsi(out)).toBe('Hello world');
expect(out).toBe(chalk.green('Hello world'));  // chalk-as-oracle

// reusable render for rerender tests
const { instance, output, flush } = await renderReusable(App);
instance.rerender(NextApp);
await flush();
expect(output()).toMatch(/next/);
```

For composable unit tests, **don't use `defineComponent`**. Use
`withSetup(() => useFoo(), contexts)` from
`packages/renderer/src/composables/_test/with-setup.ts` — mounts the
composable in a real `effectScope`, exposes `{ result, unmount, flush
}`, re-throws setup errors so `expect(() =>
withSetup(...)).toThrow(/useFoo/)` works.

For interactive input tests, drive a fixture through `node-pty` — same
pattern as ink's `term(fixture)`. Fixtures live in
`packages/vue-ink/test/fixtures/`.

## SFC ergonomics

- **`*.vue` files need a loader** for `node --import=tsx`. See
  `examples/counter` for the minimal 30-line `vue-loader.ts` hooked via
  `--import`.
- **Whitespace inside `<template>` collapses** — interpolate multi-line
  strings (see `<Text>` section).
- **Falsy slot children produce comment vnodes** — that's how `v-if`
  anchors work. If you write `false && h(Text, ...)` you'll trip
  `no-constant-binary-expression` in oxlint; use bare `false`.
- **`:key` must be a primitive.** Passing a `ComputedRef` stringifies
  to `[object Object]`, so all items get the same key and Vue collides
  them. Use `.value` or a stable string/number.
- **`examples/` needs its own `tsconfig.json`** if you lint with
  oxlint — otherwise `node:*` imports and `*.vue` shims don't resolve.

## Common mistakes we made (so you don't have to)

Numbered, ordered by frequency of hitting them:

1. **`setInterval` without cleanup.** Event loop stays alive, process
   never exits. Always `clearInterval` in `onBeforeUnmount`.
2. **`:key="someComputedRef"` in `v-for`.** Stringifies to `[object
   Object]`; every row gets the same key; reactive updates corrupt
   focus/state. Use `.value` or a stable key.
3. **Returning `Ref<{columns, rows}>` from `useWindowSize`.** Deep
   reactivity for two numbers. Two `shallowRef<number>` is the move.
4. **`typeof opt === 'object' ? opt.value : opt` for reactive options.**
   Rejects getters. `toValue()` + `MaybeRefOrGetter` is the move.
5. **`onBeforeUnmount(stop)` inside a composable.** Breaks
   `effectScope` usage. `tryOnScopeDispose(stop)` is the move.
6. **`inject(KEY)!` with a bang.** Surfaces as a generic "cannot read
   properties of undefined" if the user forgot to mount under
   `render()`. `requireContext(KEY, 'useFoo()')` is the move.
7. **Reaching for `readline.emitKeypressEvents`.** Lost meta keys and
   Shift+Tab. Port ink's `parseKeypress` instead.
8. **Trying to do `isInsideText` rewriting in `createElement`.** Vue's
   renderer doesn't expose parent host there. Do it at the component
   layer via provide/inject + `useTextHost()`.
9. **Inserting `v-for` children at the DOM index.** Comment anchors
   live in DOM but not yoga; the indices diverge. Use `toYogaIndex`.
10. **Returning `void` from `useInput`.** Hard to detach imperatively.
    Return `Stop`.
11. **Allocating a fresh `StyledChar` per cell on every paint.** 80×1000
    frames × per-cell object = 80k allocations. Share `EMPTY_CELL`
    sentinel + sparse rows.
12. **Calling `waitUntilExit()` on a render with no input handlers.**
    Stdin never goes raw, process hangs. Unmount explicitly or wire up
    `useApp().exit()`.
13. **Re-implementing `renderToString` / fake-stdin in every test
    file.** Past audit found 6+ duplicate copies. Add new variants to
    `test/helpers.ts` instead.
14. **Mounting composables under `defineComponent` in tests.** Half
    the boilerplate gone if you use `withSetup`.
15. **Inline multi-line template literals inside `<Text>`.** Vue
    template whitespace eats newlines. Interpolate.
16. **TDZ (temporal dead zone) in `render.ts`.** Hoisted helpers and
    reference order matters more than in React because Vue's
    `createRenderer` is invoked once at module load. Initialize state
    before passing it into the renderer config.
17. **Using `++` anywhere oxlint can see it.** `no-plusplus` is on. Use
    `x += 1` (we have many lint rules that React-flavoured code trips —
    `no-param-reassign`, `prefer-template`, etc.).
18. **Forgetting `flushVueOnly()` vs `flush()` in tests.**
    `flushVueOnly` drains Vue's microtask queue only; `flush` also
    waits out the paint throttle window. Pick the right one based on
    what you're asserting.

## What's NOT yet ported (gaps you'll hit)

If your ink app uses any of these, plan for a workaround or a
contribution:

- **`<Static>` component** — no log-style write-once region. Workaround:
  `useStdout().write()` for ephemeral above-the-fold lines.
- **`useCursor()`** — no API to position cursor for IME / inline
  editing affordances.
- **`useBoxMetrics(ref)`** — no per-Box measured layout introspection.
  If you need this, you'd reach into the renderer directly.
- **`aria-*` props on Box/Text/Transform** — accessibility tree not
  wired through. `useIsScreenReaderEnabled()` works as a manual
  fallback.
- **`alternateScreen: true` in `RenderOptions`** — full-screen TUIs
  share the scrollback buffer. Significant gap for editor-style apps.
- **`incrementalRendering: true`** — paint always redraws full diff
  region rather than incremental line updates.
- **Kitty keyboard auto-detect** — `mode: 'auto'` doesn't query the
  terminal yet. Set `mode: 'enabled'` explicitly if you want kitty
  semantics.
- **Concurrent / Suspense semantics** — n/a; Vue's scheduler is
  always-async-batched. If your ink app relied on Suspense for
  resource loading, refactor to plain `async setup()` + a fallback
  ref.
- **Signal forwarding for user code** — SIGINT/SIGTERM auto-unmount;
  no `onSignal` hook to intercept before cleanup.

## When in doubt: read the real source

The reference repos are vendored read-only at:

- `repos/ink/` — the React ink we're porting from. Grep here for
  hook/prop signatures, undocumented behaviors, env-var checks.
- `repos/core/` — Vue 3 reactivity + runtime-core. Useful when
  debugging scheduler/reactivity surprises.
- `repos/vueuse/` — canonical composable conventions. Mirror these
  ([[../composables/vueuse-patterns]]).

Don't guess from training data — these are the ground truth.

## Related

- [[../composables/vueuse-patterns]] — full composable conventions and
  anti-pattern table.
- [[../testing/ink-strategy]] — the ink testing surface this borrows
  from.
- [[../renderer/yoga-vs-dom-indices]],
  [[../renderer/nested-text-must-be-virtual]],
  [[../renderer/output-hot-path]],
  [[../renderer/input-pipeline]] — reconciler/renderer landmines.
- [[../principles/encode-lessons-in-structure]] — why these gotchas
  are encoded into folder structure (composables/, `_test/`) rather
  than just docs.
