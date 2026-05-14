# Per-stdout instance registry

## Why
Calling `render()` twice for the same stdout creates two renderers competing for the same lines. Ink keeps a `WeakMap<WriteStream, Instance>` and returns the existing instance with a stderr warning.

## Scope
- Add a module-level `instances: WeakMap<NodeJS.WriteStream, Instance>` in `packages/renderer/src/render.ts`.
- On `render(component, options)`: if the stdout already has an instance, write a warning to native stderr and return that instance (after calling `rerender(component)`).
- Provide a `cleanup()` method on the Instance that fully tears down + removes from the registry (separate from `unmount()` so consumers can opt into a fully fresh re-mount).

## Acceptance criteria
- Two `render()` calls for the same stdout produce one renderer.
- Warning is written to native stderr (not patched console).
- After `cleanup()`, the next `render()` creates a fresh instance.

## References
- Ink source: `repos/ink/src/instances.ts`, `repos/ink/src/render.ts` (`getInstance`).
