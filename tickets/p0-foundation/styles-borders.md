# Borders

## Why
Borders are the single most-used Ink decoration. Without them, vue-ink can't render dialog boxes, framed cards, list separators — basically every TUI demo.

## Scope
This is the biggest single ticket. Plan it in three layers:

### 1. Style surface (`packages/core/src/styles.ts`)
- `borderStyle?: keyof Boxes | BoxStyle` (re-export `cli-boxes` types).
- Per-edge toggles: `borderTop|Bottom|Left|Right: boolean` (default true when `borderStyle` is set).
- Per-edge colors: `borderColor`, `borderTopColor`, `borderBottomColor`, `borderLeftColor`, `borderRightColor`.
- Per-edge background: `borderBackgroundColor`, `borderTopBackgroundColor`, …
- Per-edge dim: `borderDimColor`, `borderTopDimColor`, …

### 2. Yoga reservation
- Inside `applyBorderStyles`, call `node.setBorder(edge, value ? 1 : 0)` so children don't sit on top of the border lines.

### 3. Render
- Port `repos/ink/src/render-border.ts` into `packages/core/src/render-border.ts`.
- Wire it from `render-node-to-output.ts`: when an `ink-box` has a `borderStyle`, paint the four edges with `cli-boxes` glyphs using the resolved colors. Honor per-edge skips (don't paint hidden edges; corners adapt).
- Dim/background color modifiers go through `chalk` (already a dependency).

### Box prop wiring
- Add the new keys to `packages/components/src/Box.ts` `stringKeys`/`booleanKeys` lists.

## Acceptance criteria
- `<Box borderStyle="single">` renders a 1-cell border, content padded inside.
- Per-edge toggles drop a single side and adjust corners.
- Colors render correctly in both `color` and `borderColor` combinations.
- Snapshot tests parallel to `repos/ink/test/border.tsx` pass.

## References
- Ink source: `repos/ink/src/render-border.ts`, `repos/ink/src/styles.ts` (`applyBorderStyles`), `repos/ink/src/render-node-to-output.ts`.
- `cli-boxes` package on npm.
