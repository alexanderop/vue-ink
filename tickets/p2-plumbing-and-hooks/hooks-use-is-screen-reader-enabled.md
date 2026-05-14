# `useIsScreenReaderEnabled()` composable

## Why
Some components must render differently when a screen reader is active (read `accessibilityLabel` instead of decoration, replace ASCII art with descriptive text). This composable surfaces the flag.

## Scope
- Depends on `accessibility/screen-reader-mode.md`.
- Read from the accessibility context provided by `render.ts`.
- Return a `Ref<boolean>` (Ink returns a static value, but Vue should let it react if the option is toggled at runtime).

## Acceptance criteria
- Returns `true` when `render(..., { isScreenReaderEnabled: true })` or `process.env.INK_SCREEN_READER === 'true'`.
- Returns `false` otherwise.

## References
- Ink source: `repos/ink/src/hooks/use-is-screen-reader-enabled.ts`, `repos/ink/src/components/AccessibilityContext.ts`.
