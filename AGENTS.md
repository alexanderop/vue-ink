# vue-ink

Vue 3 port of [Ink](https://github.com/vadimdemedes/ink) — build interactive terminal UIs with Vue components. A custom Vue renderer drives a terminal DOM (Yoga-based layout + ANSI output) instead of HTML.

## Folder structure

Monorepo, pnpm workspaces. Node ≥ 22.

- `packages/vue-ink/` — `vueink` public package: re-exports core + renderer + components, ships the CLI (`bin/vueink.ts`), benches, and the canonical test suite ported from ink.
- `packages/core/` — `@vue-ink/core`: terminal DOM, Yoga layout, output pipeline, input pipeline. No Vue dependency.
- `packages/renderer/` — `@vue-ink/renderer`: Vue custom renderer that bridges Vue reactivity to `@vue-ink/core`.
- `packages/components/` — `@vue-ink/components`: first-party components (`Box`, `Text`, `Newline`, `Spacer`, `Transform`, `Static`).
- `packages/testing-library/` — `@vue-ink/testing-library`: port of `ink-testing-library`.
- `packages/docs/` — `@vue-ink/docs`: VitePress documentation site.
- `apps/playground/` — `@vue-ink/playground`: in-browser REPL (Monaco + `@vue/repl`) deployed to Vercel.
- `examples/` — runnable example apps.
- `learning/from-scratch.ts` — ~80-line zero-dep demo; pair with `brain/renderer/how-it-works.md`.
- `brain/` — Obsidian vault, persistent memory (see below).
- `repos/` — vendored read-only source trees for reference (see below).

## Commands

Run from repo root unless noted.

- `pnpm test` — run tests across all packages.
- `pnpm test:coverage` — coverage for the `vueink` package.
- `pnpm typecheck` — TypeScript check across all packages.
- `pnpm lint` — `vp lint`.
- `pnpm lint:dead` — `knip` dead-code check.
- `pnpm lint:packages` — `publint` + `arethetypeswrong` on shipped packages.
- `pnpm format` / `pnpm format:check` — `oxfmt`.
- `pnpm build` — build all shipped packages (excludes docs).
- `pnpm bench` — vitest benches in `vueink`.
- `pnpm size` — `size-limit` bundle budget check.
- `pnpm docs:dev` / `docs:build` / `docs:preview` — docs site.
- `pnpm playground:dev` / `playground:build` / `playground:preview` — playground app.
- `pnpm vueink` — run the CLI from source via tsx.
- Target one package: `pnpm --filter <package-name> <script>` (filter resolves package `name`, not folder — see `brain/testing/pnpm-filter-name.md`).

## Reference repositories

Source-of-truth code for libraries we depend on. Treat as **read-only reference material** — do not edit files under `repos/`. When asked about a library listed below, explore its source here first instead of guessing or relying on training data.

- `repos/core/` — https://github.com/vuejs/core.git @ main (squashed)
- `repos/ink/` — https://github.com/vadimdemedes/ink.git @ master (squashed)
- `repos/vueuse/` — https://github.com/vueuse/vueuse.git @ main (squashed)
- `repos/repl/` — https://github.com/vuejs/repl.git @ main (squashed)

## Learning references

Minimal, zero-dependency demos that strip the framework down to its essence. Good for onboarding or sanity-checking the mental model. Pair with `brain/renderer/how-it-works.md`.

- `learning/from-scratch.ts` — vue-ink in ~80 lines of plain Node + TS. Demonstrates ANSI escapes, the frame-overwrite trick, a toy layout step, and raw-mode stdin. Run with `pnpm tsx learning/from-scratch.ts`.

# Brain

The `brain/` directory is an Obsidian vault — persistent memory across sessions.

- **Read first.** Read brain files relevant to your task before acting.
- **Write** after mistakes, corrections, or notable codebase learnings.
- **Structure:** One topic per file. Directories with `[[wikilink]]` indexes — no inlined content.
- **Maintain:** Delete outdated notes and stale artifacts.
