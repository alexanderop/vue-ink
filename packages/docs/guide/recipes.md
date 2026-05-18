# Recipes

A cookbook of common terminal-app patterns. Each recipe is a minimal runnable SFC — drop it into a project wired up like [SFC setup](./sfc-setup), then render it with `render(App)`.

For the full source of every snippet, see the [`examples/` directory in the repository](https://github.com/alexanderop/vue-ink/tree/main/examples).

## Focus-managed form

**Problem.** You have several inputs (or buttons) and want Tab / Shift+Tab to cycle between them, with the active one visually highlighted.

**Approach.** Give each focusable a stable `id` via `useFocus({ id })`. `useFocusManager` exposes `activeId`, plus imperative `focus(id)`, `focusNext()`, `focusPrevious()`, and `enableFocus()` / `disableFocus()` helpers.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Box, Text, useApp, useFocus, useFocusManager, useInput } from 'vueink'
import type { Key } from 'vueink'

const { exit } = useApp()
const manager = useFocusManager()

const name = useFocus({ id: 'name', autoFocus: true })
const email = useFocus({ id: 'email' })
const submit = useFocus({ id: 'submit' })

const fields = computed(() => [
	{ label: 'Name', focus: name },
	{ label: 'Email', focus: email },
	{ label: 'Submit', focus: submit },
])

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit()
	if (key.return && manager.activeId.value === 'submit') {
		// pretend to submit
		exit()
	}
})
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Text bold color="cyan">Sign up</Text>
		<Text dimColor>Tab / Shift+Tab to cycle · Enter on Submit · q quits</Text>

		<Box
			v-for="field in fields"
			:key="field.label"
			borderStyle="round"
			:borderColor="field.focus.isFocused.value ? 'green' : 'gray'"
			:paddingX="2"
		>
			<Text :color="field.focus.isFocused.value ? 'green' : undefined">
				{{ field.label }}
			</Text>
		</Box>
	</Box>
</template>
```

**Imports.** `useFocus`, `useFocusManager`, `useInput`, `useApp` from `vueink`.

**Gotchas.**

- `useFocus({ id })` requires a unique, stable `id`. Generating it inside `setup()` (e.g. with `Math.random()`) is fine — just don't compute a new one per render.
- Pass `autoFocus: true` to exactly one focusable, or call `manager.focus(id)` after mount.
- `isActive` accepts a ref/getter, so you can toggle a focusable off without unmounting it: `useFocus({ id, isActive: enabled })`.
- The activated element is `manager.activeId.value` (a ref). It's `null` when no element is focusable.

See [`examples/focus/`](https://github.com/alexanderop/vue-ink/tree/main/examples/focus) for a complete demo with disable/enable toggles, and [`examples/task-board/`](https://github.com/alexanderop/vue-ink/tree/main/examples/task-board) for a kanban-style three-column focus layout.

## Scrollable list with `<Static>`

**Problem.** You're running a long task — a test runner, build pipeline, or CLI agent — and want completed items to scroll up into the terminal scrollback while a live status footer stays at the bottom.

**Approach.** `<Static>` renders items **above** the live frame. Each item is emitted to scrollback once and never repainted, so it survives even after the live frame is gone. The footer is just a regular `<Box>` below it.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Box, Static, Text, useApp, useInput } from 'vueink'
import type { Key } from 'vueink'

type LogLine = { id: number; level: 'info' | 'error'; text: string }

const { exit } = useApp()
const lines = ref<LogLine[]>([])
const status = ref('idle')

let nextId = 0
const append = (level: LogLine['level'], text: string) => {
	lines.value = [...lines.value, { id: nextId++, level, text }]
}

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit()
	if (input === 'a') append('info', `event ${nextId}`)
	if (input === 'e') append('error', `oh no — error #${nextId}`)
	if (input === 's') status.value = status.value === 'idle' ? 'busy' : 'idle'
})
</script>

<template>
	<Box flexDirection="column">
		<Static :items="lines">
			<template #default="{ item }">
				<Box :paddingX="1">
					<Text :color="item.level === 'error' ? 'red' : 'green'">
						{{ item.level === 'error' ? '✗' : '✓' }}
					</Text>
					<Text> {{ item.text }}</Text>
				</Box>
			</template>
		</Static>

		<Box borderStyle="round" :paddingX="1" :marginTop="1">
			<Text bold>status: </Text>
			<Text :color="status === 'busy' ? 'yellow' : 'gray'">{{ status }}</Text>
			<Text dimColor>  ·  a=add, e=error, s=toggle, q=quit</Text>
		</Box>
	</Box>
</template>
```

**Imports.** `Static`, `Box`, `Text`, `useInput`, `useApp` from `vueink`.

**Gotchas.**

- `<Static>` is **append-only**. Mutating an earlier item, sorting, or replacing the array with a reordered copy will print a one-time warning on stderr and drop the divergent emission — terminal scrollback can't be erased after the fact.
- The `items` array must be a new reference for new items to appear. Push-with-mutation works, but using `lines.value = [...lines.value, item]` is the safest pattern.
- Items render inside a `position: 'absolute'` flex column, so they don't influence the live frame's layout.
- Wrap the slot's content in a `<Box>` to control padding/wrapping per item.

See [`examples/test-runner/`](https://github.com/alexanderop/vue-ink/tree/main/examples/test-runner) for a real-world combination of `<Static>`, a spinner, and a progress bar.

## Log + spinner

**Problem.** A long-running task (build, fetch, deploy) needs to show progress feedback while also logging completed steps. You want a spinner that ticks without manually managing `setInterval`.

**Approach.** `useAnimation` exposes a reactive `frame` counter driven by the renderer's shared timer. Multiple consumers coalesce into one underlying scheduler — adding more spinners doesn't cost more timers. Pair it with `<Static>` (above) to keep finished steps in scrollback.

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Box, Spacer, Static, Text, useAnimation, useApp, useInput } from 'vueink'
import type { Key } from 'vueink'

const { exit } = useApp()
const steps = ['fetch deps', 'compile', 'bundle', 'minify', 'upload']

const completed = ref<string[]>([])
const running = ref(true)

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const { frame } = useAnimation({ interval: 80, isActive: () => running.value })
const spinner = computed(() => SPINNER[frame.value % SPINNER.length])

const { frame: tick } = useAnimation({ interval: 500, isActive: () => running.value })
watch(tick, () => {
	const next = steps[completed.value.length]
	if (!next) {
		running.value = false
		return
	}
	completed.value = [...completed.value, next]
})

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit()
})
</script>

<template>
	<Box flexDirection="column">
		<Static :items="completed">
			<template #default="{ item }">
				<Box :paddingX="1">
					<Text color="green">✓</Text>
					<Text> {{ item }}</Text>
				</Box>
			</template>
		</Static>

		<Box borderStyle="round" :paddingX="1" :marginTop="1">
			<Text v-if="running" color="cyan" bold>{{ spinner }} working...</Text>
			<Text v-else color="green" bold>✓ done</Text>
			<Spacer />
			<Text dimColor>{{ completed.length }}/{{ steps.length }}</Text>
		</Box>
	</Box>
</template>
```

**Imports.** `useAnimation`, `Static`, `Box`, `Spacer`, `Text`, `useApp`, `useInput` from `vueink`.

**Gotchas.**

- `isActive` accepts a ref, getter, or boolean. When it flips false → true, `frame` and `time` reset to 0 — useful for "restart spinner on retry".
- `interval` is in milliseconds, clamped between `1` and `setTimeout`'s max. Default is `100`.
- `useAnimation` requires the renderer context — it doesn't work outside a component mounted via `render()`.
- For a one-shot animation, gate `isActive` on a condition (`() => !done.value`) instead of calling `reset()` manually.

See [`examples/test-runner/`](https://github.com/alexanderop/vue-ink/tree/main/examples/test-runner) for a full spinner + progress bar + `<Static>` log combination.

## Paste-aware input

**Problem.** Users want to paste a snippet, URL, or multi-line text into your TUI. By default `useInput` fires once per character, so a 200-character paste becomes 200 separate keypresses — fast enough to mash unrelated handlers and lose data.

**Approach.** Enable bracketed-paste mode via `usePaste`. The handler receives the entire pasted text as a single string, atomically. `useInput` is automatically suppressed for paste content.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Box, Text, useApp, useInput, usePaste } from 'vueink'
import type { Key } from 'vueink'

const { exit } = useApp()
const buffer = ref('')
const lastPaste = ref<{ length: number; lines: number } | null>(null)

usePaste((text: string) => {
	lastPaste.value = { length: text.length, lines: text.split('\n').length }
	buffer.value += text
})

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit()
	if (key.backspace || key.delete) {
		buffer.value = buffer.value.slice(0, -1)
		return
	}
	if (key.return) {
		buffer.value += '\n'
		return
	}
	if (input && !key.ctrl && !key.meta) buffer.value += input
})
</script>

<template>
	<Box flexDirection="column" :gap="1">
		<Text bold color="cyan">Paste anything — try Cmd+V / Ctrl+Shift+V</Text>
		<Text dimColor>q or Esc to quit</Text>

		<Box borderStyle="round" :padding="1" :width="60" flexDirection="column">
			<Text>{{ buffer || '(start typing or paste)' }}</Text>
		</Box>

		<Text v-if="lastPaste" dimColor>
			last paste: {{ lastPaste.length }} chars, {{ lastPaste.lines }} line(s)
		</Text>
	</Box>
</template>
```

**Imports.** `usePaste`, `useInput`, `Box`, `Text`, `useApp` from `vueink`.

**Gotchas.**

- `usePaste` requires a TTY stdin that supports raw mode. Piped input throws. Guard with `useStdin().isRawModeSupported` if you need to support non-interactive runs.
- Paste content does **not** flow into `useInput`. If you want paste-or-typed text to share a handler, write a small helper that appends both to the same buffer.
- Terminals that don't support bracketed paste (rare, but possible) will deliver the paste as a stream of individual key events instead — `useInput` will see them. Treat `usePaste` as an enhancement, not a guarantee.
- Bracketed-paste mode is enabled only while `usePaste` has an active listener.

See [`examples/paste/`](https://github.com/alexanderop/vue-ink/tree/main/examples/paste) for the minimal demo, and [`examples/task-board/`](https://github.com/alexanderop/vue-ink/tree/main/examples/task-board) for a paste-mode toggle that converts pasted lines into kanban tasks.

## Resizable layout

**Problem.** Your TUI should look right whether the terminal is 80×24 or 200×60. Hard-coding widths breaks on resize; flexbox alone doesn't tell you the column count when you need a number (e.g. for a progress bar or a manual line-wrap).

**Approach.** `useWindowSize` returns reactive `columns` and `rows` refs that update on `SIGWINCH`. Combine with `<Box flexGrow>` / `flexBasis` for fluid layouts, or read the values directly when you need explicit numbers.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Box, Text, useApp, useInput, useWindowSize } from 'vueink'
import type { Key } from 'vueink'

const { exit } = useApp()
const { columns, rows } = useWindowSize()

const PROGRESS_PADDING = 4
const barWidth = computed(() => Math.max(columns.value - PROGRESS_PADDING, 10))
const bar = computed(() => {
	const filled = Math.floor(barWidth.value * 0.6)
	return '█'.repeat(filled) + '░'.repeat(barWidth.value - filled)
})

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit()
})
</script>

<template>
	<Box flexDirection="column" :gap="1" :width="columns">
		<Box justifyContent="space-between">
			<Text bold color="cyan">resizable demo</Text>
			<Text dimColor>{{ columns }}×{{ rows }}</Text>
		</Box>

		<Box borderStyle="round" :paddingX="1">
			<Text color="green">{{ bar }}</Text>
			<Text> 60%</Text>
		</Box>

		<Box :gap="1">
			<Box borderStyle="single" :paddingX="1" :flexGrow="1">
				<Text>left (grow)</Text>
			</Box>
			<Box borderStyle="single" :paddingX="1" :flexGrow="2">
				<Text>right (grow 2×)</Text>
			</Box>
		</Box>
	</Box>
</template>
```

**Imports.** `useWindowSize`, `Box`, `Text`, `useApp`, `useInput` from `vueink`.

**Gotchas.**

- `columns` and `rows` are refs — use `.value` in script, or interpolate as-is in templates.
- When the terminal isn't a TTY (piped output, CI), `columns` falls back to a sensible default and stops updating. Don't rely on resize signals for non-interactive runs.
- Prefer `flexGrow` / `flexBasis` over reading `columns.value` for sizing — Yoga handles fractional widths and rounding more accurately than manual arithmetic.
- Border characters consume a column on each side. If you set `width: columns.value` on a bordered `<Box>`, the content area is `columns.value - 2`.

See [`examples/window-size/`](https://github.com/alexanderop/vue-ink/tree/main/examples/window-size) for the minimal demo, and [`examples/flex-layout/`](https://github.com/alexanderop/vue-ink/tree/main/examples/flex-layout) for grow/shrink/basis patterns.
