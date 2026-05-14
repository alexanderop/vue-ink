# `incrementalRendering` render option

## Why
For large frames where only a few lines change between renders, redrawing the whole frame causes flicker on slow terminals. Ink offers incremental-line rendering as opt-in.

## Scope
- Add `incrementalRendering?: boolean` (default `false`).
- Replace `eraseLines(n) + write(text)` with a diff that moves the cursor up by `delta` rows and rewrites only the changed lines. Reuse Ink's algorithm in `log-update.ts`.
- Must coexist with `useCursor` and `Static`.

## Acceptance criteria
- A two-row diff in a 50-row frame writes only the changed rows (verify via stdout-spy assertion on `\x1b` cursor-move sequences).
- Output equivalence: with the option on/off, the final visible content matches.

## References
- Ink source: `repos/ink/src/log-update.ts` (incremental branch).
