# Kitty keyboard protocol support

## Why
Kitty/wezterm/foot expose richer keyboard events: distinct key-down vs key-up, modifier-only events, super/hyper modifiers, and disambiguation between e.g. `Ctrl+I` and Tab. Modern TUI patterns (vim modes, multi-modifier shortcuts) depend on this.

## Scope
- Depends on `input/keypress-parser.md`.
- Port `repos/ink/src/kitty-keyboard.ts`: `kittyFlags`, `kittyModifiers`, `KittyKeyboardOptions`, `KittyFlagName`.
- Add `kittyKeyboard?: KittyKeyboardOptions` to `RenderOptions`.
- On mount, write the "push keyboard mode" escape with the requested flags; on unmount, "pop" mode.
- Parser handles the CSI-u/CSI-~ formats.
- Expose extended `Key` fields (`super`, `hyper`, `capsLock`, `numLock`, `eventType`).

## Acceptance criteria
- With `kittyKeyboard: { flags: ['disambiguateEscapeCodes', 'reportEventTypes'] }`, a key release is delivered with `eventType: 'release'`.
- Super and Hyper modifiers populate the `Key` object.
- On a terminal that doesn't support kitty mode, the app still works (mode-set escape is ignored).
- Exports `kittyFlags`, `kittyModifiers` from `@vue-ink/renderer` and `@vue-ink/vue-ink`.

## References
- Ink source: `repos/ink/src/kitty-keyboard.ts`, `repos/ink/src/parse-keypress.ts` (kitty branch).
- Kitty spec: https://sw.kovidgoyal.net/kitty/keyboard-protocol/
