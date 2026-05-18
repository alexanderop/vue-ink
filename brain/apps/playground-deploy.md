# Playground deploy to GitHub Pages

`.github/workflows/deploy-playground.yml` builds and publishes
`apps/playground/dist/` to Pages at `https://alexanderop.github.io/vue-ink/`.
Three things are not obvious from the workflow alone.

## Yoga WASM is inlined — no separate `.wasm` asset

Browser builds of the renderer bundle the yoga-layout WASM **into the JS
chunk**. `dist/assets/` has no `.wasm` file. This means the usual Pages
footgun — "WASM dynamic import resolves against `/` instead of `/vue-ink/`"
— does not apply here.

Don't waste time wiring `assetsInclude` or copy-plugin rules for yoga. If a
future bundler change ever emits yoga as a separate asset, that's the
regression to catch: grep `dist/assets` for `.wasm`, expect empty.

Monaco workers *do* emit as separate hashed assets and pick up the base
prefix correctly through Vite's normal asset pipeline.

## Workspace packages must be built first

The playground imports `@vue-ink/*` by package name. In CI those resolve to
each package's `dist/`, not its source — so the workflow runs `pnpm build`
(all workspace packages) *before* `pnpm playground:build`. Skip step one
and you get "Failed to resolve entry for package" errors that look like a
Vite config bug but aren't.

## Base path is env-gated, not hardcoded

`apps/playground/vite.config.ts` reads `process.env.PLAYGROUND_BASE ?? '/'`.
Dev (`pnpm playground:dev`) stays at `/`; CI sets `PLAYGROUND_BASE=/vue-ink/`.
Don't hardcode `base: '/vue-ink/'` — it breaks local dev silently (assets
404 with a confusing path).

## Operator notes

- **One-time setup:** enable Pages with the Actions source. UI path is
  Settings → Pages → Source: **GitHub Actions**, but the API works too:
  `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`. Without
  this, the workflow runs green but nothing publishes.
- **Pages requires a public repo on the free plan.** Attempting to enable
  Pages on a private repo (UI or API) returns HTTP 422 "Your current plan
  does not support GitHub Pages for this repository." Either flip the repo
  public (`gh repo edit --visibility public --accept-visibility-change-consequences`
  — irreversible in practice: forks, archives, and search caches keep the
  history) or pay for Pro/Team/Enterprise.
- Bundle is ~5.8 MB unminified (Monaco + inlined yoga). Fine for a dev tool,
  worth knowing before linking it prominently.

## Related

- [[playground-blob-imports]] — runtime-side specifier rewriting
- [[playground-dual-execution]] — why there are two `vue-ink` load paths
