# React Ink Test Port Status

- Tracks parity between `repos/ink/test/` and vue-ink tests.
- Read with [[api-tracker]], [[../testing/ink-strategy]], and [[test-parity-is-scenario-level]].
- Current test layout is flat: ink-equivalent tests live mostly in `packages/vue-ink/test/*.test.ts`.
- There is no `packages/vue-ink/test/behavior/` directory; any note pointing there is stale.

## Status

- Verified against `repos/ink/test/` on 2026-05-19.
- Ink test files: 47.
- Ported/equivalent: 46.
- Not applicable: `build-output.ts`; vue-ink uses workspace `pnpm typecheck` / `pnpm build` instead.
- File-level parity is effectively complete, but keep checking scenario-level coverage when upstream Ink grows.

## Recent Parity Hardening

- `text-width.tsx` is covered by `packages/vue-ink/test/TextWidth.test.ts`, plus lower-level DOM/measure tests.
- `exit.tsx` is covered by `packages/vue-ink/test/Exit.test.ts` and PTY fixtures under `packages/vue-ink/test/fixtures/exit-*.ts`.
- `focus.tsx` gaps closed 2026-05-19:
  - Esc clears focus.
  - `activeId` resets to `undefined` on Esc.
  - Shift+Tab wraps backward.
  - disabled entries are skipped when wrapping backward.
- `terminal-resize.tsx` gaps closed 2026-05-19:
  - row changes update `useWindowSize`.
  - zero `columns`/`rows` falls back to positive defaults.
  - testing-library `Stdout` exposes `rows`.
- `render.tsx` full-height regressions hardened 2026-05-19:
  - initial full-height TTY frame does not emit `clearTerminal`.
  - non-TTY full-height rerenders do not emit `clearTerminal`.
  - viewport shrink into overflow rerenders without dropping content.

## Important Mapping

- Layout/render pure tests: `Background`, `Borders`, `Display`, `Flex*`, `Gap`, `Margin`, `Overflow`, `Padding`, `Position`, `Text`, `TextWidth`, `WidthHeight`.
- Hooks/composables: `ComposablesE2E`, `useInput`, `useInputNavigation`, `usePaste`, `Focus`, `useCursor`, `AnimationBehavior`, `useBoxMetrics`, `WindowSizeBehavior`.
- Renderer/lifecycle/IO: `Render`, `RenderToString`, `Reconciler`, `RenderError`, `Exit`, `AlternateScreen`, `RenderSynchronized`, `LogUpdate`, `MeasureElement`, `MeasureText`, `CursorHelpers`, `ScreenReader`, `Kitty*`.
- Pure unit ports: `AnsiTokenizer`, `SanitizeAnsi`, `InputParser`, `ParseKeypress`.

## Audit Rule

- Do not trust file names alone.
- Compare upstream `test(...)` / `test.serial(...)` scenarios against local `it(...)` / `test(...)` scenarios.
- Port tests at behavior level, not React implementation level; Vue-specific assertions can live beside ink-equivalent cases.
