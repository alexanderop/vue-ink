# window-size

## What it shows

`useWindowSize()` returns reactive `columns` and `rows` refs that update on terminal resize. The demo binds `:width="columns - 2"` to a box so it always stretches to the viewport.

## How to run

```sh
pnpm --filter @vue-ink-examples/window-size start
```

Resize the terminal window to watch the numbers update live. Quits on `q` or Esc.

## What to look at first

- [`window-size.vue`](./window-size.vue) — the destructure `const { columns, rows } = useWindowSize()` and the `:width="columns - 2"` binding.

## Related docs

- [`useWindowSize`](../../packages/docs/api/composables.md#usewindowsize)
