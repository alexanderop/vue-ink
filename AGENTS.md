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
