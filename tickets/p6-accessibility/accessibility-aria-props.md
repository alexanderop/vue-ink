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

## Review findings (2026-05-15)

Quality review surfaced that **adding the props alone does nothing user-visible** — they're the entry point to a larger gap.

- Ink consumes aria props in **a second render path** — `repos/ink/src/render-node-to-output.ts:79-94` walks the same node tree but emits `(busy) role: text` style output, not visual layout. vue-ink has no equivalent; `packages/core/src/render-node-to-output.ts` only has the visual pass.
- This means even after this ticket lands, `INK_SCREEN_READER=true` produces normal visual output — the props get serialized to `internal_accessibility` but nothing reads them.
- Practical sequencing: this ticket pairs tightly with `tickets/p6-accessibility/accessibility-screen-reader-mode.md`. Land them together, or land screen-reader-mode + the second render pass first so this ticket has something to feed.

### Box behavior gap (additional scope)
When SR off, `<Box aria-hidden>` should still affect the visual tree the same way ink handles it: ink returns `null` from the Box component itself (`repos/ink/src/components/Box.tsx:76-78`) only when SR is enabled. Document this branching in the implementation; don't add visual-layer behaviour for aria props.
