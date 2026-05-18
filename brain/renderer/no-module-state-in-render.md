# No module-scope state in renderer paths

Any auto-generated ID, counter, or cache that lives at module scope leaks
across concurrent `render()` instances and breaks snapshot determinism in
tests. The same Node process can host many roots — tests almost always
do.

Known leak still in tree: `focusIdCounter` at
`packages/renderer/src/composables/useFocus/index.ts:36`. Each new render
inherits the previous instance's counter, so focus IDs in snapshots
depend on test order.

Fix shape (from ink and the focus rewrite in
`createFocusManager`): move the counter into per-instance state on the
manager closure, expose an `assignFocusId()` method, and read it via
the renderer context.

## How to apply

When adding a composable or renderer helper, ask: is there a `let foo = 0`
or `const cache = new Map()` at module top? If so, push it into the
per-renderer context (`useRendererContext()` / focus manager / etc.) or
accept that snapshot tests must reset module state in `setup.ts`. The
former is the only durable answer.

## Related

- [[../principles/serialize-shared-state-mutations]] — same root cause,
  different scope.
