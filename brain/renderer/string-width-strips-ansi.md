# `string-width` already strips ANSI — don't hand-roll the regex

`stringWidth(line)` from `string-width` calls `strip-ansi` internally
before measuring, and counts wide CJK / emoji as 2 cells. It's the
correct tool any time we need the visible column count of a rendered
line.

Don't reach for either of these alternatives:

- A hand-rolled `ANSI_ESCAPE_RE` regex + `.replace(...)` + `[...str].length`.
  That pattern double-allocates per line and undercounts wide chars.
- `[...str].length` on a stripped string. Code points ≠ display cells.

## Where it lives

- `packages/core/src/output.ts:3` already imports it; `string-width` is
  in `@vue-ink/core` dependencies.
- `packages/renderer/src/render.ts` uses it for `countReflowedRows` (the
  wrap-aware resize erase).

## Gotcha

If you import it from a package that doesn't already list `string-width`
in its own `dependencies`, add it explicitly — see
[[../ops/publint-strict-explicit-deps]].

## Related

- [[resize-reflow-erase]] — the consumer that motivated declaring
  `string-width` on the renderer package.
