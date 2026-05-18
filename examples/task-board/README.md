# task-board

## What it shows

A kanban board that exercises almost the entire vue-ink surface in one app: `<Box>` / `<Text>` / `<Spacer>` / `<Newline>` / `<Transform>`, plus `useApp`, `useInput`, `usePaste`, `useFocus`, `useFocusManager`, `useStdin`, `useStdout`, `useStderr`, `useWindowSize`, and `useIsScreenReaderEnabled`. Tab cycles columns, hjkl/arrows move tasks, `n` adds, `x` deletes, `p` toggles paste mode (multi-line paste becomes multiple tasks), `s` writes a summary to stdout above the UI.

## How to run

```sh
pnpm --filter @vue-ink-examples/task-board start
```

## What to look at first

- [`task-board.vue`](./task-board.vue) — the imports at the top list every composable used. See `usePaste` (lines ~111-122) for splitting pasted lines into tasks, and `stdout.write` / `stderr.write` (lines ~102, ~173) for printing above the live UI without breaking the frame.

## Related docs

- [Composables](../../packages/docs/api/composables.md)
- [Components](../../packages/docs/api/components.md)
