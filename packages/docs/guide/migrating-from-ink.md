# Migrating from Ink

For React developers porting an existing [Ink](https://github.com/vadimdemedes/ink) app to vue-ink, or anyone curious how the two surfaces line up. The component layer is intentionally 1:1, so most templates translate directly. The reactivity model, lifecycle hooks, and a handful of composable shapes are where you have to slow down and re-learn the idiom.

If you just want the flat checklist (everything ink ships → its vue-ink equivalent, with status), see the [Ink → vue-ink parity](/reference/ink-parity) reference. This page is the field guide.

## Mental model at a glance

| ink (React)                                    | vue-ink                                  |
|------------------------------------------------|------------------------------------------|
| `useState` / `setState`                        | `ref` / assignment                       |
| `useEffect(fn, deps)`                          | `watch(deps, fn)`                        |
| `useEffect(fn, [])` (mount-once)               | `onMounted(fn)`                          |
| `useEffect(fn, []) → return cleanup`           | `onMounted` + `onBeforeUnmount(cleanup)` |
| `useLayoutEffect`                              | `watchEffect(fn, { flush: 'sync' })`     |
| `useMemo`                                      | `computed`                               |
| `useRef`                                       | `shallowRef` (or plain `let` in setup)   |
| `useCallback`                                  | Just inline — no stale-closure problem   |
| JSX                                            | SFC `<template>` or `h(...)` render fn   |
| Concurrent Mode / Suspense                     | n/a (Vue's scheduler is always batched)  |

Re-renders are scheduled by Vue's queue, not by `setState` calls. A synchronous burst of mutations coalesces into one frame naturally — no `unstable_batchedUpdates` equivalent needed. See [How it works](./how-it-works) for the full pipeline.

## Components map straight across

`<Box>`, `<Text>`, `<Newline>`, `<Spacer>`, `<Static>`, `<Transform>` exist in vue-ink with the same prop names. The 53+ flexbox props on `<Box>` (`flexDirection`, `padding`, `borderStyle`, etc.) and the style props on `<Text>` (`color`, `bold`, `wrap`, etc.) are identical.

See the [components reference](/api/components) for the full surface.

**`<template>` whitespace collapses.** Multi-line text inside `<Text>` becomes one line. Interpolate when you need newlines:

```vue
<!-- WRONG: collapses to one line -->
<Text>line one
line two</Text>

<!-- RIGHT -->
<Text>{{ `line one\nline two` }}</Text>
```

## Composables: three shape changes

The hook → composable mapping is mechanical *except* for these three patterns. Internalise them and the rest falls into place.

### 1. Subscription composables return a `Stop` function

ink's `useInput(handler)` returns `void` and auto-detaches on unmount. vue-ink returns `Stop = () => void` so imperative callers (one-shot prompts, conditional handlers, route changes) can detach without remounting the host component. Auto-detach on scope dispose still happens, so ignoring the return is safe.

::: code-group

```tsx [Ink (React)]
import { useInput } from 'ink'

useInput((input, key) => {
	if (key.escape) {
		// handle escape
	}
})
```

```ts [vue-ink]
import { useInput } from 'vueink'

const stop = useInput((input, key) => {
	if (key.escape) {
		// handle escape
	}
})

// later, to detach imperatively:
stop()
```

:::

Applies to `useInput`, `usePaste`, `useFocus`.

### 2. Reactive options take `MaybeRefOrGetter<T>`, not plain values

In ink you pass current state and the hook re-runs when state changes. In vue-ink you pass a value, a `Ref`, or a getter — all three work, and the composable tracks reactivity itself.

::: code-group

```tsx [Ink (React)]
import { useInput } from 'ink'
import { useState } from 'react'

const [editing, setEditing] = useState(false)

useInput(
	(input, key) => { /* ... */ },
	{ isActive: editing },
)
```

```ts [vue-ink]
import { useInput } from 'vueink'
import { ref } from 'vue'

const editing = ref(false)

// All three forms work:
useInput(handler, { isActive: true })                  // raw value
useInput(handler, { isActive: editing })               // ref
useInput(handler, { isActive: () => editing.value })   // getter
```

:::

Anti-pattern (don't reach for this): `typeof opt === 'object' ? opt.value : opt`. It rejects getters. Use `toValue(opt)` inside a `computed()` — see [vueuse patterns](https://vueuse.org/) for the conventions vue-ink follows.

### 3. Return values are refs, not values

::: code-group

```tsx [Ink (React)]
import { useStdout } from 'ink'

// columns/rows live on stdout; React re-renders implicitly on resize
const { stdout } = useStdout()
const { columns, rows } = stdout
```

```ts [vue-ink]
import { useWindowSize } from 'vueink'

const { columns, rows } = useWindowSize()
// In templates:  {{ columns }} × {{ rows }}
// In script:     columns.value × rows.value
```

:::

`useWindowSize()` returns two `ShallowRef<number>`, not one `Ref<{columns, rows}>`. Two shallow refs avoid deep-reactivity overhead on two primitives and destructure cleanly in templates.

This pattern is broad:

- `useIsScreenReaderEnabled() → Ref<boolean>`
- `useFocus() → { isFocused: ComputedRef<boolean>, focus }`
- `useAnimation() → { frame, time, delta: ShallowRef<number>, reset }`
- `useBoxMetrics() → { width, height, left, top, hasMeasured }` (all `ShallowRef`)

## Hooks → composables: the map

| ink                          | vue-ink                                       | Notes                                                                                                                |
|------------------------------|-----------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `useApp()`                   | [`useApp()`](/api/composables#useapp)         | Same `{ exit, waitUntilRenderFlush }`                                                                                |
| `useStdin()`                 | [`useStdin()`](/api/composables#stdio)        | `{ stdin, isRawModeSupported, setRawMode, setBracketedPasteMode }` — no `internal_eventEmitter`                      |
| `useStdout()`                | [`useStdout()`](/api/composables#stdio)       | `{ stdout, write }`                                                                                                  |
| `useStderr()`                | [`useStderr()`](/api/composables#stdio)       | `{ stderr, write }`                                                                                                  |
| `useInput(fn, opts)`         | [`useInput(fn, opts) → Stop`](/api/composables#useinput) | Shape changes 1 and 2                                                                                                |
| `usePaste(fn, opts)`         | [`usePaste(fn, opts) → Stop`](/api/composables#usepaste) | Shape changes 1 and 2                                                                                                |
| `useFocus({...})`            | [`useFocus({...})`](/api/composables#focus)   | Returns `{ isFocused: ComputedRef<boolean>, focus }`                                                                 |
| `useFocusManager()`          | [`useFocusManager()`](/api/composables#focus) | Adds `activeId: Ref<string>`                                                                                         |
| `useWindowSize()`            | [`useWindowSize()`](/api/composables#usewindowsize) | Returns two `ShallowRef<number>`                                                                                     |
| `useIsScreenReaderEnabled()` | [`useIsScreenReaderEnabled()`](/api/composables#screen-reader) | Returns `Ref<boolean>`                                                                                               |
| `useAnimation({...})`        | [`useAnimation({...})`](/api/composables#useanimation) | Returns four `ShallowRef`s + `reset`                                                                                 |
| `useCursor()`                | [`useCursor()`](/api/composables#usecursor)   | Returns `{ setCursorPosition }`                                                                                      |
| `useBoxMetrics(ref)`         | [`useBoxMetrics(ref)`](/api/composables#useboxmetrics) | Returns reactive `{ width, height, left, top, hasMeasured }`. Reactive sibling of [`measureElement`](/api/measure-element). |

The full ink-parity status (including shape-change ⚠️ markers) lives in the [parity reference](/reference/ink-parity).

## Top-level API

| ink                                  | vue-ink                                                            |
|--------------------------------------|--------------------------------------------------------------------|
| `render(tree, options?)`             | [`render(component, options?)`](/api/render)                        |
| `renderToString(tree, options?)`     | [`renderToString(component, options?)`](/api/render-to-string)      |
| `measureElement(ref)`                | [`measureElement(ref)`](/api/measure-element)                       |

The `Instance` returned by `render()` exposes `rerender`, `unmount`, `waitUntilExit`, `waitUntilRenderFlush`, `clear`, and `cleanup` (alias of `unmount()`, kept for ink parity). `RenderOptions` covers `stdout`, `stdin`, `stderr`, `debug`, `exitOnCtrlC`, `patchConsole`, `onRender`, `isScreenReaderEnabled`, `maxFps`, `incrementalRendering`, `interactive`, `alternateScreen`, and `kittyKeyboard` — same names and defaults as ink. The only React-only knob without an equivalent is `concurrent`, because Vue's scheduler is always async-batched.

## Lifecycle gotchas (the ones that bite)

### `setInterval` keeps the event loop alive

Same trap as React, but it surfaces more often in CLI apps because the top-level component often runs the whole app lifetime. Always pair `setInterval` with `clearInterval` in `onBeforeUnmount`:

```ts
import { onMounted, onBeforeUnmount, ref } from 'vue'

const counter = ref(0)
let timer: NodeJS.Timeout | null = null

onMounted(() => {
	timer = setInterval(() => { counter.value += 1 }, 100)
})

onBeforeUnmount(() => {
	if (timer) clearInterval(timer)
})
```

### `waitUntilExit()` hangs without input handlers

If your top-level component has **no** `useInput` / `useApp` / paste handler / focus composable, vue-ink never enables raw mode, so stdin stays paused and `waitUntilExit()` never resolves. Two ways out:

1. Call `instance.unmount()` when work is done (one-shot render — see [render API](/api/render)).
2. Add an input handler that calls `useApp().exit()`.

```ts
import { useApp, useInput } from 'vueink'

const { exit } = useApp()
useInput((_, key) => { if (key.escape) exit() })
```

Same trap exists in ink — most apps mask it by mounting at least one input composable.

### `useFocus` requires raw mode

`useFocus` enables raw mode while focused (so Tab cycling works) and releases when unfocused. If `isRawModeSupported` is false (no TTY), `useInput` / `useFocus` throw — **but only when they actually try to attach**. `useInput(h, { isActive: false })` on a non-TTY stdin is a no-op (matches ink). The throw fires lazily inside the attach path, so a `Ref`/getter `isActive` that's false at mount but flips true later will throw at flip time. Test fixtures that need a guaranteed-not-throw path can pin `isActive: false` regardless of TTY support — see [testing](./testing) for the patterns.

### `tryOnScopeDispose` inside composables, `onBeforeUnmount` in setup

In **component setup**, use `onBeforeUnmount` freely. Inside a **composable**, never reach for `onBeforeUnmount(stop)` — it only works in component setup. Use `tryOnScopeDispose(stop)` so the composable also runs inside a manual `effectScope` (tests, custom directives, shared composables).

### `:key` and `ComputedRef`

A `ComputedRef` stringifies to `[object Object]`, so every `v-for` row gets the same key, focus and reactive state get scrambled. Always use `.value` or a stable primitive:

```vue
<template>
	<!-- WRONG -->
	<Box v-for="item in items" :key="item.idComputed"><Text>{{ item.name }}</Text></Box>

	<!-- RIGHT -->
	<Box v-for="item in items" :key="item.idComputed.value"><Text>{{ item.name }}</Text></Box>
</template>
```

## What's not yet ported

- **Concurrent / Suspense semantics** — Vue's scheduler is always async-batched. If your ink app relied on Suspense for resource loading, refactor to `async setup()` + a fallback ref.
- **`useTransition` / `useDeferredValue`** — manage with `ref` + a `watch` debounce/throttle.
- **`forwardRef` / `useImperativeHandle`** — just `defineExpose({...})` from `<script setup>` (or `expose({...})` from a render-function setup).
- **Signal forwarding for user code** — `SIGINT`/`SIGTERM` auto-unmount, but there's no `onSignal` composable to intercept before cleanup.

## Testing port

ink uses Ava + a fake stdout `EventEmitter`. vue-ink uses Vitest + a capture stream. The patterns translate cleanly — see the [testing guide](./testing) for the full surface (`render`, `lastFrame`, `frames`, fake stdin, `renderToString`, fixtures + `node-pty`).

```ts
// pure render
import { renderToString } from 'vueink'
import stripAnsi from 'strip-ansi'

const out = await renderToString(App, { columns: 80 })
expect(stripAnsi(out)).toBe('Hello world')
```

## SFC ergonomics

- **`*.vue` files need a loader** for `node --import=tsx`. See [SFC setup](./sfc-setup) for the minimal pattern used in `examples/counter`.
- **Whitespace inside `<template>` collapses** — interpolate multi-line strings (see the `<Text>` note above).
- **Falsy slot children produce comment vnodes** — that's how `v-if` anchors work.

## Next steps

- [Getting started](./getting-started) — install and the hello-world example.
- [How it works](./how-it-works) — the renderer pipeline from first principles.
- [Ink → vue-ink parity](/reference/ink-parity) — the flat status checklist.
- [API reference](/api/render) — every public function and component.
