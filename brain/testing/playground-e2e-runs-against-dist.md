# Playground e2e tests run against `dist/`, not source

`apps/playground/playwright.config.ts` starts its `webServer` with
`pnpm preview` (`vite preview`), which serves the **pre-built `dist/`**.
It does **not** rebuild. So after editing playground source, re-running
the e2e suite tests the *old* bundle until you `pnpm build`.

**Symptom of the trap:** a brand-new test fails against behavior you
already fixed, with a confusing empty/old value (e.g. `toHaveValue("snake")`
got `""`). Looks like the fix didn't work — actually the test ran stale code.

## Fix loop

```sh
# from apps/playground
pnpm build                                   # vue-tsc --noEmit && vite build
lsof -ti tcp:4173 | xargs kill -9 2>/dev/null  # see reuseExistingServer note below
pnpm exec playwright test smoke.spec.ts -g "<name>"
```

## `reuseExistingServer` keeps a stale server alive locally

The config sets `reuseExistingServer: !process.env.CI`. Locally, if a
preview server is already up on 4173, Playwright reuses it — so even
after `pnpm build`, a leftover server can still be serving the old
`dist/`. Kill port 4173 before re-running to be sure. CI is unaffected
(`reuseExistingServer` is false there, and CI builds fresh).

## Related

- [[vite-preview-ipv6]] — why `baseURL` uses `localhost`, not `127.0.0.1`
- [[monaco-hover-e2e]] — the other heavyweight test in this suite
- [[../apps/playground-deploy]] — the broader "build before serving" rule
