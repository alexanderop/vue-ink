# Screen reader mode (context + env detection)

## Why
Foundation for all aria-* behaviour and `useIsScreenReaderEnabled`. The flag is set once at `render()` time and propagated via context so components can branch on it.

## Scope
- Add `isScreenReaderEnabled?: boolean` to `RenderOptions`.
- Default: `process.env.INK_SCREEN_READER === 'true'`.
- Provide `ACCESSIBILITY_CONTEXT_KEY` from `render.ts` with `{ isScreenReaderEnabled: Ref<boolean> }`.
- Document env var contract for SR users.

## Acceptance criteria
- `render(<App/>, { isScreenReaderEnabled: true })` flips the context.
- `INK_SCREEN_READER=true` env var enables it without explicit option.
- A consumer using `useIsScreenReaderEnabled()` reflects the value.

## References
- Ink source: `repos/ink/src/components/AccessibilityContext.ts`, `repos/ink/src/render.ts`, `repos/ink/readme.md` (Screen Reader Support).
