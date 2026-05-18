---
name: vueink-workspace-types-are-raw-ts
description: In-repo, the vueink package's `types` field points at `src/index.ts`; any tsconfig that type-checks against it needs `allowImportingTsExtensions: true`
metadata:
  type: project
---

# In-repo, `vueink` exports raw TS source — not dist

`packages/vue-ink/package.json` sets both `main` and `types` to
`./src/index.ts`. `publishConfig` rewrites them to `./dist/index.js` /
`./dist/index.d.ts` for npm consumers, but workspace consumers (every
`pnpm` symlink inside this repo) always resolve through the **source**
entry.

```jsonc
"main":   "./src/index.ts",
"types":  "./src/index.ts",
"publishConfig": {
  "main":  "./dist/index.js",
  "types": "./dist/index.d.ts",
}
```

The source files use `.ts` extension imports
(`import { foo } from './foo.ts'`). That means any tsconfig that
type-checks a file importing `vueink` (or `@vue-ink/*`) **must** set
`allowImportingTsExtensions: true`, otherwise vue-tsc walks the
symlink into `packages/**/src/**` and barfs `TS5097: An import path
can only end with a '.ts' extension when 'allowImportingTsExtensions'
is enabled.`

## Where this matters

- `apps/playground/tsconfig.json` — already set
- `examples/tsconfig.json` — was missing; added during the playground
  examples wiring. Also: `examples/package.json` has no `typecheck`
  script, so `pnpm -r typecheck` silently skips it; CI doesn't catch
  example-side regressions.

When adding any new in-repo package or app that consumes `vueink`,
copy this flag into its tsconfig.

**Why** the package is wired this way: avoids a build step before
`pnpm dev` / tests work, and the playground's d.ts bundle handles the
"need pre-built types" use case separately (see
[[playground-dts-bundle]]).

## Related

- [[playground-dts-bundle]] — how published `.d.ts` is rebuilt for
  the playground (a different pipe; doesn't replace the source-entry
  setup)
- [[playground-monaco-types]]
