# `useFocusManager()` composable

## Why
Imperative focus control: `focus(id)`, `focusNext()`, `focusPrevious()`, `enableFocus()`, `disableFocus()`, and read `activeId`. Required for programmatic navigation (e.g. closing a modal returns focus to the trigger).

## Scope
- Depends on `hooks/use-focus.md` (same context).
- Export from `@vue-ink/renderer`/`@vue-ink/vue-ink`.
- Return refs (not raw values) for `activeId` so consumers can `watch()` it.

## Acceptance criteria
- `focus('settings-button')` activates the matching `useFocus({ id: 'settings-button' })` entry.
- `disableFocus()` clears `activeId` and ignores Tab.
- `enableFocus()` restores Tab handling but does not auto-focus the previous element.

## References
- Ink source: `repos/ink/src/hooks/use-focus-manager.ts`.
