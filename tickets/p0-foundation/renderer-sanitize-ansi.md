# Sanitize ANSI control characters

## Why
User-provided strings can contain bell, backspace, carriage return, or stray escape sequences that desync the terminal cursor and break layout. Ink runs every text node through a sanitizer before width measurement.

## Scope
- Port `repos/ink/src/sanitize-ansi.ts` into `packages/core/src/sanitize-ansi.ts`.
- Apply inside `squash-text-nodes.ts` (or wherever text is collected for layout/render).
- Strip / replace: `\x07` (bell), `\b`, lone `\r`, unprintable control codes; keep `\n`, `\t`, and valid CSI/OSC sequences (color codes).
- Update `measure-text.ts` to measure post-sanitisation width.

## Acceptance criteria
- A `<Text>{'a\x07b'}</Text>` measures to width 2 and renders as `ab`.
- ANSI color escape sequences (`\x1b[31m`) survive sanitisation.
- Snapshot test from `repos/ink/test/sanitize-ansi.ts`.

## References
- Ink source: `repos/ink/src/sanitize-ansi.ts`.
