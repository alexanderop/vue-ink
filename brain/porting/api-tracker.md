# React Ink → vue-ink API tracker

Item-by-item map of the public React Ink surface (v7.0.3 readme) to
what vue-ink ships today. Companion to [[from-react-ink]] — that file
explains *how* to translate idioms; this one is the flat checklist.

Verified on 2026-05-15 against `repos/ink/` and `packages/*/src/`.

Legend:

- ✅ shipped
- ⚠️ shipped with shape change
- 🟡 partial — works in tests, not exposed publicly
- ❌ not implemented
- 🚫 not applicable (React-only concept)

---

## Components

| ink           | vue-ink       | Status | Where                                            |
|---------------|---------------|--------|--------------------------------------------------|
| `<Text>`      | `Text`        | ✅     | `packages/components/src/Text.ts`                |
| `<Box>`       | `Box`         | ✅     | `packages/components/src/Box.ts`                 |
| `<Newline>`   | `Newline`     | ✅     | `packages/components/src/Newline.ts`             |
| `<Spacer>`    | `Spacer`      | ✅     | `packages/components/src/Spacer.ts`              |
| `<Static>`    | `Static`      | ✅     | `packages/components/src/Static.ts`              |
| `<Transform>` | `Transform`   | ✅     | `packages/components/src/Transform.ts`           |

### `<Text>` props

`color`, `backgroundColor`, `dimColor`, `bold`, `italic`, `underline`,
`strikethrough`, `inverse`, `wrap` — all ✅ in `Text.ts:21-45`.

ARIA: `aria-label` ✅, `aria-hidden` ✅
(wired through [[../renderer/screen-reader]]).

### `<Box>` props

All 53+ style props implemented (`Box.ts:23-95`):

- Dimensions: `width`, `height`, `minWidth`, `minHeight`, `maxWidth`,
  `maxHeight`, `aspectRatio` ✅
- Padding: `padding`, `paddingX/Y/Top/Bottom/Left/Right` ✅
- Margin: `margin`, `marginX/Y/Top/Bottom/Left/Right` ✅
- Gap: `gap`, `columnGap`, `rowGap` ✅
- Flex: `flexGrow`, `flexShrink`, `flexBasis`, `flexDirection`,
  `flexWrap`, `alignItems`, `alignSelf`, `alignContent`,
  `justifyContent` ✅
- Position: `position`, `top`, `right`, `bottom`, `left` ✅
- Visibility: `display`, `overflow`, `overflowX`, `overflowY` ✅
- Borders: `borderStyle`, `borderColor`, `border{Top,Right,Bottom,Left}Color`,
  `borderDimColor`, `border{Top,Right,Bottom,Left}DimColor`,
  `borderBackgroundColor`, `border{Top,Right,Bottom,Left}BackgroundColor`,
  `border{Top,Right,Bottom,Left}` toggles ✅
- Background: `backgroundColor` ✅

ARIA: `aria-label`, `aria-hidden`, `aria-role`, `aria-state` ✅
(via `internal_accessibility` on the host `ink-box`).

### `<Newline>`, `<Spacer>`

- `<Newline count?>` ✅ — must be inside `<Text>`.
- `<Spacer>` ✅ — equivalent to `<Box flexGrow={1}>`.

### `<Static>`

- `items`, `style`, slot signature `(item, index)` ✅
- Renderer-side dedup, not component-side. See
  [[../renderer/static-dedup]].

### `<Transform>`

- `transform: (line, index) => string` ✅
- Plus `accessibilityLabel` (vue-ink extension) replaces transformed
  visual output in screen-reader mode.

---

## Hooks → composables

| ink                          | vue-ink                          | Status | Where                                                       |
|------------------------------|----------------------------------|--------|-------------------------------------------------------------|
| `useInput`                   | `useInput`                       | ⚠️     | `packages/renderer/src/composables/useInput/`               |
| `usePaste`                   | `usePaste`                       | ⚠️     | `packages/renderer/src/composables/usePaste/`               |
| `useApp`                     | `useApp`                         | ✅     | `packages/renderer/src/composables/useApp/`                 |
| `useStdin`                   | `useStdin`                       | ✅     | `packages/renderer/src/composables/useStdin/`               |
| `useStdout`                  | `useStdout`                      | ✅     | `packages/renderer/src/composables/useStdout/`              |
| `useStderr`                  | `useStderr`                      | ✅     | `packages/renderer/src/composables/useStderr/`              |
| `useBoxMetrics`              | `useBoxMetrics`                  | ✅     | `packages/renderer/src/composables/useBoxMetrics/`          |
| `useWindowSize`              | `useWindowSize`                  | ⚠️     | `packages/renderer/src/composables/useWindowSize/`          |
| `useFocus`                   | `useFocus`                       | ⚠️     | `packages/renderer/src/composables/useFocus/`               |
| `useFocusManager`            | `useFocusManager`                | ✅     | `packages/renderer/src/composables/useFocusManager/`        |
| `useCursor`                  | `useCursor`                      | ✅     | `packages/renderer/src/composables/useCursor/`              |
| `useAnimation`               | `useAnimation`                   | ✅     | `packages/renderer/src/composables/useAnimation/`           |
| `useIsScreenReaderEnabled`   | `useIsScreenReaderEnabled`       | ⚠️     | `packages/renderer/src/composables/useIsScreenReaderEnabled/` |

Shape changes (the ⚠️ rows — none are missing features):

- `useInput` / `usePaste` return a `Stop` function and accept
  `MaybeRefOrGetter<T>` options.
- `useWindowSize()` returns two `ShallowRef<number>` instead of one
  object.
- `useFocus()` returns `{ isFocused: ComputedRef<boolean>, focus }`.
- `useIsScreenReaderEnabled()` returns `Ref<boolean>`.

Details in [[from-react-ink#hooks-composables-the-three-shape-changes]].

### Key flags on `useInput`'s `key` argument

| flag                                                              | Status |
|-------------------------------------------------------------------|--------|
| `leftArrow`, `rightArrow`, `upArrow`, `downArrow`                 | ✅     |
| `return`, `escape`, `tab`, `backspace`, `delete`                  | ✅     |
| `ctrl`, `shift`, `meta`                                           | ✅     |
| `pageUp`, `pageDown`, `home`, `end`                               | ✅     |
| `super`, `hyper`, `capsLock`, `numLock` (kitty only)              | ✅     |
| `eventType: 'press' \| 'repeat' \| 'release'` (kitty only)        | ✅     |

---

## Top-level API

| ink                                  | vue-ink                                 | Status | Where                                       |
|--------------------------------------|-----------------------------------------|--------|---------------------------------------------|
| `render(tree, options?)`             | `render(component, options?)`           | ✅     | `packages/renderer/src/render.ts`           |
| `renderToString(tree, options?)`     | `renderToString(component, options?)`   | ✅     | `packages/renderer/src/renderToString.ts`; re-exported from `@vue-ink/vue-ink` |
| `measureElement(ref)`                | `measureElement(ref)`                   | ✅     | `packages/renderer/src/measureElement.ts`; re-exported from `@vue-ink/vue-ink`. Reactive sibling stays available as `useBoxMetrics(ref)` |

### `Instance` methods

| ink                          | vue-ink                  | Status |
|------------------------------|--------------------------|--------|
| `rerender(component)`        | `rerender(component)`    | ✅     |
| `unmount()`                  | `unmount()`              | ✅     |
| `waitUntilExit()`            | `waitUntilExit()`        | ✅     |
| `waitUntilRenderFlush()`     | `waitUntilRenderFlush()` | ✅     |
| `clear()`                    | `clear()`                | ✅     |
| `cleanup()`                  | —                        | ❌     | alias removed; call `unmount()` |

### `RenderOptions`

| ink                       | vue-ink                  | Status |
|---------------------------|--------------------------|--------|
| `stdout`                  | `stdout`                 | ✅     |
| `stdin`                   | `stdin`                  | ✅     |
| `stderr`                  | `stderr`                 | ✅     |
| `debug`                   | `debug`                  | ✅     |
| `exitOnCtrlC`             | `exitOnCtrlC`            | ✅     |
| `patchConsole`            | `patchConsole`           | ✅     |
| `onRender`                | `onRender`               | ✅     |
| `isScreenReaderEnabled`   | `isScreenReaderEnabled`  | ✅     |
| `maxFps`                  | `maxFps`                 | ✅     |
| `incrementalRendering`    | `incrementalRendering`   | ✅     |
| `interactive`             | `interactive`            | ✅     |
| `alternateScreen`         | `alternateScreen`        | ✅     |
| `kittyKeyboard`           | `kittyKeyboard`          | ✅     |
| `concurrent`              | —                        | 🚫     | Vue's scheduler is always async-batched; React Suspense/Concurrent semantics don't translate |

### `renderToString` options

| ink                       | vue-ink                  | Status |
|---------------------------|--------------------------|--------|
| `columns`                 | `columns`                | ✅     |
| —                         | `isScreenReaderEnabled`  | ✅     | vue-ink extension; mirrors the `render()` option |

---

## Screen reader / ARIA

| ink prop                  | vue-ink            | Status |
|---------------------------|--------------------|--------|
| `aria-label`              | `aria-label`       | ✅     |
| `aria-hidden`             | `aria-hidden`      | ✅     |
| `aria-role`               | `aria-role`        | ✅     |
| `aria-state`              | `aria-state`       | ✅     |

Supported roles (Box): `button`, `checkbox`, `combobox`, `list`,
`listbox`, `listitem`, `menu`, `menuitem`, `option`, `progressbar`,
`radio`, `radiogroup`, `tab`, `tablist`, `table`, `textbox`, `timer`,
`toolbar` — all wired through the SR walker (see
[[../renderer/screen-reader]]).

Supported `aria-state` flags: `busy`, `checked`, `disabled`,
`expanded`, `multiline`, `multiselectable`, `readonly`, `required`,
`selected` ✅.

---

## Testing

| ink-testing-library              | vue-ink equivalent                     | Status | Where                                     |
|----------------------------------|----------------------------------------|--------|-------------------------------------------|
| `render(node)` (fake stdout)     | `render(component)`                    | ✅     | `packages/testing-library/src/index.ts`   |
| `lastFrame()`                    | `lastFrame()`                          | ✅     |                                           |
| `frames`                         | `frames`                               | ✅     |                                           |
| `rerender` / `unmount`           | `rerender` / `unmount`                 | ✅     |                                           |
| `cleanup()`                      | `cleanup()`                            | ✅     |                                           |
| `stdin.write(...)`               | `stdin.write(...)`                     | ✅     |                                           |
| (no equivalent)                  | `waitUntilFlush()` (Vue scheduler nextTick) | ✅     | vue-ink addition                          |

---

## React-only concepts (won't be ported)

These exist for React reasons and have no vue-ink analogue:

- **React Devtools integration** — vue-ink doesn't ship a devtools
  bridge. The Vue equivalent would be `@vue/devtools`; no work has
  been done here.
- **`concurrent: true`** — Vue's scheduler is always batched, no opt-in.
- **`Suspense`** — use `async setup()` + a fallback ref instead.
- **`useTransition`, `useDeferredValue`** — Vue has no equivalent;
  manage with `ref` + `watch` debounce/throttle.
- **`forwardRef` / `useImperativeHandle`** — just `expose({...})` from
  setup.

---

## Gaps worth filling (ranked by likely demand)

1. **Devtools** — long-tail; revisit only when users ask.

---

## Related

- [[from-react-ink]] — porting field notes; idiom translation, lifecycle
  gotchas, common mistakes.
- [[../composables/vueuse-patterns]] — composable conventions.
- [[../testing/ink-strategy]] — testing-library design.
- [[../renderer/screen-reader]] — aria-* walker contract.
