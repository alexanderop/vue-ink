# `patchConsole` render option

## Why
A naked `console.log('foo')` inside a render scrambles the live frame. Ink intercepts `console.log/info/warn/error/debug/trace` and routes them through `useStdout().write` so they appear above the frame. Required for any app that uses third-party libs that log.

## Scope
- Add `patchConsole?: boolean` (default `true`) to `RenderOptions`.
- On render start, replace `console.log` etc. with a wrapper that calls the stdout/stderr write-above-frame helper.
- Restore originals on unmount (and on the *start* of unmount, before Vue cleanup, so teardown logs go via native console).
- Reference-counted to allow nested `render()` calls (rare but possible in tests).

## Acceptance criteria
- `console.log('hi')` from a component prints `hi` once above the live frame.
- `console.error` goes to stderr (after `renderer/stderr-option.md`).
- Setting `patchConsole: false` leaves console untouched.

## References
- Ink source: `repos/ink/src/ink.tsx` (`patchConsole`), `repos/ink/src/output.ts`.
