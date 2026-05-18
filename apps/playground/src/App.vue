<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { File, Repl, useStore, useVueImportMap } from "@vue/repl";
import Monaco from "@vue/repl/monaco-editor";
import "@vue/repl/style.css";
import vueInkDts from "vueink/dts-bundle?raw";

import TerminalPreview from "./playground/TerminalPreview.vue";
import { DEFAULT_APP } from "./playground/defaultFiles";

const { importMap: vueImportMap, vueVersion } = useVueImportMap();

// The REPL runs the user's compiled code in a hidden preview iframe that can't
// reach our proxy module. The stub has to provide every name a user might
// statically import from vue-ink — otherwise the iframe throws `module 'vue-ink'
// does not provide an export named 'X'`. runner.ts rewrites bare imports to the
// real proxy at execution time, so these named bindings never actually run.
const VUE_INK_STUB_EXPORTS = [
  "Box",
  "Text",
  "Newline",
  "Spacer",
  "Static",
  "Transform",
  "render",
  "renderToString",
  "measureElement",
  "useApp",
  "useStdin",
  "useStdout",
  "useStderr",
  "useWindowSize",
  "useIsScreenReaderEnabled",
  "useInput",
  "usePaste",
  "useFocus",
  "useFocusManager",
  "useAnimation",
  "useBoxMetrics",
  "useCursor",
  "kittyFlags",
  "kittyModifiers",
];
const VUE_INK_STUB_URL = `data:text/javascript,${encodeURIComponent(
  `${VUE_INK_STUB_EXPORTS.map((name) => `export const ${name} = undefined;`).join("\n")}\nexport default {};`,
)}`;

const importMap = computed(() => ({
  imports: {
    ...vueImportMap.value.imports,
    "vue-ink": VUE_INK_STUB_URL,
  },
}));

const store = useStore(
  {
    builtinImportMap: importMap,
    vueVersion,
  },
  location.hash,
);

if (!location.hash) {
  store.setFiles({ "App.vue": DEFAULT_APP }, "App.vue");
}

// Feed the bundled `vue-ink` types to Volar as a hidden workspace file. The
// REPL's Monaco worker syncs every entry in `store.files` into the language
// service, so the `declare module` blocks below give the editor real
// autocomplete + hover types for `Box`, `useInput`, props, etc. — without
// needing the package to exist on a CDN. The bundle is regenerated whenever
// vue-ink builds, so types stay in lockstep with the workspace.
//
// Two module aliases because user code may write `from 'vue-ink'` (nicer
// for docs/blog posts) or `from 'vueink'` (the published npm name) —
// runner.ts:99 rewrites both at runtime.
const VUE_INK_TYPES_FILENAME = "vue-ink.d.ts";
const wrappedDts = [
  `declare module 'vue-ink' {`,
  vueInkDts,
  `}`,
  `declare module 'vueink' {`,
  vueInkDts,
  `}`,
].join("\n");
store.addFile(new File(VUE_INK_TYPES_FILENAME, wrappedDts, /* hidden */ true));

// Persist edits to the URL hash so the playground is shareable. `serialize()`
// walks every file and LZ-compresses them, so debounce instead of firing it
// per keystroke.
let serializeTimer: ReturnType<typeof setTimeout> | undefined;
watchEffect(() => {
  void store.activeFile?.code;
  if (serializeTimer) clearTimeout(serializeTimer);
  serializeTimer = setTimeout(() => {
    history.replaceState({}, "", store.serialize());
  }, 300);
});

const compiled = computed(() => store.activeFile?.compiled?.js ?? null);
</script>

<template>
  <div class="playground">
    <header class="topbar">
      <span class="logo">vue-ink</span>
      <span class="sub">playground</span>
      <a class="repo" href="https://github.com/alexanderop/vue-ink" target="_blank" rel="noopener">
        github →
      </a>
    </header>

    <div class="split">
      <div class="editor-pane">
        <Repl :store="store" :editor="Monaco" :show-output="false" :show-import-map="false" />
      </div>
      <div class="preview-pane">
        <TerminalPreview :compiled="compiled" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #252526;
  border-bottom: 1px solid #333;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
}
.logo {
  font-weight: 600;
  color: #4ec9b0;
}
.sub {
  color: #888;
}
.repo {
  margin-left: auto;
  color: #569cd6;
  text-decoration: none;
  font-size: 12px;
}
.repo:hover {
  text-decoration: underline;
}
.split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}
.editor-pane,
.preview-pane {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid #333;
}
.preview-pane {
  border-right: none;
}
</style>

<style>
/* The REPL ships its own SplitPane with editor on the left and a preview
 * iframe on the right. We don't use the iframe — TerminalPreview is the real
 * preview — so collapse the right pane and stretch the editor to fill. The
 * iframe still mounts (the REPL evaluates the user's code into it), but it's
 * fully hidden and no longer competes for layout space. */
.editor-pane .split-pane > .right {
  display: none !important;
}
.editor-pane .split-pane > .left {
  width: 100% !important;
}
.editor-pane .split-pane > .left > .dragger,
.editor-pane .split-pane > .toggler {
  display: none !important;
}
</style>
