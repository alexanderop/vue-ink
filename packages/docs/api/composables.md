# Composables

All 13 composables are re-exported from `vueink`:

```ts
import {
	useApp,
	useStdin, useStdout, useStderr,
	useInput, usePaste,
	useFocus, useFocusManager,
	useWindowSize,
	useBoxMetrics,
	useCursor,
	useAnimation,
	useIsScreenReaderEnabled,
} from 'vueink'
```

They mirror Ink's hooks. A few have shape changes to fit Vue idioms — flagged below.

Source: [`packages/renderer/src/composables/`](https://github.com/alexanderop/vue-ink/tree/main/packages/renderer/src/composables) — every composable lives in its own folder with a colocated test. See [Ink parity → composables](/reference/ink-parity#hooks-composables) for the full status table.

## useInput

Subscribe to keyboard input.

```ts
function useInput(handler: InputHandler, options?: UseInputOptions): Stop

type InputHandler = (input: string, key: Key) => void

interface UseInputOptions {
	isActive?: MaybeRefOrGetter<boolean>  // default: true
}

type Stop = () => void
```

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

`isActive` can be `MaybeRefOrGetter<boolean>` so it reacts to state:

```ts
const enabled = ref(true)
useInput(handler, { isActive: enabled })
```

### `key` flags

`leftArrow`, `rightArrow`, `upArrow`, `downArrow`, `return`, `escape`, `tab`, `backspace`, `delete`, `ctrl`, `shift`, `meta`, `pageUp`, `pageDown`, `home`, `end`.

With the kitty keyboard protocol enabled (`render(App, { kittyKeyboard: true })`): `super`, `hyper`, `capsLock`, `numLock`, plus `eventType: 'press' | 'repeat' | 'release'`.

### Shape change vs ink

`useInput` returns a `Stop` function — call it to detach the handler imperatively. Ink relies on React unmount; Vue's `onScopeDispose` handles that automatically, but the explicit `Stop` covers cases where you want to detach without unmounting.

The raw-mode requirement is deferred until the listener actually attaches — `useInput(h, { isActive: false })` on a non-TTY stdin is a no-op rather than an eager throw.

Source: [`useInput/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useInput/index.ts).

---

## usePaste

Subscribe to multi-character paste events (uses bracketed-paste mode when supported).

```ts
function usePaste(handler: PasteHandler, options?: UsePasteOptions): Stop

type PasteHandler = (text: string) => void

interface UsePasteOptions {
	isActive?: MaybeRefOrGetter<boolean>  // default: true
}
```

```ts
import { usePaste } from 'vueink'

usePaste((text) => {
	console.log('pasted', text)
})
```

Same shape as `useInput` — returns a `Stop` function, accepts `MaybeRefOrGetter` options, defers raw-mode requirements until attach.

Source: [`usePaste/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/usePaste/index.ts).

---

## useApp

App-level controls.

```ts
function useApp(): AppContext

type AppContext = {
	exit: (errorOrResult?: unknown) => void
	waitUntilRenderFlush: () => Promise<void>
}
```

```ts
import { useApp } from 'vueink'

const { exit } = useApp()

const onConfirm = () => {
	exit()
}
```

- `exit(error?)` — unmounts the app and resolves `waitUntilExit()`. Passing an `Error` rejects the promise instead; any other value resolves with that value.
- `waitUntilRenderFlush()` — resolves after the next frame is painted. Useful when reacting to a state update before printing afterwards.

Source: [`useApp/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useApp/index.ts).

---

## stdio

### useStdin

```ts
function useStdin(): UseStdinReturn

type UseStdinReturn = {
	stdin: NodeJS.ReadStream
	isRawModeSupported: boolean
	setRawMode: (enable: boolean) => void
	setBracketedPasteMode: (enable: boolean) => void
}
```

```ts
const { stdin, isRawModeSupported, setRawMode } = useStdin()
```

Prefer [`useInput`](#useinput) or [`usePaste`](#usepaste) for parsed events — `stdin` is exposed for low-level integrations.

Source: [`useStdin/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useStdin/index.ts).

### useStdout

```ts
function useStdout(): StdoutContext

type StdoutContext = {
	stdout: NodeJS.WriteStream
	write: (data: string) => void
}
```

```ts
const { stdout, write } = useStdout()
```

`write()` erases the current frame, writes the data, then repaints — so prints land **above** the live UI (equivalent to a `<Static>` but imperative).

Source: [`useStdout/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useStdout/index.ts).

### useStderr

```ts
function useStderr(): StderrContext

type StderrContext = {
	stderr: NodeJS.WriteStream
	write: (data: string) => void
}
```

```ts
const { stderr, write } = useStderr()
```

Same as `useStdout`, but writes go to stderr.

Source: [`useStderr/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useStderr/index.ts).

---

## focus

### useFocus

```ts
function useFocus(options?: UseFocusOptions): UseFocusReturn

interface UseFocusOptions {
	isActive?: MaybeRefOrGetter<boolean>  // default: true
	autoFocus?: boolean                   // default: false
	id?: string                           // default: auto-generated
}

interface UseFocusReturn {
	isFocused: ComputedRef<boolean>
	focus: (id: string) => void
}
```

```ts
import { useFocus } from 'vueink'

const { isFocused, focus } = useFocus({ id: 'username' })
```

- `isFocused` is a `ComputedRef<boolean>` — bind it in templates directly.
- `focus(id)` requests focus on another entry imperatively.

Provide a stable `id` if you need to call `focus(id)` from elsewhere; otherwise a random id is generated.

Source: [`useFocus/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useFocus/index.ts).

### useFocusManager

```ts
function useFocusManager(): UseFocusManagerReturn

interface UseFocusManagerReturn {
	activeId: Ref<string | undefined>
	focus: (id: string) => void
	focusNext: () => void
	focusPrevious: () => void
	enableFocus: () => void
	disableFocus: () => void
}
```

```ts
const { enableFocus, disableFocus, focusNext, focusPrevious, focus } = useFocusManager()
```

Programmatic access to the focus manager. Tab / Shift-Tab cycle focusables in mount order when enabled (the default).

Source: [`useFocusManager/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useFocusManager/index.ts).

### Shape change vs ink

`useFocus()` returns `{ isFocused: ComputedRef<boolean>, focus }`. Ink returns `{ isFocused: boolean, focus }`.

---

## useWindowSize

```ts
function useWindowSize(): UseWindowSizeReturn

interface UseWindowSizeReturn {
	columns: ShallowRef<number>
	rows: ShallowRef<number>
}

// Ink-compat alias: plain numbers, not refs.
interface WindowSize {
	readonly columns: number
	readonly rows: number
}
```

```ts
import { useWindowSize } from 'vueink'

const { columns, rows } = useWindowSize()
```

`columns` and `rows` update on stdout's `resize` event (SIGWINCH).

### Shape change vs ink

Ink returns `{ columns: number, rows: number }`. vue-ink returns two `ShallowRef<number>`s so reactivity propagates naturally. The plain `WindowSize` type is re-exported as an ink-compat alias for porters typing intermediate values.

Source: [`useWindowSize/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useWindowSize/index.ts).

---

## useBoxMetrics

Reactive read of a Box's laid-out dimensions.

```ts
function useBoxMetrics(target: MaybeRefOrGetter<BoxMetricsTarget>): UseBoxMetricsReturn

type BoxMetricsTarget =
	| DOMElement
	| { readonly $element: DOMElement | null | undefined }
	| null
	| undefined

interface UseBoxMetricsReturn {
	readonly width: ShallowRef<number>
	readonly height: ShallowRef<number>
	readonly left: ShallowRef<number>
	readonly top: ShallowRef<number>
	readonly hasMeasured: ShallowRef<boolean>
}

// Ink-compat alias: plain numbers, matching ink's `BoxMetrics`.
type BoxMetrics = {
	readonly width: number
	readonly height: number
	readonly left: number
	readonly top: number
}
```

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { Box, Text, useBoxMetrics } from 'vueink'

const boxRef = useTemplateRef('box')
const { width, height, hasMeasured } = useBoxMetrics(boxRef)
</script>

<template>
	<Box ref="box" border-style="round" padding="1">
		<Text v-if="hasMeasured">{{ width }} × {{ height }}</Text>
		<Text v-else>Measuring…</Text>
	</Box>
</template>
```

Values update after every Yoga layout pass (mount, sibling changes, terminal resize). `hasMeasured` is `false` until the first commit and flips back if the tracked target detaches. For one-shot reads, use [`measureElement`](./measure-element).

Source: [`useBoxMetrics/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useBoxMetrics/index.ts).

---

## useCursor

Position the terminal cursor relative to the live frame.

```ts
function useCursor(): UseCursorReturn

type CursorPosition = { x: number; y: number }

interface UseCursorReturn {
	setCursorPosition: (position: CursorPosition | undefined) => void
}
```

```ts
import { useCursor } from 'vueink'

const { setCursorPosition } = useCursor()

setCursorPosition({ x: 4, y: 0 })  // show cursor at column 4, row 0
setCursorPosition(undefined)        // hide cursor
```

The renderer hides the cursor by default while a frame is live; call `setCursorPosition` to override that for inputs that need a visible caret or for IME (Input Method Editor) anchoring. Multiple consumers can call it — the renderer uses the most recent value at paint time. When the surrounding scope is disposed the cursor reverts to hidden.

Source: [`useCursor/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useCursor/index.ts).

---

## useAnimation

Drive an animation off the shared renderer timer.

```ts
function useAnimation(options?: UseAnimationOptions): UseAnimationReturn

interface UseAnimationOptions {
	interval?: MaybeRefOrGetter<number>  // ms between ticks, default 100
	isActive?: MaybeRefOrGetter<boolean> // default true
}

interface UseAnimationReturn {
	readonly frame: ShallowRef<number>  // discrete tick counter
	readonly time: ShallowRef<number>   // total elapsed ms
	readonly delta: ShallowRef<number>  // ms since previous rendered tick
	readonly reset: () => void
}

// Ink-compat alias for porters.
type AnimationResult = UseAnimationReturn
```

```ts
import { computed } from 'vue'
import { useAnimation } from 'vueink'

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

const { frame } = useAnimation({ interval: 100 })
const spinner = computed(() => frames[frame.value % frames.length])
```

Multiple consumers coalesce into a single underlying scheduler — spinners and progress bars never each pay for their own `setInterval`. Toggling `isActive` false → true resets `frame`/`time`/`delta` to zero.

Source: [`useAnimation/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useAnimation/index.ts).

---

## Screen reader

### useIsScreenReaderEnabled

```ts
function useIsScreenReaderEnabled(): Ref<boolean>
```

```ts
const isSR = useIsScreenReaderEnabled()
```

Returns `Ref<boolean>` — `true` when `render(App, { isScreenReaderEnabled: true })` was used. Conditionally render different output for screen-reader mode (e.g. swap an ASCII spinner for the string "loading…").

### Shape change vs ink

Ink returns `boolean`. vue-ink returns `Ref<boolean>` so it stays reactive if the renderer ever toggles it (and so templates can bind directly).

Source: [`useIsScreenReaderEnabled/index.ts`](https://github.com/alexanderop/vue-ink/blob/main/packages/renderer/src/composables/useIsScreenReaderEnabled/index.ts).

---

## See also

- [Ink parity → composables](/reference/ink-parity#hooks-composables) — every composable with status and shape-change notes.
- [How it works → input pipeline](../guide/how-it-works#_6-input-is-the-reverse-pipeline) — what `useInput` actually wires into.
- [Components → ARIA](./components#accessibility) — `aria-*` props consumed by the screen-reader walker.
