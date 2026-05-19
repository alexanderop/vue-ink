# Playground has TWO `vue-ink` execution paths — both must work

`apps/playground/` hosts vue-ink in `@vue/repl`. The user's SFC compiles to JS
that statically imports `vue-ink`. That JS is loaded **twice**, by two
different mechanisms with two different module resolvers:

1. **Real preview (what the user sees in xterm).**
   `apps/playground/src/playground/runner.ts` regex-rewrites the bare
   specifiers (`vue-ink`, `vueink`, `vue`) to URLs pointing at local proxy
   modules (`proxies/vue-ink.ts`, `proxies/vue.ts`), wraps the result in a
   `Blob`, and `await import(blobURL)`s it. The proxy shadows `render` to
   inject the xterm-bound stdout/stdin/stderr via `runtime-context.ts`.

2. **REPL's hidden internal preview iframe.**
   `@vue/repl` always evaluates the compiled JS in its own preview iframe,
   using the `importMap` we hand to `useStore`. We don't *use* its output
   (TerminalPreview is the real preview), but the iframe still loads and its
   `import { Box, Text, … } from 'vue-ink'` resolves through `importMap`.

## The trap

If the `vue-ink` entry in `importMap` is a placeholder like
`data:text/javascript,export const __playground = true`, the iframe throws
`The requested module 'vue-ink' does not provide an export named 'Box'` at
load time. **The REPL surfaces that error in the editor pane's status bar**
even though the xterm preview is rendering correctly — easy to chase as if
it were a renderer bug.

Fix lives in `App.vue`: `VUE_INK_STUB_EXPORTS` lists every name (Box, Text,
useInput, every composable, kittyFlags, …) and `VUE_INK_STUB_URL` emits a
data: URL exporting each as `() => {}`. Anything a user might statically
import has to be in the list — otherwise the iframe trips on `import { X }`.

The REPL's right output pane is hidden via the `<style>` block (no
`scoped`) — `.editor-pane .split-pane > .right { display: none }`. The
iframe still mounts and still loads `vue-ink` from the importMap; it's just
not visible. The stub is what keeps it from throwing.

## Rewrite-rule ordering (runner.ts)

`REWRITE_RULES` must match `vue-ink` / `vueink` **before** plain `vue`,
otherwise the `vue` regex eats the prefix of the hyphenated names and
corrupts them. The current code orders them correctly — don't reorder.

## Run context is single-flight

`runtime-context.ts` is a mutable bridge for the real xterm preview. Initial
REPL compilation and edit bursts can produce several compiled JS snapshots; if
`TerminalPreview` starts overlapping imports, one run can clear the active
context while another run's proxy `render()` is still resuming. The visible
symptom is `vue-ink playground: no active run context`.

Keep `TerminalPreview`'s execution queue serialized and coalesce stale sources.
If the runner ever grows direct cancellation, preserve the rule that stale runs
must not clear another run's context.

## Related

- [[../renderer/how-it-works]] — why `render()` needs stdout/stdin/stderr
  injected (the `runtime-context.ts` bridge exists for this).
