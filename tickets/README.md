# Vue-Ink Feature Parity Tickets

Tickets for closing the gap between [`ink`](https://github.com/vadimdemedes/ink) (React) and `vue-ink`. The reference Ink source lives in `repos/ink/` (read-only) — open it before guessing semantics.

Tickets are organized into **priority tiers** (`p0` → `p7`). Lower number = ship sooner. Each filename keeps its original area (`styles-`, `renderer-`, `components-`, `hooks-`, `input-`, `accessibility-`) so context isn't lost.

## Where to start

Open **[`p0-foundation/styles-borders.md`](./p0-foundation/styles-borders.md)** first. It's the single largest visible-parity win and has no dependencies blocking it. Run the other P0 tickets in parallel as quick-win slots.

## Tiers

### `p0-foundation/` — Ship next sprint
Visible-parity wins + one silent correctness fix. Release theme: *"Vue-Ink now renders real TUIs."*

- `styles-borders.md` — **start here**, biggest single ticket
- `styles-background-color.md` — pairs with borders in the same render pass
- `renderer-sanitize-ansi.md` — silent correctness bug, cheap to fix
- `renderer-output-correctness.md` — four ≤5-line silent-correctness bugs (padding, overflow clip, yoga leak, BSU gating) surfaced by the 2026-05-15 review
- `release-build-artifacts.md` — packages currently can't be consumed off-workspace; ship real `dist/` + `.d.ts` + exports map
- `components-newline.md` · `components-spacer.md` · `components-transform.md` — half-day quick wins

### `p1-input/` — Strategic unlock: real interactivity
Without a real keypress parser, vue-ink is a renderer, not a TUI framework. Pulled *earlier* than a strict dependency order would suggest — it gates focus, paste, kitty, and `useInput` correctness.

- `input-keypress-parser.md`
- `input-bracketed-paste.md`
- `input-kitty-keyboard.md`
- `input-regression-fixes.md` — five small ink-divergence fixes (20ms esc-flush, setEncoding, ref/unref, paste→input fallback, Esc clears focus)

### `p2-plumbing-and-hooks/` — Renderer hardening + cheap hook surface
Infra-flavored but each ticket is small. Bundle them. Several P3+ tickets depend on this tier.

Renderer: `instances-registry`, `interactive-detection`, `stderr-option`, `patch-console`, `synchronized-output`, `on-render-callback`, `wait-until-render-flush`.
Hooks: `use-stdout`, `use-stderr`, `use-window-size`, `use-is-screen-reader-enabled`.
Styles: `aspect-ratio`, `align-content`, `position` (gates `<Static>`).
Testing: `testing-pty-harness.md` — consolidate fake-stdin/fakeKey helpers and add a `term(fixture)` PTY runner with ~10 minimum-viable fixtures.

### `p3-focus-and-paste/` — Build real forms/menus
Depends on `p1-input/`. Release theme: *"Build a multi-pane TUI in Vue."*

- `hooks-use-focus.md`
- `hooks-use-focus-manager.md`
- `hooks-use-paste.md`
- `composables-semantics-fixes.md` — lazy non-TTY throw + `disable/enableFocus` semantics + wire `isFocused` through `isFocusEnabled`

### `p4-layout-hooks/` — Yoga-aware composables
- `renderer-measure-element.md`
- `hooks-use-box-metrics.md`
- `hooks-use-cursor.md`

### `p5-static-and-animation/` — The "log + spinner" killer combo
Depends on `styles-position.md` from P2.

- `components-static.md`
- `renderer-render-throttle.md`
- `hooks-use-animation.md`

### `p6-accessibility/`
- `accessibility-screen-reader-mode.md`
- `accessibility-aria-props.md`

### `p7-advanced/` — Capstone / optional
- `renderer-render-to-string.md` — **promotable** to P0/P1 if test-authoring friction becomes the bottleneck.
- `components-error-boundary.md` — DX polish.
- `renderer-alternate-screen.md` — specialist use case.
- `renderer-incremental-rendering.md` — defer until profiling proves need.

## Prioritization rationale

This order weighs **user-visible value × strategic unlock × effort**, not strict topological dependency order. Notable calls:

1. **Borders first.** Demo-stopper with zero blockers; biggest perceived-parity win.
2. **Input parser jumps ahead of renderer plumbing.** Renderer plumbing isn't visible; real input is the gate to everything interactive.
3. **Hooks bundle with the plumbing that backs them** (P2) instead of getting their own tier — they're trivial wrappers once the contexts exist.
4. **`renderer/render-to-string` is in P7 but flagged movable** — promote it if writing tests for P0–P2 work hurts.

## Ticket conventions

Each ticket is self-contained: motivation, scope, acceptance criteria, references to Ink source under `repos/ink/`.
