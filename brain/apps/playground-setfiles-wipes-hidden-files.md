# `store.setFiles()` wipes the hidden `vue-ink.d.ts` (sync + async)

@vue/repl's `setFiles` is two footguns in one:

1. It builds a fresh object and **reassigns** `store.files`
   (`repos/repl/src/store.ts:349`, `store.files = files`). Anything not
   in the new map (hidden files, generated tsconfig, etc.) is gone, and
   the matching Monaco models get disposed by the next `initMonaco`
   watchEffect pass (`repos/repl/src/monaco/env.ts:31`).
2. It is **async** — it awaits `compileFile` on every entry before
   reassigning `store.files`. So even a `setFiles(...); addFile(hidden)`
   sequence at the top of a `<script setup>` is a race: the synchronous
   `addFile` lands first, then `setFiles`' promise resolves and
   clobbers the hidden file.

The combined effect destroys the bundled `vue-ink.d.ts` we install via
`store.addFile(new File(..., /* hidden */ true))` to teach Volar the
`'vue-ink'` / `'vueink'` module shapes — and Monaco IntelliSense for
`Box`, `useInput`, props, etc. silently drops back to `any` (or to a
"Cannot find module 'vueink'" diagnostic).

## Where this bit us — twice

- Commit `88888197f` (examples dropdown) wired
  `store.setFiles({ "App.vue": example.code }, "App.vue")` into
  `loadExample`. After clicking the dropdown, types disappeared. This
  was the loud regression.
- The same file's startup path also called
  `store.setFiles({ "App.vue": DEFAULT_APP }, "App.vue")` immediately
  before `store.addFile(vue-ink.d.ts, …, hidden=true)`. The async race
  meant the hidden file was wiped **on every cold load with no hash** —
  the quiet regression that had been present since the original
  IntelliSense wiring landed.

## Fix pattern

Replace **both** call sites with `addFile`. It mutates
`files.value[name]` synchronously per-key and never touches the rest
of the map:

```ts
// Install the hidden type defs first — sync, no race.
store.addFile(new File("vue-ink.d.ts", wrappedDts, /* hidden */ true));

// Default file on cold load: same pattern, also synchronous.
if (!location.hash) {
  store.addFile(new File(store.mainFile, DEFAULT_APP));
}

// Switching examples: mutate the existing file's code in place.
const loadExample = (name: string) => {
  const file = store.files[store.mainFile];
  if (file) file.code = exampleCode;
  else store.addFile(new File(store.mainFile, exampleCode));
  store.setActive(store.mainFile);
};
```

`@vue/repl` already watches `activeFile.code` to recompile, and Monaco
syncs the editor model via its `props.value` watcher
(`repos/repl/src/monaco/Monaco.vue:103`). No replacement of
`store.files` ⇒ no model disposal ⇒ hidden dts survives.

## When you actually need `setFiles`

If you must call it (e.g., importing a multi-file scenario), **await**
it first, then re-install the hidden dts:

```ts
await store.setFiles(newFiles, "App.vue");
store.addFile(new File("vue-ink.d.ts", wrappedDts, true));
```

Skipping the await means the addFile lands before the eventual
`store.files = …` assignment and gets wiped.

## Regression test

`apps/playground/tests/smoke.spec.ts` covers this end-to-end:
loads the playground, picks an example, asserts both that
`store.files['vue-ink.d.ts']` is still present and that Monaco's
content hover widget contains a `DefineComponent` reference. App.vue
exposes `window.__playgroundStore` for the first half of the check.

## Related

- [[playground-monaco-types]] — why the hidden `vue-ink.d.ts` exists
  in the first place
- [[playground-dts-bundle]] — how the bundle is produced
- [[playground-dts-component-any]] — sibling regression (components
  flattened to `any`)
- [[../testing/monaco-hover-e2e]] — the end-to-end regression test that proves the hidden dts survives across example switches
