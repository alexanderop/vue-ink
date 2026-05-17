# Inlined ink dependencies are a high-risk audit zone

Where ink pulls in a small npm package, vue-ink tends to re-implement
the logic inline. The list of env-var names or method names ports
cleanly; the edge-case parsing or stream-binding often doesn't.

Confirmed instances:

- `is-in-ci` → inlined as `isCiEnv()` (`render.ts:116-125`). Lost the
  falsy-string parsing — `CI='false'` evaluates as in-CI. See
  [[../renderer/ci-detection]].
- `patch-console` → hand-rolled `consoleSubscribers` Set
  (`render.ts:214-269`). Lost both full `console.*` coverage (only six
  methods patched) and per-stream routing (every subscriber receives
  every call). See [[../renderer/console-patch]].

**Why:** Both libraries are tiny (10–50 LOC). Reimplementing them looked
trivial during the port — and the *shape* of the logic is trivial. The
non-obvious bit is the edge cases the original library encodes (string
parsing for `is-in-ci`; per-instance stream closure for `patch-console`),
which don't show up in the surface API and aren't covered by a
mechanical port.

**How to apply:** When auditing the port, treat any inlined helper whose
ink counterpart is `import x from 'x-pkg'` as suspicious. Open
`repos/<pkg>/` (or `node_modules` if it's not vendored), read the actual
library, and diff what vue-ink's inline omits — especially around
non-empty-string truthiness, edge inputs, and per-instance state. The
[[tracker-drift]] audit pattern applies here too: the parity tracker
usually marks these ✅ because the *signatures* match.
