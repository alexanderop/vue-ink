---
name: use-cursor-positioning
description: useCursor() coords are absolute terminal cells, not box-relative; never manually blink with setCursorPosition(undefined) on an interval.
---

# Positioning the cursor correctly

`useCursor()` exposes `setCursorPosition({ x, y })`. Three things bite consumers
who treat it like a DOM `caret` API.

## 1. Coords are absolute frame cells, not box-relative

The `x`/`y` you pass land at that cell in the live frame — Yoga layout is
**not** consulted to translate "inside this box" to absolute coords. If the
cursor sits inside a nested box, you must add every contributing offset
yourself:

```
x = outerPaddingX + borderLeft + innerPaddingX + textOffset
y = title + marginTop + messagesHeight + marginTop + topBorder + ...
```

Forgetting the outer `paddingX`, the round border (1 col), or the inner
`paddingX` of the prompt box silently shifts the caret left by three columns —
exactly the symptom that looks like "the cursor is one or two chars off".

## 2. Boxes with `minHeight` are not as tall as their content

If a Y coordinate depends on a sibling Box's height and that Box has
`minHeight: N`, the actual height is `max(N, contentRows)` — not
`contentRows`. Computing `y` from content count alone puts the cursor _inside_
the short box instead of past it. Always compute:

```ts
const messagesHeight = Math.max(MIN_HEIGHT, contentRows);
```

## 3. Don't manually blink via `setCursorPosition(undefined)`

Real terminals (and xterm.js with `cursorBlink: true`, which the playground
uses) already blink the cursor at the terminal's native rate. Toggling
between a position and `undefined` on a timer fights that native blink and
produces visible flicker — the caret appears to jitter or skip.

**Rule:** `setCursorPosition({ x, y })` once per state change (via
`watchEffect`); let the terminal handle blink. Only pass `undefined` when the
cursor should genuinely be hidden (component unmount handles this for you via
`tryOnScopeDispose`).

Originally hit in `examples/chat/chat.vue` where a `useAnimation({ interval:
500 })` was toggling the caret on/off while xterm blinked it independently.

## Related

- `packages/renderer/src/composables/useCursor/index.ts` — composable source
- [[../porting/from-react-ink]] — `useCursor` row in the API mapping table
