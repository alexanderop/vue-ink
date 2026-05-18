# paste

## What it shows

`usePaste(callback)` registers a handler for bracketed-paste mode. Multi-line clipboard contents arrive as a single event instead of as individual keystrokes through `useInput`. The demo counts pastes and renders the most recent payload.

## How to run

```sh
pnpm --filter @vue-ink-examples/paste start
```

Paste with Cmd+V (macOS) or Ctrl+Shift+V (Linux). Quits on `q` or Esc.

## What to look at first

- [`paste.vue`](./paste.vue) — `usePaste((text) => …)` runs once per paste, regardless of how many lines it spans.

## Related docs

- [`usePaste`](../../packages/docs/api/composables.md#usepaste)
