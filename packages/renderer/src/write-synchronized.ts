// DEC 2026 synchronized update mode — terminals that support it suppress
// mid-frame redraws when output is wrapped in BSU/ESU. Unsupported terminals
// ignore the sequences silently, so writing them unconditionally is safe.
//
// Spec: https://gitlab.com/gnachman/iterm2/-/wikis/synchronized-updates-spec
export const BSU = '\x1b[?2026h';
export const ESU = '\x1b[?2026l';
