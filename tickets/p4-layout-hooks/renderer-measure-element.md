# `measureElement()` utility

## Why
Imperative escape hatch when `useBoxMetrics` is overkill (one-off measurement, outside setup()). Ink exports it as a standalone helper.

## Scope
- Export `measureElement(element: DOMElement): { width: number; height: number }` from `@vue-ink/renderer`.
- Reads from `element.yogaNode.getComputedWidth()` / `getComputedHeight()`; returns zeros if no Yoga node.
- Document the contract: must be called after layout (e.g. in `onMounted` post-flush).

## Acceptance criteria
- After mount, `measureElement(boxRef.value)` returns the laid-out width/height.
- Returns `{ width: 0, height: 0 }` for nodes without a Yoga node (text nodes, comments).

## References
- Ink source: `repos/ink/src/measure-element.ts`.
