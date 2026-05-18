# `@vue/repl` theming: `:theme` prop is not enough

`@vue/repl` exposes a `theme: 'dark' | 'light'` prop, but it only drives the
**Monaco editor + preview iframe**. The REPL's own chrome (file tabs,
toolbar, borders, message strip) is themed via plain descendant CSS:

```css
/* repos/repl/src/Repl.vue:148 */
.dark .vue-repl {
  --bg: #1a1a1a;
  --bg-soft: #242424;
  --border: #383838;
  /* ... */
}
```

So passing `:theme="'dark'"` leaves the file-tab bar and split-pane borders
stuck in light mode. **The parent app must also add a `.dark` class on an
ancestor of `<Repl>`**, e.g. `<div class="playground" :class="{ dark: ... }">`.

Easy to miss because the prop *looks* sufficient — only when you compare
side-by-side do you notice the chrome didn't flip.

## xterm theme: swap, don't re-mount

`@xterm/xterm` accepts theme changes via direct assignment:

```ts
term.options.theme = nextThemeObject;
```

No `term.dispose()` / re-init needed. Wire a `watch(() => props.theme, ...)`
to re-assign on the existing instance. If a future palette change ever
doesn't repaint, the escape hatch is `term.refresh(0, term.rows - 1)`.

## Related

- [[playground-dual-execution]] — the REPL has a hidden preview iframe; if
  you ever start using the REPL's *visible* output pane (we hide it today),
  the iframe's themed `<body>` also needs to match.
