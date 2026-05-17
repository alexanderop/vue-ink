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
- [[principles/make-operations-idempotent]]
- [[principles/migrate-callers-then-delete-legacy-apis]]
- [[principles/never-block-on-the-human]]
- [[principles/outcome-oriented-execution]]
- [[principles/prove-it-works]]
- [[principles/redesign-from-first-principles]]
- [[principles/serialize-shared-state-mutations]]
- [[principles/subtract-before-you-add]]

## Renderer

- [[renderer/how-it-works]] — first-principles mental model; read this first
- [[renderer/yoga-vs-dom-indices]]
- [[renderer/nested-text-must-be-virtual]]
- [[renderer/output-hot-path]]
- [[renderer/input-pipeline]]
- [[renderer/static-dedup]] — why `<Static>` dedup happens in the renderer, not the component
- [[renderer/layout-listeners]] — post-commit hook for Yoga-aware composables; the resize listener is now unconditional
- [[renderer/screen-reader]] — aria-* props on Box/Text feed a separate walker when `isScreenReaderEnabled` is on
- [[renderer/no-sfc-components]] — why internal components are `defineComponent + h()`, not `.vue` SFCs
- [[renderer/kitty-detection]] — `auto` mode listens on stdin before the input pipeline mounts; startup-window race
- [[renderer/console-patch]] — `patchConsole` subscribers fan out to every active renderer, not just the matching stdout
- [[renderer/ci-detection]] — `isCiEnv()` treats `CI='false'` as in-CI; falsy-string parsing is missing

## Components

- [[components/static-generics]] — why `<Static>` keeps `items: unknown[]` instead of going generic

## Composables

- [[composables/vueuse-patterns]]

## Testing

- [[testing/ink-strategy]]

## Porting

- [[porting/from-react-ink]]
- [[porting/api-tracker]] — flat ✅/❌ checklist of every ink API and where vue-ink implements it
- [[porting/test-port-status]] — file-by-file map of ink's test suite to vue-ink's, with the remaining gaps called out
- [[porting/inlined-deps-lose-edge-cases]] — where vue-ink inlines what ink imports as a tiny package, the edge cases get dropped

## Other

- [[principles]]
