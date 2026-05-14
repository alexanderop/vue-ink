# `alignContent`

## Why
Multi-line flex layouts (`flexWrap: 'wrap'`) need `alignContent` to control how wrapped rows align on the cross axis. Currently dropped on the floor.

## Scope
- Add `alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly'`.
- Apply via `node.setAlignContent(...)`.
- Default to `flex-start` when missing (Ink's chosen default, see comment in `repos/ink/src/styles.ts:606`).
- Expose on `<Box>`.

## Acceptance criteria
- Multi-row layout with `alignContent: 'space-between'` spreads wrapped rows.
- Default of unset matches `flex-start` (no surprise empty rows).

## References
- Ink source: `repos/ink/src/styles.ts` (alignContent branch).
