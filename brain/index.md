# Brain

## Principles

- [[principles/boundary-discipline]]
- [[principles/cost-aware-delegation]]
- [[principles/encode-lessons-in-structure]]
- [[principles/exhaust-the-design-space]]
- [[principles/experience-first]]
- [[principles/fix-root-causes]]
- [[principles/foundational-thinking]]
- [[principles/guard-the-context-window]]
- [[principles/host-decisions-at-component-layer]] — when the renderer can't see parent context, push the decision into provide/inject
- [[principles/make-operations-idempotent]]
- [[principles/migrate-callers-then-delete-legacy-apis]]
- [[principles/mirror-upstream-conventions]]
- [[principles/never-block-on-the-human]]
- [[principles/outcome-oriented-execution]]
- [[principles/prove-it-works]]
- [[principles/redesign-from-first-principles]]
- [[principles/serialize-shared-state-mutations]]
- [[principles/single-flight-mutable-bridges]] — ordering contracts for mutable global handles (LIFO, deferred drain, stale-no-op)
- [[principles/subtract-before-you-add]]
- [[principles/surgical-changes]] — touch only what the task requires; surface adjacent issues as separate todos
- [[principles/vendor-source-beats-documentation]]

## Renderer

- [[renderer/how-it-works]] — first-principles mental model; read this first
- [[renderer/yoga-vs-dom-indices]]
- [[renderer/nested-text-must-be-virtual]]
- [[renderer/output-hot-path]]
- [[renderer/input-pipeline]]
- [[renderer/static-dedup]] — why `<Static>` dedup happens in the renderer, not the component
- [[renderer/layout-listeners]] — post-commit hook for Yoga-aware composables; the resize listener is now unconditional
- [[renderer/screen-reader]] — aria-\* props on Box/Text feed a separate walker when `isScreenReaderEnabled` is on
- [[renderer/no-sfc-components]] — why internal components are `defineComponent + h()`, not `.vue` SFCs
- [[renderer/kitty-detection]] — `auto` mode listens on stdin before the input pipeline mounts; startup-window race
- [[renderer/console-patch]] — `patchConsole` subscribers fan out to every active renderer, not just the matching stdout
- [[renderer/ci-detection]] — `isCiEnv()` parses falsy strings correctly; presence-only vars still flip non-interactive
- [[renderer/host-portability]] — guards that keep `render()` callable from non-Node hosts (browser playground)
- [[renderer/wide-char-overlay-cleanup]] — overlay frame clears half of a wide char left behind by a previous frame
- [[renderer/debug-mode-write-replay]] — `useStdout/useStderr.write()` in `debug: true` must be a single combined write; also fixed mount-time double-paint
- [[renderer/text-outside-text-silently-dropped]] — raw strings inside `<Box>` produce empty output instead of ink's invariant error
- [[renderer/box-element-expose]] — `$element` proxy wiring so composables can reach the host node
- [[renderer/keyed-move-yoga-lifetime]] — keyed v-for moves vs Yoga node lifetime in the reconciler
- [[renderer/no-module-state-in-render]] — module-scope counters/state leak across renderers (still-live: `focusIdCounter`)
- [[renderer/wait-until-exit-beforeexit]] — Node-exit subtlety; `beforeExit` vs `exit` ordering for `waitUntilExit`
- [[renderer/resize-reflow-erase]] — width-shrink resize needs a wrap-aware erase; ink's `log.clear()` is incomplete

## Components

- [[components/static-generics]] — why `<Static>` keeps `items: unknown[]` instead of going generic
- [[components/create-context-pattern]] — `[useFoo, provideFoo] = createContext<T>(name)` ergonomics; what it buys and what it doesn't
- [[components/inject-needs-explicit-default]] — `inject(key)` without default returns `undefined` and produces NaN layout
- [[components/shadcn-vue-pattern-transfer]] — what transfers from shadcn-vue patterns
- [[components/vue-boolean-prop-tristate]] — Vue boolean props are tri-state; border-edge footgun

## Composables

- [[composables/vueuse-patterns]]
- [[composables/use-animation-divergences]] — `Date.now()` non-monotonicity and pause-zeroes-state divergences from ink's `useAnimation`
- [[composables/use-cursor-positioning]] — absolute cells, not box-relative; blink fight with the host terminal

## Testing

- [[testing/ink-strategy]]
- [[testing/file-per-concept]] — one flat folder, one file per concept; supersedes layout-drift
- [[testing/subprocess-ci-env]] — PTY fixtures must delete CI/BUILD_NUMBER/RUN_ID, not override them
- [[testing/hoist-pure-helpers]] — top-of-file helpers Claude keeps reinventing inside test bodies
- [[testing/pnpm-filter-name]] — `pnpm --filter <name>` resolves package names, not folder paths
- [[testing/property-tests]] — when fast-check pays back; bugs it found; recurring patterns
- [[testing/capture-composable-from-setup]] — port idiom for tests that need a composable's imperative API alongside a rendered tree
- [[testing/kitty-parser-tests-live-in-parsekeypress]] — kitty CSI-u parser scenarios belong in `ParseKeypress.test.ts`, not `InputParser.test.ts`
- [[testing/monaco-hover-e2e]] — driving Monaco's Volar hover from Playwright (widget selector, warmup, mouse bounce)
- [[testing/vite-preview-ipv6]] — Vite 7 preview binds to `::1`; Playwright `baseURL` must use `localhost`, not `127.0.0.1`
- [[testing/vitest-bench-no-lifecycle-hooks]] — `beforeEach`/`afterEach` are no-ops in `bench(...)`; silently produces wrong numbers
- [[testing/vitest-parallelism]] — Vitest 4 parallelism knobs and migration gotcha
- [[testing/mutation-testing]] — Stryker + pnpm workspace aliases; avoid false no-coverage via original symlinked packages

## Reviews

- [[reviews/vue-port-code-quality-2026-05-19]]

## Porting

- [[porting/from-react-ink]] — idiom translations, lifecycle gotchas, common mistakes
- [[porting/api-tracker]] — flat ✅/❌ checklist of every ink API and where vue-ink implements it
- [[porting/test-port-status]] — file-by-file map of ink's test suite to vue-ink's, with the remaining gaps called out
- [[porting/inlined-deps-lose-edge-cases]] — where vue-ink inlines what ink imports as a tiny package, the edge cases get dropped
- [[porting/tracker-drift]] — parity trackers drift; verify against `repos/ink/` first
- [[porting/test-parity-is-scenario-level]] — file-level test mapping ≠ scenario-level coverage; count `test(...)` blocks, not files
- [[porting/ink-open-pain-points]] — strategic gaps in ink itself that vue-ink can lead on

## Apps / Playground

- [[apps/playground-deploy]] — production build + Vercel pipeline entry point
- [[apps/playground-dual-execution]] — Monaco edits one bundle; user code runs in another. Read first
- [[apps/playground-blob-imports]] — module-pinning leak from generating new Blob URLs per render
- [[apps/playground-url-import-meta-trap]] — `new URL('./foo.ts', import.meta.url)` is a prod-only proxy footgun (fixed)
- [[apps/playground-dts-bundle]] — bundling vue-ink type defs for Monaco IntelliSense
- [[apps/playground-dts-component-any]] — generated `.d.ts` widens component prop types to `any`
- [[apps/playground-monaco-types]] — wiring types into Monaco for IntelliSense
- [[apps/playground-setfiles-wipes-hidden-files]] — `store.setFiles()` is a wholesale replace; mutate `File.code` instead
- [[apps/playground-pnpm-polyfill-shims]] — `vite-plugin-node-polyfills` pin and shim layout
- [[apps/playground-repl-theming]] — REPL theme integration
- [[apps/playground-vue-bind-shorthand]] — don't normalize `padding:="1"` to `:padding="1"`; constraint comes from the dts bundle

## Ops

- [[ops/agent-skill-paths]] — `.agents/skills/` is inert; the active path is `.claude/skills/`
- [[ops/agent-hooks]] — PreToolUse/PostToolUse hook wiring for the harness
- [[ops/claude-md-symlink]] — CLAUDE.md is a symlink to AGENTS.md
- [[ops/roadmap-drift]] — ROADMAP.md ships as a wishlist; verify scope against current code
- [[ops/shallow-clone-rebase]] — squash-imported `repos/` subtrees need rebase tricks
- [[ops/vueink-workspace-types-are-raw-ts]] — workspace `vueink` types resolve to raw TS
- [[ops/lefthook-stage-fixed-trap]] — `stage_fixed: true` can swallow lefthook reformat changes; lost-commit risk
- [[ops/macos-case-rename-trap]] — case-only PascalCase renames on macOS cause CI duplicate-file failure
- [[ops/no-plusplus-lint]] — `no-plusplus` lint blocks pre-commit; use `+= 1`
- [[ops/testing-library-dist-is-tracked]] — `packages/testing-library/dist/` is the only tracked `dist/`; use `git add -u`, not `-f`
