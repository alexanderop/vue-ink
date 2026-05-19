# Playground deploy to GitHub Pages

`.github/workflows/deploy-pages.yml` builds VitePress docs **and** the
playground, then uploads a merged artifact to Pages. Docs live at the
Pages root (`https://alexanderop.github.io/vue-ink/`), playground at the
`/playground/` sub-route (`https://alexanderop.github.io/vue-ink/playground/`).

The workflow:

1. `pnpm build` — workspace packages (dist/ required by both consumers).
2. `pnpm docs:build` — VitePress → `packages/docs/.vitepress/dist/` with `base: '/vue-ink/'`.
3. `pnpm playground:build` with `PLAYGROUND_BASE=/vue-ink/playground/` → `apps/playground/dist/`.
4. `cp -R apps/playground/dist/. packages/docs/.vitepress/dist/playground/` — merge.
5. Upload `packages/docs/.vitepress/dist/` as the single Pages artifact.

To reproduce a deploy locally, you must run all five steps — serving
just `apps/playground/dist/` or just `.vitepress/dist/` will 404 the
other half. Four things are not obvious from the workflow alone.

## Local preview needs a `/vue-ink/` base mount

The merged artifact's HTML references `/vue-ink/assets/...`. Pointing
`http-server` at `packages/docs/.vitepress/dist` serves that content
at `/`, so every link 404s. To mirror Pages' base, stage a parent dir
with a symlink:

```sh
mkdir -p /tmp/vueink-preview \
  && ln -sfn "$(pwd)/packages/docs/.vitepress/dist" /tmp/vueink-preview/vue-ink \
  && npx http-server /tmp/vueink-preview -p 8765 --silent
```

Then hit `http://localhost:8765/vue-ink/` and
`http://localhost:8765/vue-ink/playground/`. `vitepress preview`
respects the configured `base` natively, but doesn't serve the merged
`/playground/` half, which is why a static server + symlink is the
fastest end-to-end check.

## Yoga WASM is inlined — no separate `.wasm` asset

Browser builds of the renderer bundle the yoga-layout WASM **into the JS
chunk**. `dist/assets/` has no `.wasm` file. This means the usual Pages
footgun — "WASM dynamic import resolves against `/` instead of `/vue-ink/`"
— does not apply here.

Don't waste time wiring `assetsInclude` or copy-plugin rules for yoga. If a
future bundler change ever emits yoga as a separate asset, that's the
regression to catch: grep `dist/assets` for `.wasm`, expect empty.

Monaco workers _do_ emit as separate hashed assets and pick up the base
prefix correctly through Vite's normal asset pipeline.

## Workspace packages must be built first

The playground imports `@vue-ink/*` by package name. In CI those resolve to
each package's `dist/`, not its source — so the workflow runs `pnpm build`
(all workspace packages) _before_ `pnpm playground:build`. Skip step one
and you get "Failed to resolve entry for package" errors that look like a
Vite config bug but aren't.

## Base path is env-gated, not hardcoded

`apps/playground/vite.config.ts` reads `process.env.PLAYGROUND_BASE ?? '/'`.
Dev (`pnpm playground:dev`) stays at `/`; CI sets `PLAYGROUND_BASE=/vue-ink/playground/`.
Don't hardcode the base — it breaks local dev silently (assets 404 with
a confusing path).

## Docs co-deployment — single artifact, two roots

VitePress `base: '/vue-ink/'` is set in `packages/docs/.vitepress/config.mts`.
The workflow merges playground assets into the docs `dist/playground/`
folder before upload because Pages only serves one artifact per repo.
The nav link in `themeConfig.nav` uses `target: '_self'` so clicking
**Playground** does a hard navigation into the SPA (no VitePress
SPA-route hijacking).

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
