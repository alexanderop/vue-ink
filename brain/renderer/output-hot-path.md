# `Output.get()` dominates the re-render frame budget

For a steady-state re-render (one ref changes, tree shape unchanged), the cost
breakdown for `FlatList(1000)` is:

| Phase                              | Time   |
| ---------------------------------- | ------ |
| Yoga `calculateLayout` (clean)     | ~0ms   |
| `renderNodeToOutput` tree walk     | ~0.8ms |
| `Output.get()` (apply + stringify) | ~2.6ms |

So **Yoga is free** (its dirty bits short-circuit clean subtrees), and the
re-render bottleneck lives in `packages/core/src/output.ts`.

## What used to hurt

The original `Output.get()` did three things that all scaled as
`O(width × height)` regardless of how much was actually drawn:

1. **Allocated a fresh `StyledChar` object per cell** — for an 80×1000 frame,
   80 000 `{type, value, fullWidth, styles: []}` objects per paint.
2. **`line.filter(item => item !== undefined)`** before joining — the rows
   were always fully populated, so the filter was a wasted second walk.
3. **`styledCharsToString(line)`** ran a `Set`-based ANSI diff against the
   previous cell — for every one of the 80 000 cells, even rows where
   nothing was styled at all.

The combined cost was ~13ms / frame for `FlatList(1000)`.

## What the hot path looks like now

- **Shared `EMPTY_CELL` sentinel.** All initial cells point at the same frozen
  object. Writes replace slots wholesale, so it's safe.
- **Sparse rows + lazy alloc.** `output[y]` is `undefined` until something
  writes to row `y`. Untouched rows emit `""` without scanning.
- **Per-row `rowEnds[y]`.** Tracks the column past the last written cell.
  Stringify never walks trailing space that `trimEnd()` would discard.
- **`stringifyRow` fast path.** Scans the row's `[0, end)` window once. If
  no cell has any style, it concatenates `cell.value` directly — no ANSI
  diff, no `Set` allocations, no `styledCharsToString` call.
- **Classic for-loops** over `lines` and `characters`. `for…of` allocates an
  iterator object per call site, which mattered when the inner loop fired
  ~1000 times per frame.

After this, `Output.get()` for `FlatList(1000)` runs in ~2.6ms instead of
~12ms, and `FlatList(100)` paints in ~0.26ms instead of ~1.1ms.

## Where the remaining gap is

`FlatList(1000)` re-render is ~3.4ms — still over the <1ms goal. The
remaining `Output.get()` cost is mostly "do `O(width × height)` work even
though one cell changed". Closing this requires real dirty tracking:

- **`renderNodeToOutput`**: cache per-node write contribution and skip
  clean subtrees instead of re-walking 1000 ink-texts on every frame.
- **`Output.get()`**: hash per-row write inputs and reuse the previous
  stringified row when nothing in that row changed.

Both are bigger redesigns than micro-opts.

## Tracked by

- [[../../packages/vue-ink/bench/rerender.bench.ts]] — counter tick,
  one-row highlight, deep-tree spinner. The thresholds in the bench names
  (`< 0.5ms`, `< 1ms`) are the user-facing targets.
- `renderer-core.bench.ts` — paint-only numbers; useful to disambiguate
  whether a regression sits in the renderer hot path or in Vue glue.

## Invariants worth not breaking

- The `EMPTY_CELL` sentinel is shared and must never be mutated. Writes
  replace slots, they don't edit cells in place. Anything that mutates
  `cell.styles` or `cell.value` will corrupt every untouched cell in the
  frame.
- `stringifyRow`'s fast path assumes any sparse hole (`undefined`) is a
  default-style space. If a future writer ever puts a hole next to a
  styled cell on purpose, the slow path's `?? EMPTY_CELL` fill keeps the
  output correct.
- `rowEnds[y]` is the column **past** the last written cell — so a write
  of `"row 5"` at `x=0` leaves `rowEnds[y] === 5`, and stringify iterates
  `[0, 5)`. Off-by-one here silently truncates content.
