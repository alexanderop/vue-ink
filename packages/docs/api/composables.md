# Composables

All composables are re-exported from `vueink`:

```ts
import { useApp, useInput, useFocus, useStdin /* … */ } from 'vueink'
```

They mirror Ink's hooks. A few have shape changes to fit Vue idioms — flagged below.

## useInput

Subscribe to keyboard input.

```ts
import { useInput } from 'vueink'

useInput((input, key) => {
	if (key.escape) {
		// dismiss
	}
	if (input === 'q') {
		// quit
	}
})
```

The handler can be `MaybeRefOrGetter` so it reacts to state:

```ts
const enabled = ref(true)
useInput(handler, { isActive: enabled })
```

### `key` flags

`leftArrow`, `rightArrow`, `upArrow`, `downArrow`, `return`, `escape`, `tab`, `backspace`, `delete`, `ctrl`, `shift`, `meta`, `pageUp`, `pageDown`, `home`, `end`.

With the kitty keyboard protocol enabled (`render(App, { kittyKeyboard: true })`): `super`, `hyper`, `capsLock`, `numLock`, plus `eventType: 'press' | 'repeat' | 'release'`.

### Shape change vs ink

`useInput` returns a `Stop` function — call it to detach the handler imperatively. Ink relies on React unmount; Vue's `onScopeDispose` handles that automatically, but the explicit `Stop` covers cases where you want to detach without unmounting.

---

## usePaste

Subscribe to multi-character paste events (uses bracketed-paste mode when supported).

```ts
import { usePaste } from 'vueink'

usePaste((text) => {
	console.log('pasted', text)
})
```

Same shape as `useInput` — returns a `Stop` function, accepts `MaybeRefOrGetter` options.

---

## useApp

App-level controls.

```ts
import { useApp } from 'vueink'

const { exit } = useApp()

const onConfirm = () => {
	exit()
}
```

`exit(error?)` unmounts the app and resolves `waitUntilExit()`. Pass an `Error` to reject instead.

---

## stdio

### useStdin

```ts
const { stdin, isRawModeSupported, setRawMode } = useStdin()
```

### useStdout

```ts
const { stdout, write } = useStdout()
```

`write()` prints **above** the live frame — equivalent to writing to a `<Static>`, but imperative.

### useStderr

```ts
const { stderr, write } = useStderr()
```

---

## focus

### useFocus

```ts
import { useFocus } from 'vueink'

const { isFocused, focus } = useFocus({ id: 'username' })
```

`isFocused` is a `ComputedRef<boolean>` — bind it in templates directly.

`focus()` requests focus imperatively.

### useFocusManager

```ts
const { enableFocus, disableFocus, focusNext, focusPrevious, focus } = useFocusManager()
```

Use it to programmatically move focus or toggle the focus system on/off (Tab/Shift-Tab cycle by default when enabled).

### Shape change vs ink

`useFocus()` returns `{ isFocused: ComputedRef<boolean>, focus }`. Ink returns `{ isFocused: boolean, focus }`.

---

## useWindowSize

```ts
import { useWindowSize } from 'vueink'

const { columns, rows } = useWindowSize()
```

`columns` and `rows` are both `ShallowRef<number>`. They update on `SIGWINCH`.

### Shape change vs ink

Ink returns `{ columns: number, rows: number }`. vue-ink returns two refs so reactivity propagates naturally.

---

## useBoxMetrics

Reactive read of a Box's laid-out dimensions.

```vue
<script setup>
import { ref } from 'vue'
import { Box, Text, useBoxMetrics } from 'vueink'

const boxRef = ref()
const { width, height } = useBoxMetrics(boxRef)
</script>

<template>
	<Box ref="boxRef" border-style="round" padding="1">
		<Text>{{ width }} × {{ height }}</Text>
	</Box>
</template>
```

`width` and `height` update after every Yoga layout pass. For one-shot reads, use [`measureElement`](./measure-element).

---

## useCursor

```ts
const { show, hide, setPosition } = useCursor()
```

Shows, hides, or moves the terminal cursor. The renderer hides the cursor by default while a frame is live; use this composable to override that for inputs that need a visible caret.

---

## useAnimation

```ts
import { useAnimation } from 'vueink'

const frame = useAnimation(
	['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
	{ fps: 10 },
)
```

Returns a `Ref<T>` that cycles through frames at the given fps. Common spinner use case.

---

## Screen reader

### useIsScreenReaderEnabled

```ts
const isSR = useIsScreenReaderEnabled()
```

Returns `Ref<boolean>` — `true` when `render(App, { isScreenReaderEnabled: true })` was used. Conditionally render different output for screen-reader mode.

### Shape change vs ink

Ink returns `boolean`. vue-ink returns `Ref<boolean>` so it stays reactive if the renderer ever toggles it (and so templates can bind directly).

---

## See also

- [Ink parity → composables](/reference/ink-parity#hooks-composables) — every composable with status and shape-change notes.
- [How it works → input pipeline](../guide/how-it-works#_6-input-is-the-reverse-pipeline) — what `useInput` actually wires into.
