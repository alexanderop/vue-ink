# kitty-keys

## What it shows

When the terminal supports the Kitty keyboard protocol (Kitty, Ghostty, WezTerm, recent foot), vue-ink reports modifiers beyond ctrl/shift/meta — `super`, `hyper`, `capsLock`, `numLock` — plus special keys (arrows, PgUp/PgDn, Home/End, Tab, Backspace, Delete) and the event type (`press` / `repeat` / `release`) on `key.eventType`. In legacy mode `eventType` is undefined.

## How to run

```sh
pnpm --filter @vue-ink-examples/kitty-keys start
```

Best viewed in a Kitty-protocol terminal; everywhere else you get the legacy subset.

## What to look at first

- [`kitty-keys.vue`](./kitty-keys.vue) — the `useInput` callback collects all modifier and special-key booleans.

## Related docs

- [`useInput` — `key` flags](../../packages/docs/api/composables.md#key-flags)
