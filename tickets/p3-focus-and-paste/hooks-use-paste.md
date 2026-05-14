# `usePaste()` composable

## Why
When users paste multi-line text, each newline currently fires a separate key event, which makes text-input components misbehave (treating paste as Enter). Bracketed-paste mode wraps the pasted block so we can deliver it as one string.

## Scope
- Depends on `input/bracketed-paste.md` (terminal mode toggle).
- Extend `STDIN_CONTEXT_KEY` with `setBracketedPasteMode(enable: bool)` and a separate `'paste'` event on the emitter.
- `usePaste(handler, { isActive?: bool|Ref<bool> })`. While active, calls `setBracketedPasteMode(true)` + `setRawMode(true)`.
- Reference-counted bracketed-paste activation so multiple consumers don't toggle off prematurely.
- `useInput` must NOT receive paste content while `usePaste` is active in the same tree (separate channels).

## Acceptance criteria
- Pasting multi-line text fires `handler` once with the full string.
- Same paste does not fire `useInput` in the same component.
- Unmounting the last `usePaste` consumer disables bracketed-paste mode.

## References
- Ink source: `repos/ink/src/hooks/use-paste.ts`, `repos/ink/src/parse-keypress.ts` (paste detection), `repos/ink/src/ink.tsx` (`setBracketedPasteMode`).
