# `aria-label` / `aria-hidden` / `aria-role` / `aria-state` on Box & Text

## Why
Required for screen-reader-friendly TUIs. When SR mode is on, components should announce semantic info instead of decoration. Without these props, vue-ink can't tell tools like Speakup/Orca what each region is.

## Scope
- Depends on `accessibility/screen-reader-mode.md`.
- Add prop typing to `<Box>`:
  - `aria-label?: string`
  - `aria-hidden?: boolean`
  - `aria-role?: 'button' | 'checkbox' | 'combobox' | 'list' | 'listbox' | 'listitem' | 'menu' | 'menuitem' | 'option' | 'progressbar' | 'radio' | 'radiogroup' | 'tab' | 'tablist' | 'table' | 'textbox' | 'timer' | 'toolbar'`
  - `aria-state?: { busy?, checked?, disabled?, expanded?, multiline?, multiselectable?, readonly?, required?, selected? }`
- Add prop typing to `<Text>`:
  - `aria-label?: string`
  - `aria-hidden?: boolean`
- Emit `internal_accessibility` attribute on the host node so renderer can serialize for SR consumers.
- When SR enabled + `aria-hidden`, render nothing.
- When SR enabled + `aria-label` set, replace children with a `<Text>` containing the label.

## Acceptance criteria
- With SR on, `<Box aria-hidden>` renders empty.
- With SR on, `<Text aria-label="3 of 5">★★★☆☆</Text>` outputs `3 of 5`.
- With SR off, all aria-* props are no-ops (decorations show normally).
- Tests parallel to `repos/ink/test/accessibility.tsx`.

## References
- Ink source: `repos/ink/src/components/Box.tsx`, `Text.tsx`, `AccessibilityContext.ts`.
