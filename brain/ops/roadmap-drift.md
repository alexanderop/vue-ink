---
name: roadmap-drift
description: ROADMAP.md checkboxes lag the codebase — verify each item against current state before scoping work
metadata:
  type: project
---

# `ROADMAP.md` drifts — verify items before scoping work from it

`ROADMAP.md` is a snapshot of what was missing when it was written, not a contract. Checkbox items often stay `❌` long after the work has shipped, because nobody flips them on merge.

**How to apply:** When the user points at a `ROADMAP.md` item and says "do that," run a verification pass _first_ — read the referenced files / docs / brain notes / PRs and confirm the gap is real. Then present the actual remaining work, not the roadmap's framing. Update `ROADMAP.md` (flip the checkbox + one-line evidence pointer) as part of the same change so the next session doesn't repeat the dance.

## Related

- `[[../porting/tracker-drift]]` — same dynamic for parity trackers
- `[[../principles/vendor-source-beats-documentation]]` — the roadmap is a doc-style proxy; the code is the source of truth
