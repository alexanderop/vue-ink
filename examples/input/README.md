# input

## What it shows

`useInput` delivers a keypress callback with `(input, key)`. The demo shows the literal `input` string, the boolean flags on `key` (ctrl, shift, escape, arrow keys, etc.) and the running press count. `useApp().exit()` quits cleanly on `q` or Esc.

## How to run

```sh
pnpm --filter @vue-ink-examples/input start
```

## What to look at first

- [`input.vue`](./input.vue) — the `useInput((input, key) => …)` callback and the `Object.entries(key).filter(…)` pattern for listing active flags.

## Related docs

- [`useInput`](../../packages/docs/api/composables.md#useinput)
- [`useApp`](../../packages/docs/api/composables.md#useapp)
