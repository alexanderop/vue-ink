# Vite preview binds to `::1`, not `127.0.0.1`

`vite preview` (Vite 7) listens on IPv6 `::1` only by default. If
Playwright's `webServer.url` / `baseURL` is `http://127.0.0.1:<port>/`,
the wait loop hits ECONNREFUSED for the full `timeout` (120 s) and the
suite never starts. Symptom: `Error: Timed out waiting 120000ms from
config.webServer.` even though `vite preview` printed its ready banner.

## Use `localhost`, not a literal IP

```ts
// apps/playground/playwright.config.ts
const BASE_URL = `http://localhost:${PORT}/`;
```

`localhost` resolves to either family via the OS resolver, so it hits
whichever socket `vite preview` opened. Sticking with `127.0.0.1` only
works if you also pass `--host 127.0.0.1` to the preview server — not
worth the extra flag.

## Verifying

```sh
# IPv4 path silently fails:
curl -s4 http://localhost:4173/ # (nothing)
# IPv6 path responds:
curl -s6 http://localhost:4173/ # HTTP/1.1 200 OK
```

Same affects `curl -sI http://127.0.0.1:4173/` (no output) vs
`curl -sI 'http://[::1]:4173/'` (200).
