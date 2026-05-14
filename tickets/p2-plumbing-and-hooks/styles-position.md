# `position` + `top/right/bottom/left`

## Why
`<Static>` and overlay UI need absolute positioning. Yoga supports `POSITION_TYPE_ABSOLUTE`/`STATIC`, but `packages/core/src/styles.ts` strips these props.

## Scope
- Add `position`, `top`, `right`, `bottom`, `left` to `Styles` in `packages/core/src/styles.ts`.
- `position: 'absolute' | 'relative' | 'static'` → `Yoga.POSITION_TYPE_*`.
- `top|right|bottom|left: number | string` → `node.setPosition(edge, n)` or `setPositionPercent(edge, parseFloat(s))`.
- Expose these props on `<Box>` (`packages/components/src/Box.ts` keyword lists).
- `render-node-to-output.ts`: ensure absolute children render at their computed x/y from Yoga.

## Acceptance criteria
- `<Box position="absolute" top={0} left={0} />` inside a `<Box position="relative">` paints at the relative origin.
- Percent strings work (`top: '50%'`).
- Tests cover both absolute and static positioning.

## References
- Ink source: `repos/ink/src/styles.ts` (applyPositionStyles).
