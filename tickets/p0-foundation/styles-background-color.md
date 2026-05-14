# `backgroundColor` on Box (with inheritance)

## Why
Ink lets you give a `<Box backgroundColor="blue">` and any `<Text>` descendant inherits that background unless it sets its own. Today, vue-ink only honors `backgroundColor` on `<Text>` directly.

## Scope
- Add `backgroundColor?: string` to `Styles` (already in `repos/ink/src/styles.ts`).
- Provide a `BACKGROUND_COLOR_INJECT_KEY` from `<Box>` to descendants via Vue `provide()` when `backgroundColor` is set.
- `<Text>` reads via `inject(BACKGROUND_COLOR_INJECT_KEY, null)` and combines with its own explicit prop (own > inherited).
- Renderer: paint the box background cell-by-cell. Add `packages/core/src/render-background.ts` mirroring `repos/ink/src/render-background.ts`.

## Acceptance criteria
- `<Box backgroundColor="red"><Text>hi</Text></Box>` paints `hi` on red, plus the rest of the box area on red.
- `<Text backgroundColor="blue">` inside that Box overrides to blue.
- Hex colors work.
- Tests mirror `repos/ink/test/background-color.tsx`.

## References
- Ink source: `repos/ink/src/render-background.ts`, `repos/ink/src/components/BackgroundContext.ts`, `repos/ink/src/components/Box.tsx`, `Text.tsx`.
