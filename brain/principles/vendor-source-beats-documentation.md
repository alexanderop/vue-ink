# Vendor Source Beats Documentation

When porting from or matching another library's behavior, the **vendored source tree** (`repos/<name>/`) is ground truth. Documentation, parity trackers, brain notes, and training-data recall are all _proxies_ — they drift the moment the upstream library moves. Always grep the real source first.

**Why:** The same rediscovery tax keeps surfacing — `[[../porting/tracker-drift]]` (six wrong rows on a "verified today" tracker), `[[../porting/inlined-deps-lose-edge-cases]]` (a brain note's guess about `patch-console` was wrong), `[[../ops/roadmap-drift]]` (ROADMAP.md shipped without code). Each instance was one `grep repos/` away from being avoided.

**How to apply:**

- For any question about ink, vue core, vueuse, or repl behavior, open `repos/<name>/` _first_, before consulting tracker notes, brain notes, or recall.
- When spawning Explore/Plan agents on work that touches a vendored library, tell them explicitly to grep `repos/<name>/` rather than rely on inference.
- Trust direction: code in `repos/` > our matching `packages/` code > brain notes about behavior > recall.
- Brain notes that _speculate_ about upstream behavior are themselves proxies; verify before acting on them.

**Boundary with [[prove-it-works]]:** prove-it-works is about verifying _your own output_ through observation. This principle is about choosing _information sources_ for reasoning in the first place. Different upstream choice.

## Related

- [[../porting/tracker-drift]]
- [[../porting/inlined-deps-lose-edge-cases]]
- [[../ops/roadmap-drift]]
- [[mirror-upstream-conventions]] — convention isomorphism makes the source-grep mechanical
