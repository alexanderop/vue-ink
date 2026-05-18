<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

import { runUserCode, type RunResult } from "./runner";

const props = withDefaults(
  defineProps<{
    compiled: string | null;
    theme?: "light" | "dark";
  }>(),
  { theme: "dark" },
);

const XTERM_DARK = { background: "#1e1e1e", foreground: "#d4d4d4", cursor: "#ffffff" };
const XTERM_LIGHT = { background: "#ffffff", foreground: "#1f2328", cursor: "#1f2328" };
const xtermTheme = computed(() => (props.theme === "light" ? XTERM_LIGHT : XTERM_DARK));

// Erase, clear scrollback, home.
const CLEAR_AND_HOME = "\x1B[2J\x1B[3J\x1B[H";
const RED = "\x1B[31m";
const RESET = "\x1B[0m";

const hostEl = ref<HTMLDivElement>();
const term = shallowRef<Terminal>();
const active = shallowRef<RunResult>();
const errorMessage = ref("");

let observer: ResizeObserver | undefined;

const clearAndWrite = (line: string): void => {
  term.value?.write(CLEAR_AND_HOME);
  if (line) term.value?.write(line);
};

const teardownActive = async (): Promise<void> => {
  const current = active.value;
  active.value = undefined;
  if (current) await current.dispose();
};

const runCompiled = async (source: string): Promise<void> => {
  if (!term.value) return;
  await teardownActive();
  clearAndWrite("");
  errorMessage.value = "";
  const outcome = await runUserCode(term.value, source);
  if (!outcome.ok) {
    errorMessage.value = outcome.error.message;
    clearAndWrite(`${RED}✖${RESET} ${outcome.error.message.replace(/\n/g, "\r\n")}\r\n`);
    return;
  }
  active.value = outcome.result;
};

onMounted(() => {
  if (!hostEl.value) return;
  const terminal = new Terminal({
    cursorBlink: true,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 13,
    convertEol: true,
    theme: xtermTheme.value,
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(hostEl.value);
  fitAddon.fit();
  term.value = terminal;

  observer = new ResizeObserver(() => fitAddon.fit());
  observer.observe(hostEl.value);

  if (props.compiled) void runCompiled(props.compiled);
});

onBeforeUnmount(async () => {
  observer?.disconnect();
  await teardownActive();
  term.value?.dispose();
});

watch(
  () => props.compiled,
  (next) => {
    if (next == null || next === "") return;
    void runCompiled(next);
  },
);

watch(xtermTheme, (next) => {
  if (term.value) term.value.options.theme = next;
});
</script>

<template>
  <div class="terminal-pane" :class="{ light: theme === 'light' }">
    <div class="terminal-header">terminal</div>
    <div ref="hostEl" class="terminal-host" />
    <div v-if="errorMessage" class="terminal-error">{{ errorMessage }}</div>
  </div>
</template>

<style scoped>
.terminal-pane {
  --term-bg: #1e1e1e;
  --term-header-fg: #888;
  --term-border: #333;
  --term-error-bg: #2d1414;
  --term-error-border: #5a2222;
  --term-error-fg: #f48771;

  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--term-bg);
}
.terminal-pane.light {
  --term-bg: #ffffff;
  --term-header-fg: #656d76;
  --term-border: #d0d7de;
  --term-error-bg: #ffebe9;
  --term-error-border: #ffabaa;
  --term-error-fg: #cf222e;
}
.terminal-header {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--term-header-fg);
  border-bottom: 1px solid var(--term-border);
  font-family: "SF Mono", Menlo, monospace;
}
.terminal-host {
  flex: 1;
  min-height: 0;
  padding: 8px;
}
.terminal-error {
  max-height: 30%;
  overflow: auto;
  padding: 8px 12px;
  background: var(--term-error-bg);
  border-top: 1px solid var(--term-error-border);
  color: var(--term-error-fg);
  font-family: "SF Mono", Menlo, monospace;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>
