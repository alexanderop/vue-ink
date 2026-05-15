# Flow-path renderer (skip the grid for pure-flow trees)

## Why

The current paint pipeline allocates a `Output` grid sized `terminalWidth × frameHeight`, walks every node writing into cells, then stringifies every row. For `FlatList(1000)` this is ~3.4ms / frame — and ~2.6ms of that is `Output.get()` stringifying 80,000 cells that are mostly unchanged (see `brain/renderer/output-hot-path.md`).

The grid exists to handle layouts that genuinely need 2D coordination — `position: 'absolute'`, `overflow: 'hidden'`, anything with overlap. Most TUIs (chats, lists, forms, dashboards) use none of these. For those trees, paint can be expressed as **string composition**: each subtree returns a list of lines, parents concatenate them. No grid, no per-cell loop, no big stringify pass — work becomes O(text length) instead of O(W × H).

This is the structural fix flagged in `brain/renderer/output-hot-path.md` under "Where the remaining gap is."

## Scope

In:
- A second paint path, `renderNodeToLines`, that returns `string[]` (one entry per visible row, each ANSI-stripped width equal to the box's Yoga-computed width).
- A root-level eligibility counter that decides per-frame which path runs.
- Parity with the grid path for every supported style: text wrap, transforms, borders, backgrounds, padding, margin, gap, justifyContent, alignItems, flex sizing.
- Both paths produce byte-identical output for eligible trees.

Out:
- Reimplementing Yoga. We still call `calculateLayout` and trust its computed widths/heights. We only replace the *composition* step (writing children into a parent buffer), not the *constraint solving* step.
- Optimizing the grid path further — that's a separate ticket.
- Per-subtree caching across paints. Natural follow-on, tracked in its own ticket once this lands.

## Design

### Mental model

> **A subtree's output is a list of lines, each pre-padded to its Yoga-computed visible width.**
> Parents compose children's lines: vertically by concatenating the arrays, horizontally by zipping them per-row.

Yoga gives us the size; we own the composition.

### The walker

```ts
// packages/core/src/render-node-to-flow.ts

type FlowOptions = {
  transformers?: OutputTransformer[];
};

// Returns exactly `yogaNode.getComputedHeight()` lines.
// Each line's visible width (ANSI-stripped) equals `yogaNode.getComputedWidth()`.
export const renderNodeToLines = (
  node: DOMElement,
  options: FlowOptions = {},
): string[] => { /* ... */ };
```

The root call is:

```ts
const lines = renderNodeToLines(rootNode);
const output = lines.join('\n');
```

No `Output` instance. No cell grid. No `styledCharsToString`.

### Per-node behaviour

**`ink-text`:**
1. `squashTextNodes(node)` — same as today.
2. If width > Yoga's measured width, `wrapText(text, width, textWrap)`.
3. Split into lines.
4. Apply `internal_transform` to each line (passing line index).
5. Pad each line to the visible width with trailing spaces (ANSI-aware padding via `stringWidth`).
6. Return.

**`ink-virtual-text`:** participated in the parent text squash — never reached as a standalone subtree here.

**`ink-box` (and `ink-root`):**
1. Read `width`, `height` from Yoga.
2. Compute inner dimensions (subtract border thickness + padding).
3. For each child with a Yoga node: call `renderNodeToLines(child)`. Collect arrays.
4. **Compose by direction:**
   - `column` / `column-reverse`: concatenate child arrays vertically. Insert `gap` blank padded lines between children. For `column-reverse`, reverse the iteration order.
   - `row` / `row-reverse`: zip per-row. For each line index `i` in `[0, innerHeight)`, concatenate `child.lines[i]` (or a blank-padded line of `childWidth` if the child has fewer lines). Insert `gap` blank columns between children.
5. **Apply `justifyContent`** along the main axis by inserting blank space before/between/after children.
6. **Apply `alignItems`** along the cross axis by padding each child to the full cross-axis size.
7. **Apply padding**: prepend/append blank lines (vertical padding); prefix/suffix each content line with spaces (horizontal padding).
8. **Apply background**: for each line, wrap blank-space regions in the bg ANSI escape. (Extract from `render-background.ts`.)
9. **Apply border**: prepend top border, append bottom border, prefix/suffix each content line with side borders. (Extract from `render-border.ts`.)
10. Pad the final line list to `height` if shorter.

**`ink-comment`:** no yoga node, contributes nothing.

### Composition: the horizontal-join detail

Row direction is the only non-trivial composition. Pseudocode:

```ts
const composeRow = (childRenders: ChildRender[], innerHeight: number): string[] => {
  const out: string[] = [];
  for (let row = 0; row < innerHeight; row++) {
    let line = '';
    for (let c = 0; c < childRenders.length; c++) {
      const child = childRenders[c];
      // Each child is pre-padded to its own width, so either reuse the line
      // at this row, or emit blank padding if the child is shorter.
      line += child.lines[row] ?? ' '.repeat(child.width);
      if (c < childRenders.length - 1) line += ' '.repeat(gap);
    }
    out.push(line);
  }
  return out;
};
```

Pre-padding by each child to its own width keeps composition O(rows × children) instead of O(rows × children × width).

### ANSI-aware string ops

Three primitives we'll need that already exist in the repo:

- `stringWidth(text)` — visible width counting full-width chars and skipping ANSI escapes. Already imported in `output.ts`.
- `sliceAnsi(text, from, to)` — already used in `output.ts` for clipping.
- `wrapText(text, width, mode)` — `packages/core/src/wrap-text.ts`.

Padding-to-width helper:

```ts
const padLineRight = (line: string, width: number): string => {
  const visible = stringWidth(line);
  if (visible >= width) return line;
  return line + ' '.repeat(width - visible);
};
```

### Borders and backgrounds — extract to shared helpers

Currently `render-border.ts` and `render-background.ts` write directly into the grid via `output.write(x, y, ...)`. Refactor each to expose a pure function:

```ts
// packages/core/src/render-border.ts (additive)
export const buildBorderLines = (
  contentLines: string[],
  width: number,
  height: number,
  style: Styles,
): string[] => { /* ... */ };
```

The grid path keeps its current write helpers (which call the new pure function internally). The flow path uses the pure function directly. One source of truth for character sets and color logic.

## Bailout rules

A tree is **flow-eligible** iff no node in the tree has any of:

- `style.position === 'absolute'`
- `style.overflow === 'hidden'`
- `style.overflowX === 'hidden'`
- `style.overflowY === 'hidden'`

If any of these are set anywhere in the tree, the entire paint falls back to the grid path. (Mixed-mode rendering — flow for parts, grid for others — is not worth the complexity; either path produces correct output for the whole tree, so we pick one per frame.)

`<Static>` subtrees are rendered separately by `renderStaticSubtrees` and never affect the live frame's eligibility check — that's already a string-based path.

## Detection

A linear walk to test eligibility every paint defeats the point. Instead, maintain a counter on the root:

```ts
// packages/core/src/dom.ts (additive)
export type DOMElement = {
  // ...existing fields...
  /**
   * Count of descendant nodes whose style disqualifies the flow path.
   * Maintained on the root via `setStyle` hooks in the host renderer. When
   * zero, the renderer takes the flow path; otherwise it falls back to grid.
   */
  internal_nonFlowCount?: number;
};
```

The host renderer (`packages/renderer/src/renderer.ts`) updates this counter when style props change:

```ts
const isNonFlowStyle = (s: Styles | undefined): boolean =>
  !!s && (
    s.position === 'absolute' ||
    s.overflow === 'hidden' ||
    s.overflowX === 'hidden' ||
    s.overflowY === 'hidden'
  );

// On `patchProp(el, 'style', prev, next)`:
const prevBad = isNonFlowStyle(prev as Styles);
const nextBad = isNonFlowStyle(next as Styles);
if (prevBad !== nextBad) {
  const root = findRoot(el);
  if (root) {
    root.internal_nonFlowCount = (root.internal_nonFlowCount ?? 0) + (nextBad ? 1 : -1);
  }
}
```

Also decrement on `removeChildNode` for any node that was bad. Easiest: store `isBad` on the node when set, check on remove. (Same pattern proposed for `hasStaticContent` caching.)

The eligibility check at paint time is then:

```ts
const useFlow = (rootNode.internal_nonFlowCount ?? 0) === 0;
```

O(1). No tree walk.

## Renderer integration

In `packages/renderer/src/render.ts`, inside `renderTree`:

```ts
const renderTree = (rootNode, terminalWidth, isScreenReaderEnabled) => {
  rootNode.yogaNode!.setWidth(terminalWidth);
  rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
  const hasStatic = hasStaticContent(rootNode);

  if (isScreenReaderEnabled) {
    // unchanged
  }

  const useFlow = (rootNode.internal_nonFlowCount ?? 0) === 0;

  let text: string;
  let height: number;

  if (useFlow) {
    const lines = renderNodeToLines(rootNode, { skipStaticElements: hasStatic });
    text = lines.join('\n');
    height = lines.length;
  } else {
    const output = new Output({
      width: rootNode.yogaNode!.getComputedWidth(),
      height: rootNode.yogaNode!.getComputedHeight(),
    });
    renderNodeToOutput(rootNode, output, { skipStaticElements: hasStatic });
    const got = output.get();
    text = got.output;
    height = got.height;
  }

  const staticOutput = hasStatic ? renderStaticSubtrees(rootNode, terminalWidth) : '';
  return { output: text, height, staticOutput };
};
```

No other callsites change. `Output` stays, the grid path stays, `renderNodeToOutput` stays. We're adding a path, not replacing one.

## Implementation milestones

Each milestone is a landable PR. Land in order; each one is shippable on its own behind a development-only env flag (`VUE_INK_FLOW_PATH=1`) until parity tests are green.

1. **Walker skeleton** — `renderNodeToLines` handling text nodes + column-direction boxes with no border, no background, no padding. ~200 LOC. Test against a hand-rolled fixture (no parity tests yet).

2. **Box composition** — padding, margin, gap, alignItems, justifyContent. The whole flex composition surface excluding row direction. Test fixtures: nested columns, aligned children, gaps.

3. **Row direction** — horizontal join, height padding for ragged children. Fixtures: row of columns, multi-line text next to short text.

4. **Borders + backgrounds** — extract `buildBorderLines` / `buildBackgroundLines` from existing modules; both paint paths consume them.

5. **`internal_transform`** — apply per-line during text rendering; compose with parent transforms via options stack (same as `renderNodeToOutput`).

6. **Eligibility counter** — `internal_nonFlowCount` on root, maintained in `patchProp` / `removeChildNode`. Unit-test the increment/decrement on style flips and subtree removal.

7. **Renderer integration** — branch in `renderTree`. Gate behind env flag.

8. **Parity test harness** — for every existing visual test under `packages/vue-ink/test/`, run it twice: once with the grid path forced, once with the flow path forced. Both must produce identical stdout. Failures here are bugs in the flow walker, not test bugs.

9. **Flip the default** — remove the env flag once parity is green for the full test suite. Grid path stays as the fallback for bail trees.

10. **Bench** — measure `FlatList(1000)` rerender. Target: <0.5ms (currently ~3.4ms). Add a flow-path-specific bench to `bench/rerender.bench.ts` so regressions surface.

## Acceptance criteria

- For every tree without `position: 'absolute'` / `overflow: 'hidden'`, the flow path produces byte-identical output to the grid path. (Parity harness from milestone 8.)
- Toggling a node's style to/from `position: 'absolute'` flips the eligibility counter correctly across mount, patch, and unmount. (Unit test.)
- `bench/rerender.bench.ts` shows `FlatList(1000)` rerender ≤ 0.5ms p50, down from ~3.4ms.
- `bench/rerender.bench.ts` shows no regression on trees that bail (matching grid-path numbers within noise).
- `Output` and `renderNodeToOutput` are unchanged.

## Measuring whether it actually got faster

The bench infra already exists — `pnpm bench` runs vitest bench against `packages/vue-ink/bench/**/*.bench.ts` with `pool: 'forks'` + `maxWorkers: 1` for low-noise runs. The targets are encoded in bench names (e.g. `FlatList(1000) — target < 1ms`), so a regression is visible without manual reading.

### Workflow

**1. Capture baseline before touching anything.**
```bash
pnpm bench 2>&1 | tee bench-baseline.txt
```
Commit `bench-baseline.txt` to a scratch branch or stash it. This is the number the change has to beat.

**2. Iterate.** Implement the milestone, then:
```bash
VUE_INK_FLOW_PATH=1 pnpm bench 2>&1 | tee bench-flow.txt
diff -u bench-baseline.txt bench-flow.txt | less
```
The `hz` column going up and `mean` going down is the win. Compare on the three scenarios that matter:
- `rerender — counter tick / FlatList(1000)` — the headline number.
- `rerender — highlight one row / FlatList(1000)` — the patchProp + repaint case.
- `rerender — spinner in deep tree / NestedBoxes(50)` — depth-driven layout cost.

**3. Confirm no regression on bail trees.** Add a scenario that uses `position: 'absolute'` (forcing the flow path to bail) and verify its numbers match the grid path within noise.

### A flow-path-specific bench

The existing benches mount once and tick. To compare paths fairly, force each path explicitly inside the bench rather than relying on the env flag (env reads happen at module load, not per bench). Add to `bench/rerender.bench.ts`:

```ts
// A render() option to force the paint path; defaults to 'auto'.
// (Add this option to render.ts under a __DEV__ guard or a non-public name.)
const mountForced = (s: Scenario, path: 'grid' | 'flow'): Scenario => {
  render(s.component, {
    stdout: createSilentStream(80),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __forcePaintPath: path,
  } as any);
  return s;
};

describe('flow path — counter tick FlatList(1000)', () => {
  const grid = mountForced(counterOverFlatList(1000), 'grid');
  bench('grid path (baseline)', async () => { grid.tick(); await flush(); });

  const flow = mountForced(counterOverFlatList(1000), 'flow');
  bench('flow path — target < 0.5ms', async () => { flow.tick(); await flush(); });
});
```

Two scenarios in the same describe block means tinybench reports them side by side with relative-speed ratios. That's the cleanest readout: *"flow path is 6.8× faster than grid for this workload."*

### What "no regression" looks like for bail trees

```ts
const counterOverAbsolute = (rows: number): Scenario => {
  const counter = shallowRef(0);
  return {
    tick: () => { counter.value += 1; },
    component: defineComponent({
      setup: () => () =>
        h(Box, { flexDirection: 'column' }, () => [
          // Anywhere in the tree disqualifies the whole frame.
          h(Box, { position: 'absolute' }, () => h(Text, null, () => 'overlay')),
          h(Text, null, () => `count: ${counter.value}`),
          ...Array.from({ length: rows }, (_, i) => h(Text, null, () => `row ${i}`)),
        ]),
    }),
  };
};

describe('flow path — bail case (position: absolute)', () => {
  const baseline = mountForced(counterOverFlatList(1000), 'grid');
  bench('pure grid (control)', async () => { baseline.tick(); await flush(); });

  const bail = mountForced(counterOverAbsolute(1000), 'flow');
  bench('asked for flow, bailed to grid', async () => { bail.tick(); await flush(); });
});
```
The two numbers should be within ~10% of each other. If "bailed to grid" is notably slower, the eligibility check is doing more work than the savings it produces — that's a bug.

### When the bench doesn't improve as expected — profile

Vitest bench runs under `tinybench` which auto-warms-up, so V8 JIT effects are usually absorbed. If the flow path bench is suspiciously slow, profile a single bench file with Node's built-in CPU profiler:

```bash
node --cpu-prof --cpu-prof-name=flow.cpuprofile \
  ./node_modules/vitest/vitest.mjs bench \
  --config packages/vue-ink/vitest.bench.config.ts \
  --run packages/vue-ink/bench/rerender.bench.ts
```

Open `flow.cpuprofile` in Chrome DevTools (Performance tab → Load profile). The flame graph shows where time actually went — typical culprits:
- `stringWidth` called too often → memoize per-line.
- `wrapText` re-running on unchanged text → cache on the node.
- A hidden `for…of` or `.map()` allocating iterators in a hot loop → switch to indexed `for`.

### Bench hygiene

- Close other CPU-heavy processes (browsers, Slack, file indexers). Bench variance on a laptop with Slack open can be ±30%.
- Run benches 2–3 times — if numbers swing by more than a few percent between runs, the machine is noisy and you need a quieter environment before drawing conclusions.
- Don't trust a 5% improvement. The variance floor on most dev machines is ±5–10%. Aim for changes that produce ≥2× speedups on the targeted scenario.
- The bench file mounts scenarios at *describe-body* evaluation time, so first-paint cost isn't measured — every `bench(...)` block is a pure steady-state rerender. That's the right measurement for this work.

### Acceptance check format

Land the change with a delta table in the PR description:

| Scenario                            | Grid (baseline) | Flow path | Speedup |
|-------------------------------------|----------------:|----------:|--------:|
| `FlatList(100)` counter tick         |          0.27ms |    0.04ms |    6.7× |
| `FlatList(1000)` counter tick        |          3.42ms |    0.41ms |    8.3× |
| `FlatList(1000)` highlight one row   |          3.18ms |    0.39ms |    8.1× |
| `NestedBoxes(50)` spinner            |          0.91ms |    0.18ms |    5.0× |
| Bail case (1000 rows + abs overlay)  |          3.40ms |    3.45ms |   ~1.0× |

The numbers above are placeholders — replace with what `pnpm bench` actually prints.

## Risks and mitigation

**Output divergence.** The biggest risk: subtle flex behaviour (gap with align-items: center, percentage widths, negative margins) where my hand-rolled composition disagrees with Yoga's. Mitigation: parity tests from milestone 8 cover every existing visual test, so regressions are caught before merge. Yoga is still authoritative for sizes — we never recompute widths/heights, we only read them.

**Maintenance burden of two paint paths.** Mitigation: extract shared logic (border drawing, background coloring, text wrapping) into pure functions both paths consume. Differences are confined to the composition step.

**Eligibility counter desync.** A miscounted increment/decrement silently sends a non-flow tree down the flow path, producing wrong output. Mitigation: unit-test the counter on every style mutation surface — `patchProp('style')`, `removeChildNode`, mount, fragment moves. Add a `__DEV__` invariant that walks the tree once per N paints and asserts the counter matches the walk.

**Caching subtree outputs later** (out of scope here but worth flagging): when we add subtree memoization, parents that read child line arrays will share references. Mutating returned arrays in place would corrupt cached output. The walker must always return fresh arrays — or freeze them. Cheap to enforce at the contract level once we get there.

## References

- `brain/renderer/output-hot-path.md` — perf breakdown that motivates this work.
- `brain/renderer/how-it-works.md` — full pipeline context.
- `packages/core/src/render-node-to-output.ts` — the grid walker. Mirror its options surface.
- `packages/core/src/output.ts` — `stringWidth`, `sliceAnsi`, `EMPTY_CELL` patterns to reuse.
- `packages/core/src/render-border.ts`, `render-background.ts` — extract pure helpers.
- `packages/core/src/wrap-text.ts`, `squash-text-nodes.ts`, `measure-text.ts` — text primitives the walker depends on.
- `tickets/p7-advanced/renderer-incremental-rendering.md` — complementary perf path (output-side diff vs. compute-side diff).
