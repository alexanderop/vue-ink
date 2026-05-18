# counter

## What it shows

The smallest possible vue-ink app: a Vue `ref` driving a single `<Text>` node. A `setInterval` increments the counter every 100ms; vue-ink diffs the frame and rewrites only the changed line. Demonstrates that ordinary Vue reactivity is all you need — no custom store, no manual redraw call.

## How to run

```sh
pnpm --filter @vue-ink-examples/counter start
```

## What to look at first

- [`counter.vue`](./counter.vue) — `ref(0)` + `setInterval` + `<Text color="green">`.
- [`index.ts`](./index.ts) — boilerplate that registers the `.vue` loader and calls `render(Counter)`.

## Related docs

- [Getting started](../../packages/docs/guide/getting-started.md)
- [`<Text>` component](../../packages/docs/api/components.md#text)
- [`render()`](../../packages/docs/api/render.md)
