# Host-Boundary Decisions Belong at the Component Layer

When a custom Vue renderer can't make a decision at host-element creation time — because the parent context isn't visible there, or because the decision needs `setup`-time branching — push the decision into the component layer via `provide`/`inject`. Don't fork the renderer to compensate.

**Why:** Vue's `createElement` host hook receives only the new node's tag and props. It has no parent host, no descendant tree, and no reactive scope. Inventing parent-aware behavior in the renderer means either a fragile parent-walk (which fights the reconciler) or a hidden global (which leaks across `render()` instances). The component layer already has the context the renderer is missing — `provide`/`inject` and `setup`-time branching are the structural fit.

**Pattern:**

- If the host needs to behave differently based on its parent, model that as a `provide`/`inject` pair from the parent component down. The host stays generic.
- If a child must mount or not mount based on parent intent, branch in the child's `setup()` (not in the host's `createElement`).
- The renderer should only know about node tags and props. Decisions about _meaning_ live one layer up.

**Worked examples:**

- [[../renderer/nested-text-must-be-virtual]] — `INSIDE_TEXT_KEY` is provided by `<Text>` so a nested `<Text>` knows to render as a virtual span.
- [[../renderer/text-outside-text-silently-dropped]] — the renderer can't reject raw strings inside `<Box>` because `createText` has no parent; the component handles it.
- [[../renderer/screen-reader]] — `aria-label` / `aria-hidden` need setup-time branching to suppress child mounts; `<Text>`/`<Box>` setup is where the SR walker's intent lives, not the renderer.
- [[../components/create-context-pattern]] — the `createContext` factory is the mechanism this principle uses.

**Boundary with `[[mirror-upstream-conventions]]`:** ink's React reconciler _can_ make these decisions at the host layer because React owns parent traversal. We explicitly _can't_ mirror it — invent a Vue-shaped alternative rather than fight Vue's custom-renderer API.
