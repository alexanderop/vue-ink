# Parity trackers drift — verify against `repos/ink/` first

[[api-tracker]] and [[test-port-status]] are snapshots, not contracts.
Even when the header reads "Verified <today>", individual rows can be
wrong. Treat them as a starting index, not as ground truth.

**Why:** A 2026-05-16 audit on a "verified 2026-05-16" tracker still
found six real gaps the tracker had missed or mislabelled — e.g.
`patchConsole` hand-patched six methods while ink's `patch-console`
covered 19; `Instance.cleanup()` listed as "removed" but ink still
ships it. The pattern repeats: the more authoritative a tracker looks,
the easier it is to skip the source check.

**How to apply:** When the user asks "is X implemented" or "what's
missing", do not answer from the tracker alone. Open `repos/ink/`
(pinned squash of `master`) and the matching `packages/*/src/` file and
diff the public surface yourself — types, option fields, payload
fields, return shapes, second-call semantics. The tracker tells you
_where_ to look; `repos/ink/` tells you what's _actually_ there.

Related: [[../principles/prove-it-works]], [[../principles/vendor-source-beats-documentation]],
[[../ops/roadmap-drift]] — the same proxy-vs-source pattern at the docs/roadmap layer.
