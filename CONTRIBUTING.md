# Contributing to vue-ink

Thanks for the interest. vue-ink is a Vue 3 port of [Ink](https://github.com/vadimdemedes/ink); the goal is parity with ink's behaviour while feeling native to Vue. This document covers the local setup, the conventions the codebase relies on, and how releases ship.

## Local setup

Requires Node.js `>=22` and [pnpm](https://pnpm.io/). The repo is a pnpm workspace; install once at the root.

```sh
pnpm install
pnpm build       # turborepo-driven `tsc -p tsconfig.build.json` per package
pnpm test        # vitest across every workspace
pnpm typecheck   # `tsc --noEmit` per package
pnpm lint        # vite-plus lint
```

`pnpm test` runs the full vitest suite. `pnpm --filter vueink test` targets just the umbrella package's tests; `pnpm --filter <pkg> test` works for any workspace.

## Workspace layout

Source lives under `packages/`. `@vue-ink/core` owns the terminal DOM, layout, and output pipeline (no Vue dependency); `@vue-ink/renderer` wires Vue's custom renderer plus composables on top; `@vue-ink/components` ships `<Box>`, `<Text>`, and friends; `vueink` is the umbrella entry most apps install; `@vue-ink/testing-library` mirrors `ink-testing-library`; `@vue-ink/docs` is the VitePress site. Examples live in `examples/`; reference repos vendored as read-only context live in `repos/`.

## Brain notes

`brain/` is an Obsidian vault used as persistent memory across sessions. Read the relevant brain notes before touching an area — there's almost always one. If you discover a non-obvious invariant, a subtle bug, or a "we used to do this the other way and it broke X" lesson, write it down.

- One topic per file. Directories use `[[wikilink]]` indexes — no inlined content.
- Cross-link liberally. The index files (`brain/index.md`, `brain/renderer/`, `brain/porting/`, etc.) are the entry points.
- Delete stale notes when the underlying code changes. Drift is worse than missing notes.

## Test naming

- `PascalCase.test.ts` for feature/component/integration specs — e.g. `Render.test.ts`, `PatchConsole.test.ts`, `RenderInteractive.test.ts`.
- `useFoo.test.ts` for composable specs — e.g. `useInput.test.ts`, `useFocus.test.ts`.
- Never kebab-case, never `hooks-*.test.ts`.

If you're adding a new test file, mirror the closest existing sibling rather than inventing a scheme.

## Reference repositories

`repos/` contains squashed snapshots of upstream sources we depend on:

- `repos/ink/` — https://github.com/vadimdemedes/ink @ master
- `repos/core/` — https://github.com/vuejs/core @ main
- `repos/vueuse/` — https://github.com/vueuse/vueuse @ main

These are **read-only**. They exist so coding agents (and humans) can grep real source instead of guessing from training data or stale docs. Don't edit them; if you need a newer snapshot, re-vendor with the `clone-repo` workflow.

## Changesets

Every user-visible change needs a [changeset](https://github.com/changesets/changesets):

```sh
pnpm changeset
```

Pick the affected packages, the bump type (`patch` / `minor` / `major`), and write a short note from a user's perspective ("Added X", "Fixed Y when Z"). Commit the generated `.changeset/*.md` file alongside your code.

> Note: as of writing, changesets may not yet be fully wired into the release workflow (see `ROADMAP.md` § 0.2). If `pnpm changeset` isn't available, add a short paragraph to your PR description describing the user-visible impact instead — we'll squash that into the changelog on release.

Doc-only changes, internal refactors, brain-note edits, and test-only changes don't need a changeset.

## PTY test caveats

A handful of tests drive [`node-pty`](https://github.com/microsoft/node-pty) to exercise real raw-mode stdin (e.g. `Exit.test.ts`, anything under `RenderInteractive.test.ts`). These need a real PTY and can flake on headless CI runners — see `brain/porting/test-port-status.md` for the file-by-file map.

If a PTY test fails locally inside a non-interactive shell (CI logs, some terminal multiplexers, certain Docker setups), try running it directly in a real terminal before assuming it's a regression. The CI matrix pins `ubuntu-latest` + `macos-latest`; flakes there are tracked in the brain notes.

## Pull requests

- Branch off `main`. Keep PRs focused — one logical change, one set of brain-note updates.
- `pnpm typecheck && pnpm test && pnpm build` should pass locally before pushing.
- Include a changeset (or a "no changeset because…" note) in the PR description.
- The CI workflow (`.github/workflows/ci.yml`) runs lint, typecheck, the full test suite with coverage, the build, and a `npm pack --dry-run` sanity check across the matrix. PRs need green CI before merge.

## Release process

Releases ship to npm via GitHub Actions on merge to `main`:

1. Land PRs with changesets attached.
2. The changesets bot opens a "Version Packages" PR that aggregates pending changesets into version bumps + changelog entries.
3. Merging that PR triggers `.github/workflows/release.yml`, which builds and publishes every public workspace package with `npm publish --provenance`.

> If the changesets-action isn't live yet, releases are tag-driven: bump versions manually, tag `vX.Y.Z`, and push. `release.yml` triggers on `v*` tags. See `ROADMAP.md` § 0.2 for the migration plan.

## Questions

Open an issue (the templates under `.github/ISSUE_TEMPLATE/` prompt for the stdin/PTY context that's usually missing from terminal-app bug reports) or start a discussion. Brain notes are the canonical answer for "why is it like this?" — check there first.
