# `new URL('./foo.ts', import.meta.url)` is a prod-only proxy footgun

**Status:** fixed in commit `3659b1a74`. `runner.ts` now generates proxies at
runtime via `URL.createObjectURL(new Blob(...))`. This note is a post-mortem
so the trap doesn't get reintroduced.

## The trap

An earlier `runner.ts` did:

```ts
const VUE_PROXY_URL = new URL("./proxies/vue.ts", import.meta.url).href;
const VUE_INK_PROXY_URL = new URL("./proxies/vue-ink.ts", import.meta.url).href;
```

This works in **dev** because Vite's dev server serves `/src/...ts` URLs and
transforms TypeScript + resolves bare specifiers on the fly. The same line in a
**production** Vite build becomes a `new URL("data:text/javascript;base64,…")`
whose payload is **the raw, untranspiled `.ts` source** — bare `import 'vue'`,
`import type { … }`, and all.

The `proxies/*.ts` files in the playground are meant to be loaded as modules,
not imported into the bundle. When user code (running inside a Blob module)
does `import { render } from "data:…proxy…"`, the browser:

1. Fetches the data URL
2. Parses it as ESM
3. Chokes on `'vue'` / `'vueink'` (no import map in the main-page context) and on
   `import type` (TS-only syntax)
4. The dependency fails, so the user's blob module fails to load
5. Console shows `Failed to fetch dynamically imported module: blob:<origin>/<uuid>`
   — pointing at the user's blob, **not the actual offender**

Don't chase the blob in the error message. The user's compiled JS is fine;
something it imports is the real failure. Use
`grep -oE 'new URL\("data:text/[^"]+",import\.meta\.url\)' dist/assets/*.js`
to enumerate every data-URL'd source the build inlined, and base64-decode each
to confirm.

## The fix shape

Generate the proxy modules at runtime as `Blob` URLs whose source bridges
through `globalThis` to the already-bundled real modules:

```ts
import * as vueNs from "vue";
import * as vueinkNs from "vueink";

const KEY = "__VUE_INK_PLAYGROUND__";
(globalThis as any)[KEY] = { vue: vueNs, vueink: vueinkNs, getActiveContext };

const vueProxy = Object.keys(vueNs)
  .map((n) => `export const ${n} = globalThis['${KEY}'].vue[${JSON.stringify(n)}];`)
  .join("\n");
const VUE_PROXY_URL = URL.createObjectURL(new Blob([vueProxy], { type: "text/javascript" }));
```

No bare specifiers, no TS-only syntax, and the single-Vue-runtime invariant
(see [[playground-dual-execution]]) is preserved because everything resolves
to the same `vueNs` reference. The generated proxy URLs are stable for the
session, so this doesn't compound the module-pinning leak documented in
[[playground-blob-imports]].

## Related

- [[playground-blob-imports]]
- [[playground-dual-execution]]
- [[playground-deploy]]
