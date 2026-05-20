# `publint --strict` requires explicit dep declarations

`pnpm lint:packages` (and the per-package `lint:package` script) runs
`publint --strict` against the packed tarball. It fails when a package
imports a module that isn't declared in its own `dependencies` /
`peerDependencies`, even when the import resolves fine at build/test
time via a sibling workspace's transitive tree.

Concrete instance: `@vue-ink/renderer` could `import stringWidth from
"string-width"` because `@vue-ink/core` already lists it. Typecheck and
vitest both pass. `publint --strict` flagged it; adding `"string-width":
"^8.2.0"` to `packages/renderer/package.json#dependencies` cleared it.

## How to apply

When adding an import in any shipped package, check the package's own
`dependencies`. If it's not there, add it — don't lean on transitive
resolution from a sibling workspace. Use the same version as the
workspace package that already pins it.

## Tooling notes

- `publint --strict` is the load-bearing check. The companion `attw
--pack . --profile node16` crashes on this tree (`Cannot read
properties of undefined (reading 'filename')`) regardless of your
  changes — verify against a clean checkout before assuming you broke
  something.
- `publint` invokes `pnpm pack`, which leaves a `*.tgz` artifact next to
  the package's `package.json`. Delete it after running the lint.
