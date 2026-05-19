# Borrowing from shadcn-vue: what transfers, what doesn't

shadcn-vue is the obvious Vue-ecosystem reference for component authoring
patterns, and a future agent will reach for it again. We already evaluated
the full stack. Most of it is DOM/CSS-centric and does **not** apply.

## What does NOT transfer

| shadcn-vue idiom                                           | Why it can't apply here                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.vue` SFCs                                                | See [[../renderer/no-sfc-components]] — four hard blockers.                                                                                      |
| `cn()` (`clsx` + `tailwind-merge`)                         | We emit ANSI escape sequences, not CSS classes. No class strings to merge.                                                                       |
| `cva()` variants                                           | Same — variant values would map to colour/border style objects, not class names. The _shape_ of typed variants is borrowable; the library isn't. |
| `reka-ui` (`Primitive`, `asChild`, `useForwardPropsEmits`) | DOM-only. No polymorphic element rendering in a terminal — every node is `ink-box` or `ink-text`.                                                |
| `data-slot="..."` attributes                               | Styling hooks for CSS selectors; meaningless to a Yoga + ANSI pipeline.                                                                          |

## What DOES transfer

- **`createContext<T>(name)` factory** — already adopted in
  `packages/components/src/helpers/create-context.ts`. Returns
  `[useFoo, provideFoo]`, hides the `InjectionKey`. Mirrors reka-ui /
  shadcn-vue ergonomics.
- **Compound components + barrel `index.ts`** — only relevant if/when we
  ship a higher-level kit (`Spinner`, `Select`, `TextInput`, `Confirm`)
  built on top of `Box`/`Text`. Mirrors ink's ecosystem layout
  (`ink-spinner`, `ink-select-input`).
- **`useVModel` for controlled/uncontrolled props** — for future stateful
  components that need a `v-model` + `defaultValue` pair, same shape as
  React's `useUncontrolled`.
- **`reactiveOmit` + spread-forwarding** — useful in wrapper components
  that re-style `Box`/`Text`.

## The `global: true` flag on createContext

`createContext(name, { global: true })` seeds the underlying symbol via
`Symbol.for(name)` instead of a local `Symbol(name)`. **Load-bearing for
the accessibility context only** — `@vue-ink/components` and
`@vue-ink/renderer` both need to inject the same key without one
depending on the other (the renderer's mirror lives in
`packages/renderer/src/context.ts` as a raw
`Symbol.for('vue-ink.accessibility')`). Removing the flag silently breaks
SR detection across the package boundary. No other current context needs
it.
