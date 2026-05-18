<script setup lang="ts">
import { computed, ref, watch, watchEffect } from "vue";
import { File, Repl, useStore, useVueImportMap } from "@vue/repl";
import Monaco from "@vue/repl/monaco-editor";
import "@vue/repl/style.css";
import vueInkDts from "vueink/dts-bundle?raw";

import TerminalPreview from "./playground/TerminalPreview.vue";
import { DEFAULT_APP } from "./playground/defaultFiles";
import { examples } from "./playground/examples";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "vue-ink-theme";
const readInitialTheme = (): Theme => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
const theme = ref<Theme>(readInitialTheme());
watch(theme, (value) => localStorage.setItem(THEME_STORAGE_KEY, value));
const toggleTheme = () => {
  theme.value = theme.value === "dark" ? "light" : "dark";
};

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

// Examples come from the monorepo-wide `/examples/` directory via Vite's glob
// import. Selecting one replaces the workspace's `App.vue` with that example's
// source — the rest of `store.files` (the hidden `vue-ink.d.ts`, etc.) stays
// intact. We pin the dropdown's value to a sentinel so re-selecting the same
// example after edits still resets the file.
const SELECT_PLACEHOLDER = "";
const selectedExample = ref<string>(SELECT_PLACEHOLDER);
const loadExample = (name: string) => {
  const example = examples.find((entry) => entry.name === name);
  if (!example) return;
  store.setFiles({ "App.vue": example.code }, "App.vue");
  selectedExample.value = SELECT_PLACEHOLDER;
};

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
  <div class="playground" :class="{ dark: theme === 'dark' }">
    <header class="topbar">
      <span class="logo">vue-ink</span>
      <span class="sub">playground</span>
      <label class="examples-picker">
        <span class="visually-hidden">Load example</span>
        <select
          v-model="selectedExample"
          aria-label="Load example"
          @change="loadExample(selectedExample)"
        >
          <option :value="SELECT_PLACEHOLDER" disabled>Examples…</option>
          <option v-for="example in examples" :key="example.name" :value="example.name">
            {{ example.name }} — {{ example.description }}
          </option>
        </select>
      </label>
      <button
        class="theme-toggle"
        type="button"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        {{ theme === "dark" ? "☀" : "🌙" }}
      </button>
      <a class="repo" href="https://github.com/alexanderop/vue-ink" target="_blank" rel="noopener">
        github →
      </a>
    </header>

    <div class="split">
      <div class="editor-pane">
        <Repl
          :store="store"
          :editor="Monaco"
          :theme="theme"
          :show-output="false"
          :show-import-map="false"
        />
      </div>
      <div class="preview-pane">
        <TerminalPreview :compiled="compiled" :theme="theme" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground {
  --pg-bg: #ffffff;
  --pg-bg-soft: #f6f8fa;
  --pg-border: #d0d7de;
  --pg-text: #1f2328;
  --pg-text-muted: #656d76;
  --pg-accent: #1f883d;
  --pg-link: #0969da;

  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--pg-bg);
  color: var(--pg-text);
}
.playground.dark {
  --pg-bg: #1e1e1e;
  --pg-bg-soft: #252526;
  --pg-border: #333;
  --pg-text: #d4d4d4;
  --pg-text-muted: #888;
  --pg-accent: #4ec9b0;
  --pg-link: #569cd6;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--pg-bg-soft);
  border-bottom: 1px solid var(--pg-border);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  color: var(--pg-text);
}
.logo {
  font-weight: 600;
  color: var(--pg-accent);
}
.sub {
  color: var(--pg-text-muted);
}
.examples-picker {
  display: inline-flex;
  align-items: center;
}
.examples-picker select {
  background: var(--pg-bg);
  border: 1px solid var(--pg-border);
  color: var(--pg-text);
  font: inherit;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  max-width: 320px;
}
.examples-picker select:hover {
  border-color: var(--pg-accent);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.theme-toggle {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--pg-border);
  color: var(--pg-text);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.4;
}
.theme-toggle:hover {
  background: var(--pg-bg);
}
.repo {
  color: var(--pg-link);
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
  border-right: 1px solid var(--pg-border);
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
