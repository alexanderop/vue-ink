# How vue-ink works, from first principles

Foundational mental model. Read this before the gotcha notes
([[yoga-vs-dom-indices]], [[nested-text-must-be-virtual]],
[[output-hot-path]], [[input-pipeline]]) — those make a lot more sense
once you hold the whole pipeline in your head.

## 1. A terminal is a dumb byte stream

There is no DOM. There are no "widgets." `stdout` is an append-only
stream of bytes; the terminal reads them and paints characters at the
cursor's current position, then advances the cursor. Writing `hi\n` is
literally three bytes hitting the screen one after another.

All "rich" behaviour — colors, cursor movement, line clears — is encoded
as **ANSI escape sequences**: special byte strings the terminal
interprets instead of printing.

| Sequence    | Meaning                          |
|-------------|----------------------------------|
| `\x1b[31m`  | switch foreground to red         |
| `\x1b[0m`   | reset all styles                 |
| `\x1b[2A`   | move cursor up 2 rows            |
| `\x1b[2K`   | erase current line               |
| `\x1b[?25l` | hide cursor                      |

A red "Hello" is literally the bytes `\x1b[31mHello\x1b[0m`. Every TUI,
including vim, htop, and Ink, is "just" a clever stream of these.

## 2. The frame illusion

vue-ink fakes a 2D screen on top of that one-dimensional stream by
treating N lines as a virtual canvas:

1. Build a 2D grid of `{char, style}` cells in memory.
2. Stringify it into one big block of text with ANSI codes embedded.
3. Write it to stdout.
4. On the next render: emit `\x1b[<N>A` to rewind the cursor over the
   previous frame, then write the new frame on top.

That's the entire "live updating UI" illusion — repeated overwrites of
the same N lines. Implemented in `packages/core/src/output.ts` and
`packages/renderer/src/render.ts`.

## 3. The pipeline

```
your <Box>/<Text> components
        ↓  (Vue createRenderer → custom host config)
tree of ink-box / ink-text / ink-virtual-text nodes
        ↓  (Yoga.calculateLayout)
each node gets {left, top, width, height} in character cells
        ↓  (renderNodeToOutput)
2D grid of {char, style} cells (Output)
        ↓  (Output.get → stringifyRow)
one string with ANSI escapes + newlines
        ↓  (Renderer.write)
stdout — preceded by cursor-rewind escapes
```

Each stage has a single job. None of them know about the next:

- **Vue reconciler** (`packages/renderer/src/renderer.ts`) — turns SFCs
  into a tree of nodes by calling our host hooks (`createElement`,
  `insert`, `remove`, `patchProp`). Nodes live in
  `packages/core/src/dom.ts`. The reconciler doesn't know layout
  exists.
- **Yoga** (WASM flexbox engine) — every `ink-box` owns a `yogaNode`
  with `flexDirection` / `padding` / `flexGrow` etc. forwarded to it.
  After tree mutation we call `yoga.calculateLayout(termColumns,
  undefined, LTR)` and Yoga fills in pixel-free coordinates measured in
  **character cells**. `<Text>` nodes use a custom **measure function**
  so Yoga knows how tall they are after wrapping.
- **`renderNodeToOutput`** (`packages/core/src/render-node-to-output.ts`)
  — walks the laid-out tree and writes each cell into the `Output`
  grid: `output.write(x, y, char, styles)`.
- **`Output.get()`** (`packages/core/src/output.ts`) — turns the grid
  into a string. This is the **hot path** for re-renders; see
  [[output-hot-path]].
- **`Renderer`** (`packages/renderer/src/renderer.ts`) — owns stdout,
  the cursor-rewind logic, and the frame throttle (`maxFps`).

## 4. Why Yoga

Without Yoga you'd hand-compute the (x, y) of every character. That's
re-implementing flexbox poorly. Yoga gives us:

- The full CSS-flexbox vocabulary (`flexDirection`, `flexGrow`,
  `justifyContent`, `padding`, `gap`, `position: 'absolute'`, ~50 props)
  as thin pass-throughs — we forward style props, we don't implement
  layout.
- **Free dirty tracking.** Yoga marks clean subtrees and short-circuits
  re-layouts. A steady-state re-render where one ref changes spends
  ~0ms in Yoga (see [[output-hot-path]]). The frame budget lives in
  `Output.get()`, not layout.
- **Resize is one call.** On `SIGWINCH` we re-run `calculateLayout` with
  the new column count; every node's position updates.

Yoga **only** computes coordinates. It doesn't paint, doesn't know
about terminals, doesn't know about text content (except via the
measure callback). Pure math.

## 5. Text is special

Yoga lays out boxes, but a `<Text>` node has to know its **own**
dimensions: how wide is `"hello"`, how tall is it after wrapping to
20 columns? We register a measure function on the text node's yoga
node — Yoga calls it during layout with the available width, and we
return `{width, height}` after accounting for full-width characters,
emoji, ANSI styles that don't count toward width, and wrap mode.

The **nested-text problem** is its own gotcha: Yoga aborts if you
`insertChild` into a node that has a measure function. So nested
`<Text>` inside `<Text>` must be rewritten to `ink-virtual-text` (no
yoga node, just a DOM-level string container). See
[[nested-text-must-be-virtual]].

## 6. Input is the reverse pipeline

Terminals send keystrokes to `stdin` as bytes — and just like output,
"special" keys are ANSI escapes:

- arrow up → `\x1b[A`
- Ctrl-C → `0x03`
- F1 → `\x1bOP`
- a regular `a` → `0x61`

We put stdin into **raw mode** (no line buffering, no echo) so we see
each keystroke immediately. Then a parser turns the byte stream into
key events, dispatches to `useInput` / `useFocus` handlers, your
reactive state updates, Vue schedules a re-render, the pipeline runs,
new frame to stdout.

Three-layer pipeline: byte parser → keypress aggregator → handler
dispatch. Details (and why `readline.emitKeypressEvents` is wrong) in
[[input-pipeline]].

## 7. DOM ≠ Yoga ≠ Output

Three trees, three coordinate systems, three indexing schemes. They
look similar enough that you'll mix them up:

| Tree         | Lives in                  | Contains                              | Indexed by                  |
|--------------|---------------------------|---------------------------------------|-----------------------------|
| DOM          | `packages/core/src/dom.ts`| All nodes incl. text/comments/virtual | `childNodes` index          |
| Yoga         | inside each `ink-box`     | Only nodes with `yogaNode`            | yoga child index            |
| Output grid  | `packages/core/src/output.ts` | Cells `{char, styles}`            | `(x, y)` in character cells |

The biggest landmine: **DOM child index ≠ Yoga child index**, because
comment anchors (from `v-for`, `v-if`) occupy DOM slots but no yoga
slot. Use `toYogaIndex(childNodes, domIndex)`. See
[[yoga-vs-dom-indices]].

## 8. The frame loop, end to end

For a single re-render triggered by `ref.value++`:

1. Vue's reactivity system marks effects dirty, schedules a flush.
2. On flush, Vue walks the component subtree, calling our host hooks
   to mutate the DOM tree (`createElement`, `patchProp`, `insert`,
   `remove`).
3. As DOM mutates, we forward style changes to Yoga
   (`yoga.setFlexDirection(...)`).
4. After the mutation pass, the renderer fires its `onRender` queue
   → `calculateLayout` → walk → `Output.get()` → `stdout.write`.
5. The frame throttle (`maxFps`, default 30) coalesces bursts so a
   sync flurry of state changes paints once.
6. The terminal repaints the rewound lines.

For a steady-state tick (FlatList of 1000 items, one row's color
flips):

- Yoga: ~0ms (dirty bits)
- `renderNodeToOutput`: ~0.8ms
- `Output.get()`: ~2.6ms ← the bottleneck
- stdout write: trivial

That's why the hot-path work has been in `Output.get()`, not Yoga.

## 9. What this buys us

The whole architecture is "flexbox + reconciler, but the units are
characters and the canvas is one terminal scrollback region." Every
piece is a well-understood building block:

- React/Vue components — declarative UI.
- React-reconciler / `createRenderer` host hooks — the standard escape
  hatch for "render to a custom backend."
- Yoga — battle-tested layout engine (same one in React Native).
- ANSI escapes — 1970s standard, supported everywhere.
- raw-mode stdin — POSIX since forever.

vue-ink (and Ink) are the glue. There's no novel rendering or layout
algorithm — the cleverness is in noticing these pieces compose into a
TUI framework.

## Where to read the source

- Reconciler glue: `packages/renderer/src/renderer.ts`
- Custom "DOM" nodes: `packages/core/src/dom.ts`
- Tree → grid: `packages/core/src/render-node-to-output.ts`
- Grid → string: `packages/core/src/output.ts`
- Input pipeline: `packages/renderer/src/input/`
- Vendored React Ink (read-only ground truth): `repos/ink/src/`

## Related

- [[yoga-vs-dom-indices]] — the DOM ≠ Yoga index gotcha in detail.
- [[nested-text-must-be-virtual]] — why nested `<Text>` rewrites to
  `ink-virtual-text` and where it happens.
- [[output-hot-path]] — perf numbers for `Output.get()` and what the
  remaining budget looks like.
- [[input-pipeline]] — three-layer stdin parsing and why
  `readline.emitKeypressEvents` is wrong.
- [[../porting/from-react-ink]] — applied differences vs. React Ink for
  anyone porting an app.
