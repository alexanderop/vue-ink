# `<Transform>` component

## Why
Lets users apply arbitrary post-processing to text output (gradients, hyperlinks, custom effects). Operates on the rendered string after children have been flattened, which can't be done in user-land without renderer hooks.

## Scope
- Add `Transform` to `@vue-ink/components` (`packages/components/src/Transform.ts`).
- Props: `transform: (children: string, index: number) => string`, optional `accessibilityLabel: string`.
- Emits `ink-text` with `internal_transform` set to the provided function.
- When `<Transform>` is nested in another transforming `<Text>`/`<Transform>`, transforms compose innermost-first (already supported by `render-node-to-output.ts`).
- When screen reader mode is active and `accessibilityLabel` is provided, render the label instead of children (depends on `accessibility/screen-reader-mode.md`).

## Acceptance criteria
- A `<Transform :transform="s => s.toUpperCase()">hi</Transform>` outputs `HI`.
- Index argument increments per child line, matching Ink's behaviour.
- Nested transforms compose.
- Test mirrors `repos/ink/test/transform.tsx`.

## References
- Ink source: `repos/ink/src/components/Transform.tsx`
- `repos/ink/src/render-node-to-output.ts` (internal_transform branch)
