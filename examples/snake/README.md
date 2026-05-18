# snake

## What it shows

A full real-time game in ~180 lines. `useAnimation({ interval: 110, isActive })` is the game loop — pausing flips `isActive`, restarting calls the returned `reset()`. `useInput` accepts arrows, hjkl, and wasd; collision detection runs in `step()`. The grid is a computed 2D array rerendered every tick via nested `v-for`.

## How to run

```sh
pnpm --filter @vue-ink-examples/snake start
```

Controls: arrows / hjkl / wasd, space or `p` to pause, `r` or Enter to restart after game over, `q` to quit.

## What to look at first

- [`snake.vue`](./snake.vue) — `useAnimation` with `isActive: () => state.value === 'playing'` and the `reset` destructure used by `restart()`.

## Related docs

- [`useAnimation`](../../packages/docs/api/composables.md#useanimation)
- [`useInput`](../../packages/docs/api/composables.md#useinput)
