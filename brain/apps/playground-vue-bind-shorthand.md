# `padding:="1"` is valid Vue bind shorthand

The trailing-colon form `attr:="expr"` is Vue's shorthand equivalent of
`:attr="expr"` (the leading-colon `v-bind:` shorthand). RHS is
evaluated as JS, so `padding:="1"` passes the number `1`, while plain
`padding="1"` passes the string `"1"`.

Why this matters in playground examples: once the dts-bundle
(`apps/playground/src/lib/vue-ink.d.ts`) ships real
`DefineComponent<BoxProps>` types, every numeric prop (`padding`,
`paddingX/Y`, `margin*`, `width`, `height`, `flexGrow`, …) fails
typecheck against `prop="1"` with `Type 'string' is not assignable to
type 'number'`. The colon-suffix form (or the leading `:padding="1"`)
is the type-clean default.

## How to apply

Don't "fix" `padding:="1"` to `padding="1"` in playground examples —
that's a regression. If you want to convert, the equivalent is
`:padding="1"`. Most existing chat / counter / spinner examples use
the trailing form because it reads cleaner next to plain HTML
attributes.
