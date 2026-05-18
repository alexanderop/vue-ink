# focus

## What it shows

`useFocus({ id, autoFocus, isActive })` registers a focusable; `useFocusManager()` returns `{ activeId, focus(id), enableFocus(), disableFocus() }`. Tab / Shift+Tab cycles, `1`-`4` jump to a button by id, `d` toggles the Cart's `isActive` ref (skipping it in the rotation), `x` / `e` disable / enable focus globally, Enter prints the active id.

## How to run

```sh
pnpm --filter @vue-ink-examples/focus start
```

## What to look at first

- [`focus.vue`](./focus.vue) — see the four `useFocus({ id, … })` calls, the `cartActive` ref passed as `isActive`, and the `manager.focus(id)` jump handlers.

## Related docs

- [`useFocus` / `useFocusManager`](../../packages/docs/api/composables.md#focus)
