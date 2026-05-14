# `alternateScreen` render option

## Why
For full-screen TUIs (vim-style), rendering in the alternate buffer keeps the user's scrollback clean and restores the original terminal on exit.

## Scope
- Add `alternateScreen?: boolean` (default `false`) to `RenderOptions`.
- On mount: `writeStream.write('\x1b[?1049h')` + `cursorHome`.
- On unmount: `writeStream.write('\x1b[?1049l')`.
- Only honored when interactive (`renderer/interactive-detection.md`).
- Disable scroll-back-related output (no need to erase prior frames; alternate buffer is fresh).

## Acceptance criteria
- A `render(<App/>, { alternateScreen: true })` clears the terminal; on unmount, the original prompt is back without app output left behind.
- Non-interactive mode silently ignores the option.

## References
- Ink source: `repos/ink/src/ink.tsx` (alternate-screen path), readme section.
