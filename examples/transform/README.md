# transform

## What it shows

`<Transform>` runs a function on each rendered line of its child text just before output, after style codes are applied. Four examples: uppercase, character reverse, bracket wrap (preserves inner color), and per-line numbering using the second `index` argument.

## How to run

```sh
pnpm --filter @vue-ink-examples/transform start
```

## What to look at first

- [`transform.vue`](./transform.vue) — see the four transform functions at the top, especially `numbered(text, index)` which uses the line index.

## Related docs

- [`<Transform>`](../../packages/docs/api/components.md#transform)
