# Bracketed paste mode

## Why
When the user pastes text, terminals can either send the bytes verbatim (treated as fast typing) or wrap them in `\x1b[200~ ... \x1b[201~`. The second form lets us deliver paste as a single string instead of N keys, which is mandatory for text-input components.

## Scope
- Depends on `input/keypress-parser.md` (parser must detect the begin/end markers).
- Add `setBracketedPasteMode(enable: bool)` to the input manager.
  - On enable, write `\x1b[?2004h`; on disable, write `\x1b[?2004l`.
  - Reference-counted (multiple `usePaste` consumers).
- Expose via `STDIN_CONTEXT_KEY`.
- Emit a `'paste'` event with the accumulated string between markers; do NOT also forward those keys to the `'input'` event.

## Acceptance criteria
- A pasted multi-line block triggers one `'paste'` emit, zero `'input'` emits.
- Toggling `setBracketedPasteMode(true/false)` writes the matching escapes.
- Terminals that ignore the escape behave as before (paste bytes flow through `'input'`).

## References
- Ink source: `repos/ink/src/ink.tsx` (`setBracketedPasteMode`), `repos/ink/src/parse-keypress.ts`.
