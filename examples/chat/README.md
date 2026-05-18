# chat

## What it shows

A chat REPL combining several composables: `useInput` builds the draft buffer keystroke-by-keystroke, `usePaste` appends pasted text (newlines flattened), `useAnimation` drives both a blinking caret (500ms) and a typing indicator (120ms, only active while the bot is "thinking"), and `useCursor.setCursorPosition` parks the hardware cursor inside the input box when the caret should be visible. Supports slash commands (`/help`, `/clear`, `/quit`, `/me`, `/name`).

## How to run

```sh
pnpm --filter @vue-ink-examples/chat start
```

## What to look at first

- [`chat.vue`](./chat.vue) — `useCursor` + `watchEffect` near the bottom of `<script setup>` shows the cursor-positioning pattern; `useAnimation` with an `isActive` getter gates the typing indicator.

## Related docs

- [`useCursor`](../../packages/docs/api/composables.md#usecursor)
- [`useAnimation`](../../packages/docs/api/composables.md#useanimation)
- [`usePaste`](../../packages/docs/api/composables.md#usepaste)
