# `aspectRatio`

## Why
Yoga supports `aspectRatio`. Useful for shaped images / banner regions where you want one dimension to be derived from the other.

## Scope
- Add `aspectRatio?: number` to `Styles`.
- Apply via `node.setAspectRatio(value)` in `applyDimensionStyles`.
- Expose on `<Box>`.

## Acceptance criteria
- `<Box width={20} aspectRatio={2} />` lays out with height 10.
- Setting one dimension constraint plus aspectRatio derives the other.

## References
- Ink source: `repos/ink/src/styles.ts` (aspectRatio branch).
