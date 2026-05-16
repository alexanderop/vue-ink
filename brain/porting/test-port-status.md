---
name: test-port-status
description: File-by-file map of every ink test (repos/ink/test/) to its vue-ink counterpart — what's ported, what's still missing, and where each one lives
metadata:
  type: project
---

# React Ink → vue-ink test port status

Companion to [[api-tracker]]. That file tracks **API parity**; this one
tracks **test parity** — every file under `repos/ink/test/` and where (or
whether) vue-ink covers the same ground.

Verified 2026-05-16 against `repos/ink/test/` (47 files) and
`packages/vue-ink/test/` + `packages/vue-ink/test/behavior/`. Last gap
closed 2026-05-16 by porting `text-width.tsx` → `TextWidth.test.ts` and
`exit.tsx` → `Exit.test.ts` (with the 14 fixtures it depends on).

Legend:

- ✅ ported — direct counterpart exists, full coverage
- ⚠️ partial — some scenarios ported, others gapped (see notes)
- ❌ not ported — no equivalent in vue-ink
- 🚫 not applicable — react-only or build-system concern

vue-ink uses two test surfaces (see [[../testing/ink-strategy]]):

- **`packages/vue-ink/test/`** — flat suite, the renderer/internal tests
- **`packages/vue-ink/test/behavior/`** — ink-equivalent behavioural tests,
  one file per ink concept

---

## Components & layout (pure render)

| ink test                       | vue-ink counterpart                                      | Status |
|--------------------------------|----------------------------------------------------------|--------|
| `background.tsx`               | `behavior/Background.test.ts` + `BackgroundColor.test.ts` | ✅     |
| `border-backgrounds.tsx`       | `behavior/BorderBackgrounds.test.ts`                     | ✅     |
| `borders.tsx`                  | `behavior/Borders.test.ts` + `Border.test.ts` + `BorderEdgeCases.test.ts` + `BoxBorderEdgeCases.test.ts` | ✅     |
| `components.tsx`               | `behavior/Components.test.ts` + `Box.test.ts`            | ✅     |
| `display.tsx`                  | `behavior/Display.test.ts`                               | ✅     |
| `flex.tsx`                     | `behavior/Flex.test.ts`                                  | ✅     |
| `flex-align-content.tsx`       | `behavior/FlexAlignContent.test.ts` + `StylesAlignContent.test.ts` | ✅     |
| `flex-align-items.tsx`         | `behavior/FlexAlignItems.test.ts`                        | ✅     |
| `flex-align-self.tsx`          | `behavior/FlexAlignSelf.test.ts`                         | ✅     |
| `flex-direction.tsx`           | `behavior/FlexDirection.test.ts`                         | ✅     |
| `flex-justify-content.tsx`     | `behavior/FlexJustifyContent.test.ts`                    | ✅     |
| `flex-wrap.tsx`                | `behavior/FlexWrap.test.ts`                              | ✅     |
| `gap.tsx`                      | `behavior/Gap.test.ts`                                   | ✅     |
| `margin.tsx`                   | `behavior/Margin.test.ts`                                | ✅     |
| `padding.tsx`                  | `behavior/Padding.test.ts`                               | ✅     |
| `overflow.tsx`                 | `behavior/Overflow.test.ts`                              | ✅     |
| `position.tsx`                 | `behavior/Position.test.ts` + `StylesPosition.test.ts` + `BoxPositionEdgeCases.test.ts` | ✅     |
| `width-height.tsx`             | `behavior/WidthHeight.test.ts`                           | ✅     |
| `text.tsx`                     | `behavior/Text.test.ts` + `Text.test.ts` + `TextStyles.test.ts` + `Colorize.test.ts` + `TextWrapTruncateAlias.test.ts` + `WrapText.test.ts` | ✅     |
| `text-width.tsx`               | `TextWidth.test.ts` + `Dom.test.ts` + `MeasureText.test.ts` | ✅     |

**`text-width.tsx` port:** 13/13 cases ported in `TextWidth.test.ts`.
Porting surfaced a real renderer bug — the boundary cleanup that ink
runs in `output.ts` when an absolute overlay lands inside a wide
character was missing from vue-ink. Fixed in
`packages/core/src/output.ts` (mirrors ink's cleanup before and after
the write loop).

---

## Composables / hooks

| ink test                         | vue-ink counterpart                              | Status |
|----------------------------------|--------------------------------------------------|--------|
| `hooks.tsx`                      | `ComposablesE2E.test.ts`                         | ✅     |
| `hooks-use-input.tsx`            | `behavior/useInput.test.ts` + `Input.test.ts`    | ✅     |
| `hooks-use-input-navigation.tsx` | `behavior/useInputNavigation.test.ts`            | ✅     |
| `hooks-use-input-kitty.tsx`      | `KittyKeyboard.test.ts` + `KittyAdvancedKeys.test.ts` + `KittyCtrlC.test.ts` + `KittyKeyboardAuto.test.ts` | ✅     |
| `hooks-use-paste.tsx`            | `behavior/usePaste.test.ts`                      | ✅     |
| `focus.tsx`                      | `behavior/Focus.test.ts`                         | ✅     |
| `cursor.tsx`                     | `behavior/useCursor.test.ts`                     | ✅     |
| `use-animation.tsx`              | `behavior/AnimationBehavior.test.ts`             | ✅     |
| `use-box-metrics.tsx`            | `behavior/useBoxMetrics.test.ts` + `MeasureElement.test.ts` | ✅     |
| `terminal-resize.tsx`            | `behavior/WindowSizeBehavior.test.ts` + `ComposablesE2E.test.ts` | ✅     |

---

## Renderer / lifecycle / IO

| ink test                  | vue-ink counterpart                                      | Status |
|---------------------------|----------------------------------------------------------|--------|
| `render.tsx`              | `RenderMisc.test.ts` + `RenderInstances.test.ts` + `RenderInteractive.test.ts` + `RenderOnRender.test.ts` + `RenderThrottle.test.ts` | ✅     |
| `render-to-string.tsx`    | `RenderToString.test.ts`                                 | ✅     |
| `reconciler.tsx`          | `Reconciler.test.ts`                                     | ✅     |
| `errors.tsx`              | `RenderError.test.ts`                                    | ✅     |
| `exit.tsx`                | `Exit.test.ts` (PTY) + `Lifecycle.test.ts` (in-process)  | ✅     |
| `alternate-screen-example.tsx` | `AlternateScreen.test.ts`                           | ✅     |
| `write-synchronized.tsx`  | `RenderSynchronized.test.ts`                             | ✅     |
| `log-update.tsx`          | `LogUpdate.test.ts`                                      | ✅     |
| `measure-element.tsx`     | `MeasureElement.test.ts` + `behavior/MeasureElement.test.ts` | ✅     |
| `measure-text.tsx`        | `MeasureText.test.ts`                                    | ✅     |
| `cursor-helpers.tsx`      | `CursorHelpers.test.ts`                                  | ✅     |
| `screen-reader.tsx`       | `behavior/ScreenReader.test.ts` + `ScreenReaderEnv.test.ts` + `behavior/AriaLabelOnText.test.ts` + `behavior/AriaAllRoles.test.ts` | ✅     |
| `kitty-keyboard.tsx`      | `KittyKeyboard.test.ts` + `KittyAdvancedKeys.test.ts` + `KittyKeyboardAuto.test.ts` | ✅     |

**`exit.tsx` port:** 14/14 cases ported in `Exit.test.ts`. Fixtures live
under `packages/vue-ink/test/fixtures/exit-*.ts`; the runner is
`fixtures/runFixture.ts` (single-shot spawn-and-collect) plus an inline
`pty.spawn` for the bidirectional `exit-double-raw-mode` test. Porting
surfaced two real bugs:

1. **stdin keep-alive leak.** `setRawMode(false)` paused stdin but
   didn't `unref()` it, so processes that touched raw mode never exited
   cleanly. Fixed in `packages/renderer/src/input.ts` (mirrors ink's
   `disableRawMode` in `App.tsx`).
2. **`env.CI` truthiness check.** vue-ink's `isCiEnv()` treats any
   truthy value — including the string `'false'` — as "in CI". The PTY
   runner now *deletes* `CI` from the child env rather than setting it
   to `'false'`, otherwise the renderer falls into non-interactive mode
   and `<Static>` isn't emitted. Captured in `fixtures/runFixture.ts`
   so the trap is in one place. Consider tightening `isCiEnv()` to
   parse the string (`'false'`/`'0'`/`''` → false).

---

## Pure unit tests (`.ts`, no JSX)

| ink test            | vue-ink counterpart                                  | Status |
|---------------------|------------------------------------------------------|--------|
| `ansi-tokenizer.ts` | `AnsiTokenizer.test.ts`                              | ✅     |
| `sanitize-ansi.ts`  | `SanitizeAnsi.test.ts` + `SanitizeAnsiUnit.test.ts`  | ✅     |
| `input-parser.ts`   | `InputParser.test.ts` + `InputParserProperties.test.ts` | ✅     |
| `parse-keypress.ts` | `ParseKeypress.test.ts`                              | ✅     |
| `build-output.ts`   | —                                                    | 🚫     |

`build-output.ts` shells out to `execSync('tsc')` and asserts that ink's
`dist/` compiles cleanly. vue-ink's equivalent is the workspace
`pnpm typecheck` and `pnpm build` in CI — no test file needed.

---

## vue-ink tests with no direct ink equivalent

These exist because vue-ink has either a different reactivity model or
internal helpers that aren't reachable through Box/Text alone. Keep them.

| vue-ink test                          | What it covers                                              |
|---------------------------------------|-------------------------------------------------------------|
| `Dom.test.ts`                         | Host-DOM helpers (`appendChildNode`, text measurement) — unreachable through `<Box>`/`<Text>` alone |
| `Output.test.ts`                      | `Output` class (renderer-internal frame buffer)             |
| `RenderNodeToOutput.test.ts`          | The render walker that turns yoga nodes into ANSI rows      |
| `Newline.test.ts` + `NewlineEdgeCases.test.ts` | `<Newline>` + nested-text-inside-text edge cases |
| `Spacer.test.ts` + `SpacerVertical.test.ts` | `<Spacer>` in row + column flex                       |
| `Static.test.ts` + `StaticEdgeCases.test.ts` | `<Static>` renderer-side dedup ([[../renderer/static-dedup]]) |
| `Transform.test.ts` + `TransformEdgeCases.test.ts` | `<Transform>` + `accessibilityLabel` extension    |
| `Styles.test.ts` + `StylesAspectRatio.test.ts` + `SquashStylesEdge.test.ts` | Style coercion pipeline |
| `PatchConsole.test.ts`                | `patchConsole` option                                       |
| `Devtools.test.ts`                    | `@vue/devtools` integration ([[../renderer/how-it-works]])  |
| `VueInkLauncher.test.ts`              | Public entrypoint smoke test                                |
| `WaitUntilRenderFlush.test.ts`        | Vue-specific `nextTick`-aware flush helper                  |
| `InputMultiListener.test.ts`          | Multiple `useInput` listeners on one stdin                  |
| `InkCompatTypes.test.ts`              | Re-exported ink-compat type aliases ([[api-tracker#type-aliases-ink-compat-re-exports]]) |
| `Counter.test.ts`                     | Reactive counter end-to-end smoke test                      |
| `CoverageStragglers.test.ts` + `FinalCoverage.test.ts` | One-off branches needed for 100% coverage          |
| `behavior/IncrementalRendering.test.ts` | `incrementalRendering: true` option (vue-ink extension)   |

---

## Summary

- **Files in `repos/ink/test/`:** 47
- **Ported with full equivalent:** 46
- **Not applicable:** 1 (`build-output.ts`)
- **No direct port pending:** 0

### Gaps worth filling

_None — full parity reached 2026-05-16._

---

## Related

- [[api-tracker]] — API parity (what code is ported)
- [[from-react-ink]] — porting field notes
- [[../testing/ink-strategy]] — how ink tests itself, what vue-ink borrowed
- [[../principles/prove-it-works]] — why we keep the test suite honest
