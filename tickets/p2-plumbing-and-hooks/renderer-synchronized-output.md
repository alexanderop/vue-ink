# Synchronized output mode

## Why
Modern terminals (kitty, iTerm2, Windows Terminal) support the [DEC 2026 synchronized output mode](https://gitlab.com/gnachman/iterm2/-/wikis/synchronized-updates-spec): wrap a frame in `\x1b[?2026h … \x1b[?2026l` to suppress mid-frame redraws and stop tearing. Without it, big diffs flicker.

## Scope
- Port `repos/ink/src/write-synchronized.ts` into `packages/renderer/src/write-synchronized.ts`.
- Default on when interactive; off otherwise.
- Wrap each render write with the begin/end sequences.
- Probe support is optional — Ink just writes the sequences unconditionally; unsupported terminals ignore them.

## Acceptance criteria
- Every render write is bracketed by `\x1b[?2026h` and `\x1b[?2026l` in interactive mode.
- In non-interactive mode, no bracket sequences are emitted.
- Visual: no tearing during rapid re-renders on kitty/iTerm2.

## References
- Ink source: `repos/ink/src/write-synchronized.ts`.
