# Composable semantics fixes (useInput, usePaste, useFocus)

## Why
Three semantic bugs in already-shipped composables. None are missing features — all are divergences from ink that already-written tests pin in their current (wrong) state. Fixing them requires updating the composables and rewriting the related assertions.

## Scope

### Fix 1: `useInput` / `usePaste` throw lazily on non-TTY
- Today both composables throw at setup if `!isRawModeSupported`, regardless of `isActive` (`packages/renderer/src/composables/useInput/index.ts:35-39`, `usePaste/index.ts:32-36`).
- ink only throws when raw mode is actually requested (`repos/ink/src/hooks/use-input.ts:164-174`).
- A component that mounts `useInput(handler, { isActive: someRef })` on a non-TTY crashes at setup even if the ref starts `false` — making conditional input gating impossible in non-interactive contexts (tests, CI fallbacks).
- The regression is encoded by the existing test `useInput/index.test.ts:58-61`.

**Implementation**: move the `isRawModeSupported` check from setup into the `onAttach` callback of `useEmitterListener` (or into a `computed` that the watcher reads). Throw only when `isActive` becomes true.

### Fix 2: `useFocus.isFocused` honours `isFocusEnabled`
- `focusCtx` exposes `isFocusEnabled` (`packages/renderer/src/focus-context.ts:14`), but `useFocus` never reads it: `isFocused = computed(() => activeId.value === id)` (`useFocus/index.ts:94`).
- Works today only by accident — `disableFocus()` clears `activeId` as a side-effect (see fix 3 below). Fix one and the other regresses.
- Fix: `isFocused = computed(() => focusCtx.isFocusEnabled.value && focusCtx.activeId.value === id)`.

### Fix 3: `enableFocus()` restores `activeId` instead of clearing on `disableFocus()`
- `focus-context.ts:90-93`: `disableFocus()` clears `activeId`. `enableFocus()` leaves it cleared. Test pins this at `useFocusManager/index.test.ts:91-128`.
- ink (`repos/ink/src/components/App.tsx:511-517`): only flips the enabled flag. The active component remains visually focused; re-enabling resumes Tab cycling from the same place.
- Real semantic divergence for modal/dialog flows: any port that toggles focus while a sub-screen is open loses the cursor.
- Fix: `disableFocus()` no longer touches `activeId`. Update `useFocusManager/index.test.ts:91-128` to assert ink semantics. Combined with fix 2, behaviour stays correct because `isFocused` is now gated on `isFocusEnabled`.

## Acceptance criteria
- `useInput(() => {}, { isActive: ref(false) })` mounts cleanly in a non-TTY render and never throws (fix 1). Existing assertion at `useInput/index.test.ts:58-61` flips.
- `usePaste(...)` ditto (fix 1).
- After `disableFocus()` then `enableFocus()`, the previously focused element's `isFocused` is `true` again and Tab continues from there (fix 2 + fix 3).
- With `useFocus({ autoFocus: true })` and `disableFocus()` active, `isFocused.value` is `false` for every focusable (fix 2).
- Mirror `repos/ink/test/use-focus.tsx` and `use-focus-manager.tsx` for the disable/enable cases.

## Implementation notes
- Fixes 2 and 3 are coupled — land them together. The shared invariant: `isFocused` is the source of truth for "should this component render in focused state", driven by both `activeId` and `isFocusEnabled`.
- Fix 1 can ship independently.

## References
- Ink source: `repos/ink/src/hooks/use-input.ts:164-174`, `repos/ink/src/hooks/use-paste.ts:47-59`, `repos/ink/src/components/App.tsx:511-517`.
- Affected vue-ink files: `packages/renderer/src/composables/useInput/index.ts`, `packages/renderer/src/composables/usePaste/index.ts`, `packages/renderer/src/composables/useFocus/index.ts`, `packages/renderer/src/focus-context.ts`, and their `_test/` siblings.
- Brain note: `brain/composables/vueuse-patterns.md` (the `MaybeRefOrGetter` + lazy-attach contract).
