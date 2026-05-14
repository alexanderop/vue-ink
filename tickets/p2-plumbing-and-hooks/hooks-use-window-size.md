# `useWindowSize()` composable

## Why
Components need reactive terminal dimensions for layout decisions outside Yoga (e.g. choosing layout strategy at certain widths).

## Scope
- Depends on `hooks/use-stdout.md`.
- Subscribe to `stdout.on('resize', …)`; emit a `Ref<{ columns: number; rows: number }>`.
- Initial value from `stdout.columns`/`stdout.rows` with a fallback to `{ columns: 80, rows: 24 }` when undefined.
- Unsubscribe on `onBeforeUnmount`.

## Acceptance criteria
- Resizing the terminal updates the ref value before the next render.
- Multiple consumers share a single resize listener (or it doesn't matter — verify no listener-leak warning).

## References
- Ink source: `repos/ink/src/hooks/use-window-size.ts`, `repos/ink/src/utils.ts` (`getWindowSize`).
