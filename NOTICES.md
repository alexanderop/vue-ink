# Third-party notices

vue-ink itself is MIT licensed (see [`LICENSE`](./LICENSE), Copyright (c) 2026 Alexander Opalic). It also embeds, adapts, or links against the third-party software listed below. Each entry covers a single upstream project, the license it ships under, and where vue-ink uses it.

If you redistribute vue-ink, the upstream notices below must travel with it. The MIT permission notice from each project is reproduced verbatim in this file.

---

## Inlined / ported source

These projects contributed source code that was rewritten or directly copied into the vue-ink tree. The upstream copyright lives in the per-file headers of those files; this section gives the canonical attribution.

### Ink

- Project: Ink — React renderer for interactive command-line apps
- License: MIT
- Copyright: (c) Vadym Demedes &lt;vadimdemedes@hey.com&gt; and Sindre Sorhus &lt;sindresorhus@gmail.com&gt;
- Upstream: https://github.com/vadimdemedes/ink
- Vendored at: `repos/ink/` (read-only reference copy)

vue-ink is a port of Ink to Vue 3. The following modules were adapted from Ink's source tree and carry an `// Adapted from ink (MIT) — https://github.com/vadimdemedes/ink` (or `// Ported from ink's …`) header:

`@vue-ink/core` (`packages/core/src/`):

- `ansi-tokenizer.ts`
- `colorize.ts`
- `dom.ts`
- `get-max-width.ts`
- `measure-text.ts`
- `output.ts`
- `render-background.ts`
- `render-border.ts`
- `render-node-to-output.ts`
- `sanitize-ansi.ts`
- `squash-text-nodes.ts`
- `styles.ts`
- `wrap-text.ts`

`@vue-ink/renderer` (`packages/renderer/src/`):

- `animation-scheduler.ts`
- `cursor-helpers.ts`
- `input-parser.ts`
- `log-update.ts`
- `parse-keypress.ts` (originally from enquirer's `keypress.js`, ported via Ink — see Enquirer entry below)
- `render.ts` (numerous behaviours mirror `repos/ink/src/ink.tsx`)
- `renderToString.ts`

`@vue-ink/testing-library` (`packages/testing-library/src/`):

- `index.ts` — port of [`ink-testing-library`](https://github.com/vadimdemedes/ink-testing-library) (MIT, same upstream authors).

Some ink dependencies were re-implemented inline rather than imported. See `brain/porting/inlined-deps-lose-edge-cases.md` for the full list; the current inlined cases are:

- `is-in-ci` (MIT, Sindre Sorhus) → `isCiEnv()` in `packages/renderer/src/render.ts`.
- `patch-console` (MIT, Vadim Demedes) → `consoleSubscribers` stack in `packages/renderer/src/render.ts`.

### Enquirer

- Project: Enquirer — stylish CLI prompts
- License: MIT
- Copyright: (c) Jon Schlinkert
- Upstream: https://github.com/enquirer/enquirer

`packages/renderer/src/parse-keypress.ts` traces back to Enquirer's `keypress.js` via Ink. The header on that file records both lineages.

---

## Runtime npm dependencies

vue-ink runtime-depends on the following npm packages (declared in each package's `package.json`). All are MIT-licensed unless noted; consult the linked upstream for the canonical license text.

### Yoga Layout

- Project: Yoga — embeddable flexbox layout engine
- License: MIT
- Author: Meta Open Source
- Upstream: https://github.com/facebook/yoga · https://www.yogalayout.dev/
- Pinned: `yoga-layout@~3.2.1` (via pnpm `catalog:`)
- Used by: `@vue-ink/core` (`dom.ts`, `get-max-width.ts`), `@vue-ink/renderer`. Drives every flexbox calculation under `<Box>`.

### ANSI / terminal-string helpers

All MIT-licensed. Used by `@vue-ink/core` and/or `@vue-ink/components` to tokenize, slice, wrap, and style ANSI strings before they hit stdout.

| Package                     | Author / org                 | Used by                                |
|-----------------------------|------------------------------|----------------------------------------|
| `ansi-escapes`              | Sindre Sorhus                | `@vue-ink/renderer`                    |
| `ansi-styles`               | Sindre Sorhus                | `@vue-ink/core` (`styles.ts`)          |
| `@alcalzone/ansi-tokenize`  | AlCalzone (fork of `ansi-tokenize` by Sindre Sorhus) | `@vue-ink/core` |
| `slice-ansi`                | Chalk team                   | `@vue-ink/core`                        |
| `wrap-ansi`                 | Chalk team                   | `@vue-ink/core`                        |
| `chalk`                     | Chalk team                   | `@vue-ink/core`, `@vue-ink/components` |
| `cli-boxes`                 | Sindre Sorhus                | `@vue-ink/core`, `@vue-ink/components` |
| `cli-truncate`              | Sindre Sorhus                | `@vue-ink/core`                        |
| `indent-string`             | Sindre Sorhus                | `@vue-ink/core`                        |
| `string-width`              | Sindre Sorhus                | `@vue-ink/core`                        |
| `widest-line`               | Sindre Sorhus                | `@vue-ink/core`                        |
| `type-fest`                 | Sindre Sorhus                | `@vue-ink/core`, `@vue-ink/components` (dual-licensed MIT OR CC0-1.0) |

### Vue ecosystem

- `vue` (MIT, Evan You & Vue contributors) — peer dependency. Upstream: https://github.com/vuejs/core. Vendored read-only at `repos/core/`.
- `@vue/devtools` (MIT, Vue team) — optional peer for the Vue DevTools bridge in `@vue-ink/renderer`.

---

## Upstream MIT permission notice

The following text is reproduced from Ink's `license` file and applies to all MIT-licensed components listed above. Each upstream project ships its own copy of this notice with its own copyright line; this is the canonical wording.

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

If you spot a missing attribution, please open an issue at https://github.com/alexanderop/vue-ink/issues.
