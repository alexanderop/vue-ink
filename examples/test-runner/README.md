# test-runner

## What it shows

The canonical `<Static>` use case. Completed tests are appended to a reactive list and rendered via `<Static :items="completed">`; vue-ink writes each new item to scrollback exactly once and never repaints it. The live progress block below stays pinned in the active frame. Two `useAnimation` timers drive a Braille spinner (80ms) and a tick that "runs" the next test (220ms).

## How to run

```sh
pnpm --filter @vue-ink-examples/test-runner start
```

## What to look at first

- [`test-runner.vue`](./test-runner.vue) — `<Static :items="completed">` with a `#default="{ item }"` slot, and the `watch(tickFrame, …)` that advances `currentIndex` and pushes into `completed`.

## Related docs

- [`<Static>`](../../packages/docs/api/components.md#static)
- [`useAnimation`](../../packages/docs/api/composables.md#useanimation)
