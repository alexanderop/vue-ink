# Vue `type: Boolean` props coerce missing to `false`

Vue boolean props are tri-state-hostile by default. `{ type: Boolean }`
on an undeclared prop coerces to `false`, so the component can't tell
"caller omitted this" from "caller explicitly set false."

Bit during the P0 borders port: per-edge overrides (`borderTop`,
`borderRight`, …) need three states — inherit (undefined), force on
(true), force off (false). Declaring `{ type: Boolean }` made every
omitted edge silently behave like `borderTop={false}`, so the
per-edge logic couldn't compose with the parent `border` prop.

The fix: `{ type: Boolean, default: undefined }`. Vue keeps `undefined`
as the prop value when the caller doesn't pass it, instead of coercing
to `false`.

Any future tri-state prop (boolean or otherwise) needs the same shape.
See `packages/components/src/Box.ts` border-edge props for the working
pattern.

## Why it's not a Vue bug

Single-state booleans (`disabled`, `loading`) actually want
the missing → `false` coercion — that's what makes `<Btn disabled />`
work without explicit binding. The escape hatch exists; we just have
to remember to use it when the prop is tri-state.
