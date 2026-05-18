# dashboard

## What it shows

An ops dashboard built on `useAnimation`: three independent timers (80ms spinner, 500ms metrics, 700ms log stream) feed a `watch` that mutates reactive state. Demonstrates sparklines (Unicode block characters from a smoothed series), progress bars, a Braille spinner, and a rolling log list. Space pauses every animation by flipping the `isActive` ref.

## How to run

```sh
pnpm --filter @vue-ink-examples/dashboard start
```

## What to look at first

- [`dashboard.vue`](./dashboard.vue) — the three `useAnimation({ interval, isActive })` calls and the `watch(metricsFrame, …)` blocks that push into the sparkline series.

## Related docs

- [`useAnimation`](../../packages/docs/api/composables.md#useanimation)
- [`useWindowSize`](../../packages/docs/api/composables.md#usewindowsize)
