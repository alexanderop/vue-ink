# `useFocus()` composable

## Why
Building focusable UIs (text inputs, menus, multi-pane TUI) requires a registry of focusable components and a tab-cycling controller. Without this, third-party Vue input libraries can't compose.

## Scope
- Depends on `input/keypress-parser.md` so Tab/Shift+Tab arrive predictably.
- Add `FOCUS_CONTEXT_KEY` provided by `render.ts` with state: `{ activeId, focusables: { id, isActive, autoFocus }[], add, remove, activate, deactivate, focus, focusNext, focusPrevious, enableFocus, disableFocus }`.
- `useFocus({ isActive?: Ref<bool>|bool, autoFocus?: bool, id?: string }): { isFocused: Ref<bool>; focus(id: string): void }`.
- Auto-register on mount, deregister on unmount. Generate stable random ID when none provided.
- While focus is enabled, listen for Tab (next) and Shift+Tab (previous).

## Acceptance criteria
- Two components calling `useFocus()` cycle on Tab in DOM order.
- `autoFocus: true` claims focus on mount only if nothing else is focused.
- `isActive: false` keeps the entry in the registry but skips it during cycling.
- Setting `isActive` ref to `false` while focused releases focus.

## References
- Ink source: `repos/ink/src/hooks/use-focus.ts`, `repos/ink/src/components/FocusContext.ts`, `repos/ink/src/ink.tsx` (`focusNext` / `focusPrevious`).
