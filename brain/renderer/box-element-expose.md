# `<Box>` exposes `$element` for template refs

A `ref` on `<Box>` resolves to the **Vue component proxy**, not the
underlying `ink-box` DOMElement. Composables that need the host node
(`useBoxMetrics`, future scroll/viewport helpers) can't use a raw ref.

`Box.ts` calls `expose({ get $element() { return ... } })` so the proxy
exposes the DOMElement via `boxRef.value.$element`. Composables accept
either form (ref-to-component or raw DOMElement) by reading
`maybe.$element ?? maybe`.

See `packages/components/src/Box.ts:87-88` and
`packages/renderer/src/composables/useBoxMetrics/`.

## Why expose, not pass via prop / context

Refs are how Vue users wire DOM/element access — anything else would
diverge from `<input ref="x"> ` and force callers to learn a new
pattern. `expose` is the official escape hatch when the proxy needs to
surface non-prop internals.
