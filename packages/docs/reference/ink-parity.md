# Ink → vue-ink parity

Item-by-item map of the public React Ink surface (v7.0.3 readme) to what vue-ink ships today.

Verified on 2026-05-15.

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

`color`, `backgroundColor`, `dimColor`, `bold`, `italic`, `underline`, `strikethrough`, `inverse`, `wrap` — all ✅.

ARIA: `aria-label` ✅, `aria-hidden` ✅.

### `<Box>` props

All 53+ style props implemented:

- Dimensions: `width`, `height`, `minWidth`, `minHeight`, `maxWidth`, `maxHeight`, `aspectRatio` ✅
- Padding: `padding`, `paddingX/Y/Top/Bottom/Left/Right` ✅
- Margin: `margin`, `marginX/Y/Top/Bottom/Left/Right` ✅
- Gap: `gap`, `columnGap`, `rowGap` ✅
- Flex: `flexGrow`, `flexShrink`, `flexBasis`, `flexDirection`, `flexWrap`, `alignItems`, `alignSelf`, `alignContent`, `justifyContent` ✅
- Position: `position`, `top`, `right`, `bottom`, `left` ✅
- Visibility: `display`, `overflow`, `overflowX`, `overflowY` ✅
- Borders: `borderStyle`, `borderColor`, `border{Top,Right,Bottom,Left}Color`, `borderDimColor`, `border{Top,Right,Bottom,Left}DimColor`, `borderBackgroundColor`, `border{Top,Right,Bottom,Left}BackgroundColor`, `border{Top,Right,Bottom,Left}` toggles ✅
- Background: `backgroundColor` ✅

ARIA: `aria-label`, `aria-hidden`, `aria-role`, `aria-state` ✅.

### `<Newline>`, `<Spacer>`

- `<Newline count?>` ✅ — must be inside `<Text>`.
- `<Spacer>` ✅ — equivalent to `<Box flexGrow={1}>`.

### `<Static>`

- `items`, `style`, slot signature `(item, index)` ✅
- Renderer-side dedup, not component-side.

### `<Transform>`

- `transform: (line, index) => string` ✅
- Plus `accessibilityLabel` (vue-ink extension) replaces transformed visual output in screen-reader mode.

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

Shape changes (none missing features):

- `useInput` / `usePaste` return a `Stop` function and accept `MaybeRefOrGetter<T>` options.
- `useWindowSize()` returns two `ShallowRef<number>` instead of one object.
- `useFocus()` returns `{ isFocused: ComputedRef<boolean>, focus }`.
- `useIsScreenReaderEnabled()` returns `Ref<boolean>`.

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

| ink                                  | vue-ink                                 | Status |
|--------------------------------------|-----------------------------------------|--------|
| `render(tree, options?)`             | `render(component, options?)`           | ✅     |
| `renderToString(tree, options?)`     | `renderToString(component, options?)`   | ✅     |
| `measureElement(ref)`                | `measureElement(ref)`                   | ✅     |

### `Instance` methods

| ink                          | vue-ink                  | Status |
|------------------------------|--------------------------|--------|
| `rerender(component)`        | `rerender(component)`    | ✅     |
| `unmount()`                  | `unmount()`              | ✅     |
| `waitUntilExit()`            | `waitUntilExit()`        | ✅     |
| `waitUntilRenderFlush()`     | `waitUntilRenderFlush()` | ✅     |
| `clear()`                    | `clear()`                | ✅     |
| `cleanup()`                  | —                        | ❌ — alias removed; call `unmount()` |

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
| `concurrent`              | —                        | 🚫 — Vue's scheduler is always async-batched; React Suspense/Concurrent semantics don't translate |

### `renderToString` options

| ink                       | vue-ink                  | Status |
|---------------------------|--------------------------|--------|
| `columns`                 | `columns`                | ✅     |
| —                         | `isScreenReaderEnabled`  | ✅ vue-ink extension; mirrors the `render()` option |

---

## Screen reader / ARIA

| ink prop                  | vue-ink            | Status |
|---------------------------|--------------------|--------|
| `aria-label`              | `aria-label`       | ✅     |
| `aria-hidden`             | `aria-hidden`      | ✅     |
| `aria-role`               | `aria-role`        | ✅     |
| `aria-state`              | `aria-state`       | ✅     |

Supported roles (Box): `button`, `checkbox`, `combobox`, `list`, `listbox`, `listitem`, `menu`, `menuitem`, `option`, `progressbar`, `radio`, `radiogroup`, `tab`, `tablist`, `table`, `textbox`, `timer`, `toolbar`.

Supported `aria-state` flags: `busy`, `checked`, `disabled`, `expanded`, `multiline`, `multiselectable`, `readonly`, `required`, `selected` ✅.

---

## Testing

| ink-testing-library              | vue-ink equivalent                     | Status |
|----------------------------------|----------------------------------------|--------|
| `render(node)` (fake stdout)     | `render(component)`                    | ✅     |
| `lastFrame()`                    | `lastFrame()`                          | ✅     |
| `frames`                         | `frames`                               | ✅     |
| `rerender` / `unmount`           | `rerender` / `unmount`                 | ✅     |
| `cleanup()`                      | `cleanup()`                            | ✅     |
| `stdin.write(...)`               | `stdin.write(...)`                     | ✅     |
| (no equivalent)                  | `waitUntilFlush()` — Vue scheduler nextTick | ✅ vue-ink addition |

---

## React-only concepts (won't be ported)

- **React Devtools integration** — ported via `@vue/devtools` instead of `react-devtools-core`. See Devtools below.
- **`concurrent: true`** — Vue's scheduler is always batched, no opt-in.
- **`Suspense`** — use `async setup()` + a fallback ref instead.
- **`useTransition`, `useDeferredValue`** — Vue has no equivalent; manage with `ref` + `watch` debounce/throttle.
- **`forwardRef` / `useImperativeHandle`** — just `expose({...})` from setup.

---

## Devtools

Opt-in Vue DevTools bridge mirroring ink's `react-devtools-core` integration. Set `DEV=true`, install `@vue/devtools` as a dev dependency in your project, run the standalone GUI, and the Components panel shows a live tree of your terminal app.

| ink                                 | vue-ink                              | Status |
|-------------------------------------|--------------------------------------|--------|
| `DEV=true` + `react-devtools-core`  | `DEV=true` + `@vue/devtools`         | ✅     |
| `npx react-devtools` (port 8097)    | `pnpm dlx @vue/devtools` (port 8098) | ✅     |

`@vue/devtools` is an **optional peer dep** — consumers install it themselves (`pnpm add -D @vue/devtools`). If unset or missing the loader no-ops; no install cost for users who don't want devtools.

Caveats: DOM Elements panel can't render `ink-box`/`ink-text` host nodes (not HTML); use the Components tab. Composables surface as setup state on the owning component, not a separate "Hooks" panel.
