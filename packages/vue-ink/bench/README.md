# vue-ink benchmarks

Three suites that together cover the hot paths of a real terminal app, plus a
parallel ink suite for tracking the delta against the React-based reference
implementation.

## What lives where

| File | Measures |
| --- | --- |
| `end-to-end.bench.ts` | Mount → Vue scheduler flush → Yoga layout → paint → unmount. The full first-frame pipeline. |
| `rerender.bench.ts` | One reactive mutation in an already-mounted tree → re-flush → paint. The per-tick cost. |
| `renderer-core.bench.ts` | A pre-built `DOMElement` tree painted repeatedly — Vue stripped out, only layout + paint left. Localises regressions. |
| `ink-comparison/end-to-end.bench.ts` | Same scenes as `end-to-end.bench.ts`, rendered through `ink` (React + Yoga). |
| `scenarios.ts` | Shared scene definitions for vue-ink (`FlatList`, `NestedBoxes`, `StyledGrid`, `WrappedParagraphs`) and the `createSilentStream` non-TTY sink. |
| `ink-comparison/ink-scenarios.ts` | The same scenes rebuilt with ink's `Box`/`Text` via `React.createElement`, plus an ink-flavoured `renderOnce`. |

## How to run

From the repo root:

```sh
pnpm --filter vueink bench
```

This runs `vitest bench --run --config vitest.bench.config.ts`, which is scoped
to `packages/vue-ink/bench/**/*.bench.ts` (the vendored Vue source under
`repos/` is excluded so vitest doesn't pull it in).

To run a single suite:

```sh
pnpm --filter vueink bench -- ink-comparison
pnpm --filter vueink bench -- rerender
```

## Methodology

- **What we measure.** Wall-clock time of the operation each scene names: a
  full mount/unmount cycle (`end-to-end`), a single reactive tick after mount
  (`rerender`), or a paint pass on a stable tree (`renderer-core`).
- **What we don't measure.** Real terminal I/O. All benches write to a
  `Writable` sink with `isTTY = false` and a fixed `columns` — no PTY
  involved. We're measuring the framework, not the OS or the user's terminal
  emulator.
- **Why three suites.** When a number regresses, the suite split tells you
  where: `renderer-core` slower → layout/paint regression; `rerender` slower
  but `renderer-core` flat → Vue glue regression; `end-to-end` slower but
  both above flat → mount/unmount lifecycle regression.

## ink comparison caveats

The numbers are **not apples-to-apples**, and that's fine — trends matter, not
absolutes:

- **Different schedulers.** vue-ink waits on Vue's `nextTick` plus one
  microtask turn. ink waits on its own `waitUntilRenderFlush()`, which sits
  on top of React's reconciler commit and a frame throttle.
- **Throttle disabled for the bench.** ink's default `maxFps: 30` adds ~16ms
  of `setTimeout` latency to every render. We pass `maxFps: 1000` so the
  bench measures work, not the throttle. Real ink apps see the throttle; the
  bench would be misleading if it did too.
- **No `patchConsole`, no `exitOnCtrlC`.** Both are disabled so the bench
  doesn't reach for real stdio.
- **JSX-free.** ink scenes are built with `React.createElement` so the bench
  files stay `.ts` and don't pull in a JSX runtime. Same tree shape, same
  props.
- **Stream is a sink.** Both implementations get a `Writable` that throws
  bytes away. No ANSI parsing, no terminal redraw.

## How to interpret the output

vitest groups the results by `describe` block. Look for the same scene name
under both `end-to-end render` (vue-ink) and `end-to-end render (ink)` and
compute the delta:

```
end-to-end render — FlatList — 1000 rows           ~30ms
end-to-end render (ink) — FlatList — 1000 rows     ~?ms
                                                   ──────
delta: vue-ink ÷ ink                               ratio
```

A ratio < 1 means vue-ink is faster, > 1 means slower. The absolute value is
less important than its movement between runs. Run the suite before and
after a change to the renderer or to the Vue glue and compare.

## ink doesn't bench in this env?

If ink's bench fails (e.g. environment lacks something `ink` needs that
isn't covered by the silent stdin/stdout shims), the vue-ink suites still
run independently — they don't import anything from `ink-comparison/`. In
that case, capture the error and document the workaround here so future
runs aren't surprised. As of the last known-good run, ink benches all eight
scenes on macOS / Node 22 without a real TTY.
