# spacer

## What it shows

Two layout primitives:

- `<Spacer />` expands to fill remaining space in a flex row, pushing siblings apart. Multiple spacers split the gap evenly.
- `<Newline />` inserts line breaks inside a single `<Text>`. `count` produces multiple blank lines.

## How to run

```sh
pnpm --filter @vue-ink-examples/spacer start
```

## What to look at first

- [`spacer.vue`](./spacer.vue) — first two boxes use `<Spacer />`; the third uses `<Newline />` and `<Newline :count="2" />`.

## Related docs

- [`<Spacer>`](../../packages/docs/api/components.md#spacer)
- [`<Newline>`](../../packages/docs/api/components.md#newline)
