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
ink counterpart is `import x from 'x-pkg'` as suspicious. Read the actual
library and diff what vue-ink's inline omits — especially around
non-empty-string truthiness, edge inputs, and per-instance state. The
[[tracker-drift]] audit pattern applies here too: the parity tracker
usually marks these ✅ because the *signatures* match.

`repos/ink/` is a `git subtree` of the source tree only — there is **no
`node_modules/` under it**, so ink's runtime deps aren't sitting on disk.
To read one (e.g. `patch-console`, `is-in-ci`):

```bash
# fast: pull the published source straight from GitHub raw
curl -s https://raw.githubusercontent.com/vadimdemedes/patch-console/master/source/index.ts

# or look up the repo URL first
npm view <pkg> repository
```

Don't trust speculation in a brain note about how the upstream library
works — reach for the actual source first. The `console-patch` LIFO fix
was missed for one iteration because the existing brain note guessed
"each render's patch-console instance closes over its own stream"; the
real `patch-console` uses a single module-level `originalMethods` slot,
which is the LIFO behaviour vue-ink ended up mirroring.
