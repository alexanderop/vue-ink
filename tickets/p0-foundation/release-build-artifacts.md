# Ship real build artifacts for all four packages

## Why
Today no package is consumable off-workspace. All four `package.json`s point `main` and `types` at `./src/index.ts`, set `build` to `tsc --noEmit`, ship no `dist/`, no `.d.ts`, no `files` allowlist, and no dual ESM/CJS exports. The README's `npm install vue-ink` instruction (`README.md:12`) is misleading — anyone running it gets raw `.ts` source they need `tsx` to execute. This blocks every real adoption path.

## Scope

For each package (`@vue-ink/core`, `@vue-ink/renderer`, `@vue-ink/components`, `vue-ink`):

- Add `tsconfig.build.json` extending the workspace base; emit to `dist/` with declarations.
- Replace `build: tsc --noEmit` with a real `tsc -p tsconfig.build.json` (and `--watch` variant for dev).
- Update `package.json`:
  - `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`.
  - `"exports"`: dual ESM (`"import"`) + types map. CJS only if a real consumer needs it — vue-ink is otherwise ESM-pure.
  - `"files": ["dist", "README.md", "LICENSE"]`.
  - `"sideEffects": false` on `@vue-ink/core` and `@vue-ink/components` (pure-function modules). NOT on `@vue-ink/renderer` or `vue-ink` — `render.ts` patches console and registers signal handlers at runtime; they have load-time side effects through their `render()` entry point but not on import. Verify per-module before flipping.
- Add a publish-time sanity check (single `pnpm pack` script per package, asserts dist exists, types resolve, basic import smoke).
- Update root `lefthook.yml` / CI so `pnpm build` actually emits artifacts before any release tag.
- Fix README install instructions to match the actual story (single `vue-ink` package recommended, or the four-package breakdown justified).

## Decisions to make (before implementing)
- **Four packages or one?** The review flagged that no external consumer plausibly imports `@vue-ink/core`/`@vue-ink/renderer`/`@vue-ink/components` separately. Either:
  - (a) keep the split + add a one-line "why this exists" to each subpackage README (e.g., "use `@vue-ink/core` if you're building a non-Vue renderer on top of the terminal DOM"), or
  - (b) collapse to a single `vue-ink` package like ink does.
  - This decision shapes the exports map and is reversible later.

## Acceptance criteria
- `pnpm build` produces `dist/` with `.js` + `.d.ts` + sourcemaps for each package.
- `node --eval "import('vueink').then(m => console.log(Object.keys(m)))"` (run from outside the workspace, with `vue-ink` installed via `pnpm pack`'s tarball) lists at least `render`, `useApp`, `useInput`, `useFocus`, `Box`, `Text`, plus the public types.
- `"sideEffects"` flags verified via a Vite tree-shake test: importing only `useApp` from `vue-ink` drops `<Box>`/`<Text>` from the bundle.
- README quick-start works copy-pasted on a fresh project (covered by the loader story — see also: separate ticket to publish a `vue-ink/loader`).

## Non-goals
- Publishing to npm — that's a release-management concern. This ticket gets the artifacts ready; cutting the tag is a separate decision.
- A `vue-ink/loader` for SFCs. Worth doing later but out of scope here; the build artifacts above are sufficient for `h(...)`/`defineComponent` consumers.

## References
- Ink's setup: `repos/ink/package.json:13-16,32-34` — `"main": "build/index.js"`, `"files": ["build"]`, single package.
- Affected files: every `packages/*/package.json`, the root `tsconfig.json`, `pnpm-workspace.yaml`, `README.md`.
- Related ticket: `tickets/p7-advanced/renderer-render-to-string.md` — promoting `renderToString` to public API depends on this shipping.
