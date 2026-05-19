# Driving Monaco's Volar hover in Playwright

Asserting that Monaco renders real Volar type info on hover (vs. "any"
or "Cannot find module") is doable but every step has a sharp edge.

## The right widget selector

Monaco renders two hover-shaped DOM nodes:

| Widget id                                    | What it is                             |
| -------------------------------------------- | -------------------------------------- |
| `editor.contrib.modesGlyphHoverWidget`       | Glyph-margin hover. Always `.hidden`.  |
| `editor.contrib.resizableContentHoverWidget` | The actual content hover (Quick Info). |

A naive `.monaco-hover-content` locator matches the glyph widget's
inner div too, and Playwright's `toBeVisible()` will fail on it
forever. Always select by widgetid:

```ts
const hoverWidget = page.locator('[widgetid="editor.contrib.resizableContentHoverWidget"]');
```

## Bounce the mouse, then hover, then poll

The hover delay only fires when the mouse _enters_ the token. Calling
`textToken.hover()` twice in a row reuses the same coordinates and
Monaco never reschedules. Move the mouse off-editor between polls:

```ts
await expect
  .poll(
    async () => {
      await page.mouse.move(0, 0); // leave the token
      await textToken.hover(); // re-trigger hover delay
      return hoverWidget.innerText().catch(() => "");
    },
    { timeout: 120_000, intervals: [1_000, 2_000, 3_000] },
  )
  .toMatch(/DefineComponent|TextProps/);
```

The widget appears almost immediately showing `"Loading…"`. The real
text replaces it once the Volar worker responds — that's what the poll
is waiting for.

Do **not** add a `page.waitForTimeout(...)` inside the poll body: the
`intervals` option already paces each iteration. An extra sleep stacks
on top (interval + sleep, every retry), adding ~15–30 s to the typical
pass path. The body should be cheap — bounce, hover, read.

## Volar cold-start is slow

The vue.worker boots TypeScript + Volar inside a web worker, and
Monaco creates models lazily. First hover after page load typically
needs **30–60 s** on CI; later hovers are fast. Two consequences:

1. Bump `test.setTimeout(180_000)` — the default 30 s budget will
   fire mid-poll.
2. Add a `page.waitForTimeout(5_000)` _before_ the first poll, after
   waiting on diagnostics/squiggles. Without this the suite usually
   passes solo but flakes when warming a cold worker.

## Locating a syntactic token

Monaco emits each token as its own `<span class="mtk*">`. To click /
hover the identifier `Text` on line 3 of an SFC:

```ts
const editor = page.locator(".monaco-editor").first();
await editor.click(); // focuses it; Monaco won't show hover until focused
const textToken = editor
  .locator(".view-lines span")
  .filter({ hasText: /^Text$/ }) // exact, otherwise matches "TextProps"
  .first();
```

## Verifying store state without driving the UI

For assertions about the repl store (e.g. hidden files survived a
`setFiles`), exposing the store on `window.__playgroundStore` from
App.vue is the cheap path — no need to drive Monaco at all. See
[[../apps/playground-setfiles-wipes-hidden-files]].
