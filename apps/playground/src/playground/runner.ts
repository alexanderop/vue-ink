import type { Component } from "vue";
import type { Terminal } from "@xterm/xterm";
import type { Instance } from "vueink";

import * as vueNs from "vue";
import * as vueinkNs from "vueink";

import { createShims } from "./shim";
import { clearActiveContext, getActiveContext, setActiveContext } from "./runtime-context";

// The proxies share the playground shell's `vue` / `vueink` instances so user
// code uses the same reactivity scheduler and renderer as the host. We used to
// ship them as separate `.ts` files referenced via `new URL(..., import.meta.url)`,
// but Vite inlines that pattern as a raw data URL in production — the browser
// then choked on bare specifiers (`from 'vue'`) and TypeScript syntax. Building
// the proxy modules at runtime sidesteps that entirely.
const PLAYGROUND_RUNTIME_KEY = "__VUE_INK_PLAYGROUND_RUNTIME__";

type PlaygroundRuntime = {
  vue: typeof vueNs;
  vueink: typeof vueinkNs;
  getActiveContext: typeof getActiveContext;
};

const installRuntime = (): void => {
  (globalThis as Record<string, unknown>)[PLAYGROUND_RUNTIME_KEY] = {
    vue: vueNs,
    vueink: vueinkNs,
    getActiveContext,
  } satisfies PlaygroundRuntime;
};

// Guard against reserved words and non-identifier keys that Object.keys may
// return for unusual module namespaces. Bundled `vue` / `vueink` are clean,
// but the regex makes the proxy generation total.
const VALID_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const RESERVED = new Set([
  "default",
  "let",
  "const",
  "var",
  "class",
  "function",
  "import",
  "export",
]);
const isReExportable = (name: string): boolean => VALID_IDENT.test(name) && !RESERVED.has(name);

const buildVueProxy = (): string => {
  const names = Object.keys(vueNs).filter(isReExportable);
  return [
    `const rt = globalThis[${JSON.stringify(PLAYGROUND_RUNTIME_KEY)}];`,
    `const ns = rt.vue;`,
    ...names.map((n) => `export const ${n} = ns[${JSON.stringify(n)}];`),
  ].join("\n");
};

const buildVueInkProxy = (): string => {
  const names = Object.keys(vueinkNs).filter(isReExportable);
  const passthrough = names.filter((n) => n !== "render" && n !== "renderToString");
  return [
    `const rt = globalThis[${JSON.stringify(PLAYGROUND_RUNTIME_KEY)}];`,
    `const ns = rt.vueink;`,
    `const getActiveContext = rt.getActiveContext;`,
    ...passthrough.map((n) => `export const ${n} = ns[${JSON.stringify(n)}];`),
    `export const renderToString = ns.renderToString;`,
    // User-supplied options still win — pinning interactive avoids the
    // renderer guessing from `isTTY`, and alt-screen would hide frames when
    // the app unmounts because xterm.js owns its own scrollback.
    `export const render = (component, options = {}) => {`,
    `  const ctx = getActiveContext();`,
    `  return ns.render(component, {`,
    `    stdout: ctx.stdout, stdin: ctx.stdin, stderr: ctx.stderr,`,
    `    interactive: true, alternateScreen: false, patchConsole: false,`,
    `    ...options,`,
    `  });`,
    `};`,
  ].join("\n");
};

const blobURL = (source: string): string =>
  URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

let proxyUrls: { vue: string; vueink: string } | undefined;
const ensureProxyUrls = (): { vue: string; vueink: string } => {
  if (!proxyUrls) {
    installRuntime();
    proxyUrls = {
      vue: blobURL(buildVueProxy()),
      vueink: blobURL(buildVueInkProxy()),
    };
  }
  return proxyUrls;
};

// Match `vue-ink` / `vueink` before plain `vue`, otherwise the `vue` rule
// corrupts the hyphenated names. Only `from`-style imports are rewritten —
// dynamic `import('vue')` is not currently supported in playground sources.
const rewriteImports = (source: string): string => {
  const { vue, vueink } = ensureProxyUrls();
  const rules: ReadonlyArray<readonly [RegExp, string]> = [
    [/(\bfrom\s*['"])vueink(['"])/g, `$1${vueink}$2`],
    [/(\bfrom\s*['"])vue-ink(['"])/g, `$1${vueink}$2`],
    [/(\bfrom\s*['"])vue(['"])/g, `$1${vue}$2`],
  ];
  return rules.reduce<string>(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    source,
  );
};

export type RunResult = {
  instance: Instance;
  dispose: () => Promise<void>;
};

export type RunFailure = { ok: false; error: Error };
export type RunSuccess = { ok: true; result: RunResult };
export type RunOutcome = RunFailure | RunSuccess;

export const runUserCode = async (term: Terminal, compiledJs: string): Promise<RunOutcome> => {
  const shims = createShims(term);
  setActiveContext({ stdout: shims.stdout, stdin: shims.stdin, stderr: shims.stderr });

  let moduleURL: string | undefined;

  const cleanup = (): void => {
    shims.dispose();
    clearActiveContext();
    if (moduleURL) URL.revokeObjectURL(moduleURL);
  };

  try {
    moduleURL = blobURL(rewriteImports(compiledJs));
    const mod = (await import(/* @vite-ignore */ moduleURL)) as {
      default?: unknown;
      instance?: Instance;
    };

    // Two supported entry shapes:
    //   1. `export default <Component>` — playground calls render() itself.
    //   2. Module body calls render() and re-exports the resulting instance.
    let instance: Instance;
    if (mod.instance && typeof mod.instance.waitUntilExit === "function") {
      ({ instance } = mod);
    } else if (mod.default) {
      const { vueink: vueinkProxyUrl } = ensureProxyUrls();
      const { render } = (await import(/* @vite-ignore */ vueinkProxyUrl)) as {
        render: (c: Component) => Instance;
      };
      instance = render(mod.default as Component);
    } else {
      throw new Error(
        "Playground entry must `export default` a Vue component, or run render() at module scope and export the resulting `instance`.",
      );
    }

    return {
      ok: true,
      result: {
        instance,
        dispose: async () => {
          try {
            instance.unmount();
            await instance.waitUntilExit().catch(() => undefined);
          } finally {
            cleanup();
          }
        },
      },
    };
  } catch (error) {
    cleanup();
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};
