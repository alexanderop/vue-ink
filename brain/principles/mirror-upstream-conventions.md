# Mirror Upstream Conventions Verbatim

When building a port or a parity-driven implementation, **copy the upstream library's structural conventions verbatim** — folder layout, naming, file boundaries, internal API shapes, test colocation. It costs nothing now and compounds: contributors who know one project navigate the other; cross-referencing during audits becomes mechanical; deviations stand out as suspect by themselves.

**Why:** The audits we run (parity trackers, test-port-status, drift checks) only work because both sides have parallel structure. The places we deviated paid for it: `[[../renderer/no-sfc-components]]` documents three working days lost to authoring components in `.vue` SFCs when every Node-targeting Vue renderer used `.ts` — reverted to ink/ts conventions. `[[../composables/vueuse-patterns]]` explicitly credits the upstream-mirroring folder layout for catching drift.

**How to apply:**

- Before designing a new file or folder, check `repos/<name>/` for the analogous slot. If a slot exists, copy its shape (name, layout, imports).
- Component/composable surfaces should match ink/vueuse 1:1 where possible (`[[../porting/from-react-ink]]`, `[[../porting/api-tracker]]`).
- Internal primitives (`patch-console`, `parse-keypress`, `is-in-ci`, `useEventListener`) — mirror the upstream's name, signature, and file boundary. See `[[../renderer/console-patch]]`, `[[../renderer/kitty-detection]]`, `[[../renderer/layout-listeners]]`.

**Boundary with [[redesign-from-first-principles]]:** redesign-from-first-principles asks "if I were building this today, would I do it this way?" — that question is the _right_ answer when there's no authoritative cousin. When `repos/<name>/` exists as the upstream reference, this principle wins: mirror first, redesign only when ink itself is wrong.

**Boundary with [[foundational-thinking]]:** foundational-thinking is within-project ("get data structures right"). This one is cross-project ("if a structure already exists upstream, copy it").

## Related

- [[vendor-source-beats-documentation]] — verifies what to mirror
- [[../porting/api-tracker]]
- [[../porting/from-react-ink]]
- [[../composables/vueuse-patterns]]
- [[../renderer/no-sfc-components]]
