# Interactive mode detection

## Why
Running under CI, piped stdout, or a non-TTY context should disable ANSI erases, cursor hiding, resize handling — instead just print the last frame once. Avoids polluting `> log.txt` with escape sequences.

## Scope
- Add `interactive?: boolean` to `RenderOptions` (default: detect via `is-in-ci` + `stdout.isTTY`).
- When non-interactive:
  - Skip `cursorHide`/`cursorShow`.
  - Skip `eraseLines` between frames.
  - Skip resize listener.
  - On unmount, write only the final frame plus a trailing newline.
- Document tradeoffs (no animation, no `useInput`).

## Acceptance criteria
- `render(<App/>, { stdout: nonTtyStream })` produces a single frame on unmount with no escape sequences.
- Forcing `interactive: true` overrides detection.

## References
- Ink source: `repos/ink/src/ink.tsx` (interactive branch).
