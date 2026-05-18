import process from "node:process";
import { formatWithOptions } from "node:util";
import Yoga from "yoga-layout";
import ansiEscapes from "ansi-escapes";
import { h, nextTick as vueNextTick, ref, shallowRef, watch, type Component } from "vue";
import { createApp } from "./renderer.ts";
import {
  createNode,
  emitLayoutListeners,
  Output,
  renderNodeToOutput,
  renderNodeToScreenReaderOutput,
  renderStaticSubtrees,
  hasStaticContent,
  type DOMElement,
} from "@vue-ink/core";
import { createInputManager } from "./input.ts";
import { createFocusManager } from "./focus-context.ts";
import { BSU, ESU } from "./write-synchronized.ts";
import {
  APP_CONTEXT_KEY,
  STDIN_CONTEXT_KEY,
  STDOUT_CONTEXT_KEY,
  STDERR_CONTEXT_KEY,
  ACCESSIBILITY_CONTEXT_KEY,
  FOCUS_CONTEXT_KEY,
  ANIMATION_CONTEXT_KEY,
  CURSOR_CONTEXT_KEY,
  type CursorPosition,
} from "./context.ts";
import { createAnimationScheduler } from "./animation-scheduler.ts";
import {
  enableKittyKeyboard,
  disableKittyKeyboard,
  hasCompleteKittyQueryResponse,
  stripKittyQueryResponses,
  type KittyKeyboardOptions,
  type KittyFlagName,
} from "./kitty-keyboard.ts";
import {
  buildCursorSuffix,
  buildReturnToBottomPrefix,
  cursorPositionChanged,
} from "./cursor-helpers.ts";

/**
 * Configuration for {@link render}. All fields are optional — sensible
 * defaults are inferred from the surrounding terminal and environment.
 */
export type RenderOptions = {
  /** Stream to paint frames into. Defaults to `process.stdout`. */
  stdout?: NodeJS.WriteStream;
  /** Stream to read keystrokes from. Defaults to `process.stdin`. */
  stdin?: NodeJS.ReadStream;
  /** Stream for `useStderr().write()`. Defaults to `process.stderr`. */
  stderr?: NodeJS.WriteStream;
  /**
   * Append every frame instead of erasing the previous one. Useful for
   * post-mortem inspection of how a UI evolved — pipe to a file and scroll.
   */
  debug?: boolean;
  /**
   * Unmount the app when Ctrl+C is received on a raw-mode stdin. Default:
   * `true`. Set to `false` to intercept Ctrl+C in a `useInput` handler.
   */
  exitOnCtrlC?: boolean;
  /** Kitty keyboard protocol detection / opt-in. See {@link KittyKeyboardOptions}. */
  kittyKeyboard?: KittyKeyboardOptions;
  /**
   * Force interactive (`true`) or non-interactive (`false`) rendering. By
   * default, interactive mode is enabled only when stdout is a TTY and the
   * process is not running in CI. Non-interactive mode skips ANSI escapes,
   * cursor manipulation, and the resize listener, emitting only the final
   * frame on unmount.
   */
  interactive?: boolean;
  /**
   * Whether a screen reader is active. Components can read this via
   * `useIsScreenReaderEnabled()` to render descriptive text instead of
   * decoration. Defaults to `process.env.INK_SCREEN_READER === 'true'`.
   */
  isScreenReaderEnabled?: boolean;
  /**
   * Intercept `console.log` (etc.) and write the output above the live frame
   * via the same choreography as `useStdout().write`. Reference-counted across
   * concurrent `render()` calls. Default: `true`.
   */
  patchConsole?: boolean;
  /**
   * Invoked after each committed frame with render metrics. A throwing
   * callback is logged to stderr and never propagates to the renderer.
   */
  onRender?: (metrics: RenderMetrics) => void;
  /**
   * Cap on the number of paints per second. Defaults to 30. Multiple state
   * updates inside the throttle window collapse into a single trailing-edge
   * frame so terminals over SSH stay responsive. Pass `Infinity` to render
   * synchronously on every commit (mostly for tests). Must be > 0.
   */
  maxFps?: number;
  /**
   * Render into the terminal's alternate screen buffer (CSI ?1049h on mount,
   * CSI ?1049l on unmount). Same mechanism vim / htop / less use to avoid
   * polluting the user's scrollback. Only honored when interactive mode is on
   * AND stdout is a TTY — non-interactive streams (CI, pipes) ignore the
   * option so log capture is unaffected. Default: `false`.
   */
  alternateScreen?: boolean;
  /**
   * When enabled, the renderer emits a line-level diff between the previous
   * and next paint instead of erasing and rewriting the entire frame. Unchanged
   * lines are skipped with `cursorNextLine`; shrinking output erases the
   * dropped tail with `eraseLines`. Useful over high-latency links. Default:
   * `false`.
   */
  incrementalRendering?: boolean;
};

/**
 * Payload passed to the {@link RenderOptions.onRender} callback after each
 * committed paint. Mirrors ink's `RenderMetrics` shape for drop-in porters.
 */
export type RenderMetrics = {
  /** Monotonically increasing frame index, starting at `0`. */
  frame: number;
  /**
   * Time spent rendering this frame, in milliseconds. Matches ink's
   * `RenderMetrics.renderTime` (`repos/ink/src/ink.tsx:207-212`) so direct
   * ports of `onRender({ renderTime }) => …` work unchanged.
   */
  renderTime: number;
  /** Number of terminal lines the frame occupies after layout. */
  lineCount: number;
  /** The fully composed frame string, including ANSI escapes. */
  output: string;
};

const isTruthyEnv = (v: string | undefined): boolean =>
  v !== undefined && v !== "" && v !== "0" && v.toLowerCase() !== "false";

const isCiEnv = (): boolean => {
  // `is-in-ci`'s logic, inlined: CI providers set one of these.
  // `CI` and `CONTINUOUS_INTEGRATION` are string-valued (a shell that exports
  // `CI=false` means *not* in CI), so we have to parse them rather than
  // truthy-check. `BUILD_NUMBER` / `RUN_ID` are presence-only — CI providers
  // either set them to a real ID or leave them unset.
  const { env } = process;
  return (
    isTruthyEnv(env["CI"]) ||
    isTruthyEnv(env["CONTINUOUS_INTEGRATION"]) ||
    env["BUILD_NUMBER"] !== undefined ||
    env["RUN_ID"] !== undefined
  );
};

/**
 * Handle returned by {@link render}. Use it to swap the root component,
 * unmount the app, await exit, or clear the live frame from outside.
 */
export type Instance = {
  /** Replace the mounted root with a new component, preserving the terminal session. */
  rerender: (component: Component) => void;
  /** Tear down the app and release the terminal. Resolves any pending `waitUntilExit`. */
  unmount: () => void;
  /**
   * Resolves when the app unmounts. If `useApp().exit(value)` was called the
   * promise resolves with that value; `useApp().exit(error)` (an `Error`)
   * rejects it. Plain `unmount()` resolves with `undefined`.
   */
  waitUntilExit: () => Promise<unknown>;
  /**
   * Resolves once any pending throttled paint has flushed and the underlying
   * `stdout.write` callback has fired. Use this in tests instead of polling.
   */
  waitUntilRenderFlush: () => Promise<void>;
  /** Erase the current frame from the terminal without unmounting. */
  clear: () => void;
  /**
   * Unmount the current app and remove the internal instance for this stdout.
   * Useful for advanced cases where you need `render()` to create a fresh
   * instance for the same stream without leaving terminal state behind.
   * Alias of {@link Instance.unmount} — present for ink compatibility.
   */
  cleanup: () => void;
};

// One live renderer per stdout: reusing the same stream creates two renderers
// competing for the same lines. Mirrors ink's `instances.ts`.
const instances = new WeakMap<NodeJS.WriteStream, Instance>();

// Auxiliary registry kept alongside `instances` so test helpers can await
// pending paints across *all* live renderers. WeakMap isn't iterable; this
// is — entries are added on create, removed on unmount.
const activeInstances = new Set<Instance>();

// Test-only: await every active instance's next paint. Tests call this from
// the standalone `flush()` helper which doesn't carry an instance reference.
/* v8 ignore start — exercised only via test helpers */
export const _flushActiveInstances = async (): Promise<void> => {
  if (activeInstances.size === 0) return;
  await Promise.all([...activeInstances].map((i) => i.waitUntilRenderFlush()));
};
/* v8 ignore stop */

// Mirrors the surface that ink's `patch-console` dep covers. stderr-bound
// methods get routed through `writeStderr` (warn/error); everything else
// goes through `writeStdout`. Keep this list in sync with `node:console`'s
// public methods so console output doesn't bleed through the live frame.
type ConsoleMethod =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "trace"
  | "dir"
  | "dirxml"
  | "table"
  | "group"
  | "groupCollapsed"
  | "groupEnd"
  | "assert"
  | "count"
  | "countReset"
  | "time"
  | "timeEnd"
  | "timeLog"
  | "profile"
  | "profileEnd"
  | "timeStamp";
const CONSOLE_METHODS: readonly ConsoleMethod[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "trace",
  "dir",
  "dirxml",
  "table",
  "group",
  "groupCollapsed",
  "groupEnd",
  "assert",
  "count",
  "countReset",
  "time",
  "timeEnd",
  "timeLog",
  "profile",
  "profileEnd",
  "timeStamp",
];
type ConsoleSubscriber = {
  writeStdout: (data: string) => void;
  writeStderr: (data: string) => void;
};
// Ordered LIFO stack — only the top (most-recently subscribed) receives
// patched console calls. Mirrors ink's behaviour via `patch-console`, which
// has a single module-level `originalMethods` slot: each new patch overwrites
// the previous, restore unwinds to the prior patch. Two concurrent renders
// against different stdouts no longer both intercept the process-global
// `console.log`. See brain/renderer/console-patch.md.
const consoleSubscribers: ConsoleSubscriber[] = [];
let originalConsoleMethods: Partial<Record<ConsoleMethod, Console[ConsoleMethod]>> | undefined;

// Only `warn` and `error` route to stderr; everything else (including
// `assert`, `count`, `time*`, `dir*`, `table`, `group*`, `profile*`,
// `timeStamp`) goes through stdout. Matches Node's defaults for the
// formatted methods; the timing/grouping methods don't have a stderr
// equivalent in Node either.
const STDERR_CONSOLE_METHODS: ReadonlySet<ConsoleMethod> = new Set(["warn", "error"]);

// The expanded `Console[ConsoleMethod]` union has incompatible call
// signatures (e.g. `table` vs `log`), so TS infers an unsatisfiable
// intersection on assignment. Route through `unknown` — the runtime
// behavior (forward everything to formatWithOptions) is uniform.
type AnyConsoleFn = (...args: unknown[]) => void;

const installConsolePatch = (): void => {
  if (originalConsoleMethods) return;
  originalConsoleMethods = {};
  const consoleAsRecord = console as unknown as Record<ConsoleMethod, AnyConsoleFn>;
  for (const method of CONSOLE_METHODS) {
    originalConsoleMethods[method] = console[method];
    const isStderrChannel = STDERR_CONSOLE_METHODS.has(method);
    consoleAsRecord[method] = (...args: unknown[]) => {
      const active = consoleSubscribers.at(-1);
      if (!active) return;
      const text = `${formatWithOptions({ colors: true }, ...args)}\n`;
      if (isStderrChannel) active.writeStderr(text);
      else active.writeStdout(text);
    };
  }
};

const uninstallConsolePatch = (): void => {
  if (!originalConsoleMethods) return;
  const consoleAsRecord = console as unknown as Record<ConsoleMethod, AnyConsoleFn>;
  for (const method of CONSOLE_METHODS) {
    if (originalConsoleMethods[method]) {
      consoleAsRecord[method] = originalConsoleMethods[method] as AnyConsoleFn;
    }
  }
  originalConsoleMethods = undefined;
};

const subscribeConsole = (sub: ConsoleSubscriber): (() => void) => {
  installConsolePatch();
  consoleSubscribers.push(sub);
  return () => {
    const idx = consoleSubscribers.lastIndexOf(sub);
    if (idx !== -1) consoleSubscribers.splice(idx, 1);
    if (consoleSubscribers.length === 0) uninstallConsolePatch();
  };
};

// Placeholder for forward-declared resolve/reject/unmount slots — replaced
// synchronously before the surrounding code reads them.
/* v8 ignore next */
const noop = (): void => {};

const renderTree = (
  rootNode: DOMElement,
  terminalWidth: number,
  isScreenReaderEnabled: boolean,
): { output: string; height: number; staticOutput: string } => {
  rootNode.yogaNode!.setWidth(terminalWidth);
  rootNode.yogaNode!.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

  const hasStatic = hasStaticContent(rootNode);

  if (isScreenReaderEnabled) {
    // Screen-reader mode collapses the 2D layout into a 1D string by
    // walking the DOM directly. Yoga still ran above so `display: none`
    // nodes resolve correctly. `<Static>` subtrees aren't currently
    // announced separately — they participate in the same screen-reader
    // walk as the live frame.
    const text = renderNodeToScreenReaderOutput(rootNode, {
      skipStaticElements: false,
    });
    const height = text === "" ? 0 : text.split("\n").length;
    return { output: text, height, staticOutput: "" };
  }

  const output = new Output({
    width: rootNode.yogaNode!.getComputedWidth(),
    height: rootNode.yogaNode!.getComputedHeight(),
  });
  renderNodeToOutput(rootNode, output, { skipStaticElements: hasStatic });
  const { output: text, height } = output.get();

  const staticOutput = hasStatic ? renderStaticSubtrees(rootNode, terminalWidth) : "";

  return { output: text, height, staticOutput };
};

/**
 * Mount a Vue component into the terminal and start the live render loop.
 * Returns an {@link Instance} handle for rerendering, unmounting, and
 * awaiting exit. Only one live renderer per stdout is allowed — a second
 * `render()` call against the same stream warns and returns the existing
 * instance without applying the new tree.
 *
 * In a TTY (and outside CI), the renderer paints over previous frames using
 * ANSI escapes; in non-interactive streams (CI, pipes, redirects) only the
 * final frame is emitted on unmount. Behaviour is configurable through
 * {@link RenderOptions} — alt-screen mode, FPS cap, console patching, screen
 * reader output, and more.
 *
 * @param component - The Vue component to mount as the root of the tree.
 * @param options - See {@link RenderOptions} for the full surface.
 * @returns An {@link Instance} controlling the live renderer.
 *
 * @example
 * ```ts
 * import { h } from 'vue';
 * import { render, Text } from 'vueink';
 *
 * const App = { render: () => h(Text, () => 'Hello, world!') };
 * const { waitUntilExit } = render(App);
 * await waitUntilExit();
 * ```
 */
const render = (component: Component, options: RenderOptions = {}): Instance => {
  const stdout = options.stdout ?? process.stdout;
  const stdin = options.stdin ?? process.stdin;
  const stderr = options.stderr ?? process.stderr;
  const debug = options.debug ?? false;
  const exitOnCtrlC = options.exitOnCtrlC ?? true;
  const isTTY = Boolean((stdout as NodeJS.WriteStream).isTTY);
  const writeStream = stdout as NodeJS.WriteStream;
  const interactive = options.interactive ?? (isTTY && !isCiEnv());
  const useTTYFrame = interactive && !debug;
  // Alt-screen is gated on both interactive AND isTTY: non-interactive streams
  // (CI, pipes) ignore the option so captured logs stay flat, and a non-TTY
  // stream can't reliably switch buffers anyway. Mirrors ink's
  // `resolveAlternateScreenOption`.
  const useAlternateScreen = Boolean(options.alternateScreen) && interactive && isTTY;

  const maxFps = options.maxFps ?? 30;
  if (!(maxFps > 0)) {
    throw new Error(`vue-ink: maxFps must be > 0, got ${maxFps}.`);
  }
  // `debug` writes every frame verbatim so the test surface sees each commit;
  // throttling there would coalesce frames the test wants to count.
  const renderThrottleMs =
    debug || maxFps === Number.POSITIVE_INFINITY ? 0 : Math.max(1, Math.ceil(1000 / maxFps));

  const existing = instances.get(writeStream);
  if (existing) {
    // Match ink (`repos/ink/src/render.ts:265-273`): warn and return the
    // existing instance WITHOUT applying the new tree. Write the warning
    // directly to the real stderr so an existing alternate-screen renderer
    // cannot swallow it via patchConsole.
    process.stderr.write(
      "Warning: render() was called again for the same stdout before the previous instance was unmounted. Reusing stdout across multiple render() calls is unsupported. Call unmount() first.\n",
    );
    return existing;
  }

  const rootNode = createNode("ink-root");
  const currentComponent = shallowRef<Component>(component);
  const Root = {
    render: () => h(currentComponent.value),
  };
  const app = createApp(Root);

  let lastOutput = "";
  let lastLineCount = 0;
  let lastOutputLines: string[] = [];
  let frameCounter = 0;
  let currentCursorPosition: CursorPosition | undefined;
  let lastCursorPosition: CursorPosition | undefined;
  const incrementalRendering = options.incrementalRendering ?? false;
  // Static is append-only scrollback. The Static component re-renders the
  // full item list each frame; we detect which suffix is new by comparing
  // against the previously emitted text. `lastStaticOutput` is the diff
  // anchor used in all modes; `fullStaticOutput` accumulates the running
  // scrollback only in debug mode, which re-emits the whole frame.
  let lastStaticOutput = "";
  let fullStaticOutput = "";
  // One-shot guard so a non-append-only Static mutation doesn't spam stderr
  // on every subsequent paint.
  let staticDivergenceWarned = false;
  // The Promise constructor runs its executor synchronously, so by the time
  // these are read elsewhere they're always the real resolve/reject — the
  // no-op assertions here just satisfy the type checker before assignment.
  let exitResolve: (value: unknown) => void = noop;
  let exitReject: (err: Error) => void = noop;
  const exitPromise = new Promise<unknown>((resolve, reject) => {
    exitResolve = resolve;
    exitReject = reject;
  });
  // Prevent unhandled-rejection crashes when app code exits with an error
  // but consumers never call waitUntilExit(). Mirrors ink at
  // `repos/ink/src/ink.tsx:456`.
  void exitPromise.catch(noop);
  // Value passed to `useApp().exit(value)` for non-error resolution. Mirrors
  // ink's `exitResult` field (`ink.tsx:309,489,842`).
  let exitResult: unknown;
  let unmounted = false;
  let cursorHidden = false;
  let kittyProtocolEnabled = false;

  // Forward-declared because inputManager/app callbacks below close over it,
  // but the real body (which itself calls inputManager.destroy/app.unmount)
  // can only be assembled once those values exist.
  let unmount: () => void = noop;
  // Forward-declared so the errorHandler at mount time (which calls
  // `unmount()` synchronously) can safely run before the `instance` literal
  // is assigned at the bottom of this closure. `Set#delete(undefined)` is a
  // harmless no-op.
  // eslint-disable-next-line prefer-const -- forward declaration; assigned below
  let instance: Instance | undefined;

  const inputManager = createInputManager({
    stdin,
    stdout: writeStream,
    exitOnCtrlC,
    onCtrlC: () => unmount(),
  });

  app.provide(APP_CONTEXT_KEY, {
    exit: (errorOrValue?: unknown) => {
      if (unmounted) return;
      if (errorOrValue instanceof Error) {
        // Reject path — `unmount()` later calls `exitResolve(exitResult)`
        // but `exitReject` claims the settlement first so the resolve is
        // a no-op on an already-rejected promise.
        exitReject(errorOrValue);
        unmount();
        return;
      }
      // Non-error resolution: stash the value so `unmount()` resolves
      // the exit promise with it. Mirrors ink at `ink.tsx:489`.
      exitResult = errorOrValue;
      unmount();
    },
    waitUntilRenderFlush: () => waitUntilRenderFlush(),
  });
  app.provide(STDIN_CONTEXT_KEY, {
    stdin,
    isRawModeSupported: inputManager.isRawModeSupported,
    setRawMode: inputManager.setRawMode,
    setBracketedPasteMode: inputManager.setBracketedPasteMode,
    emitter: inputManager.emitter,
  });

  const { destroy: destroyFocusManager, ...focusContext } = createFocusManager(
    inputManager.emitter,
  );
  app.provide(FOCUS_CONTEXT_KEY, focusContext);

  const animationScheduler = createAnimationScheduler();
  app.provide(ANIMATION_CONTEXT_KEY, {
    renderThrottleMs,
    subscribe: animationScheduler.subscribe,
  });

  app.provide(CURSOR_CONTEXT_KEY, {
    setCursorPosition: (position: CursorPosition | undefined) => {
      currentCursorPosition = position ? { x: position.x, y: position.y } : undefined;
    },
  });

  const eraseCurrentFrame = (): void => {
    if (!useTTYFrame || lastLineCount === 0) return;
    writeStream.write(ansiEscapes.eraseLines(lastLineCount + 1));
    lastOutput = "";
    lastLineCount = 0;
  };

  // Tracks whether an outer `writeAboveFrame` already opened a DEC 2026
  // synchronized frame. `doRender()` checks this so nested writes don't
  // emit a second BSU/ESU pair — terminals interpret stacked pairs as
  // "close immediately", defeating the whole point.
  let syncFrameDepth = 0;

  // Erase the current frame, write data to `target`, then repaint. Mirrors
  // ink's `useStdout().write` choreography so logs land above the live UI.
  // The erase + write + repaint trio is wrapped in synchronized-output
  // escapes so terminals supporting DEC 2026 don't flicker through a
  // half-erased intermediate frame on rapid writes. The whole call is a
  // no-op after unmount — matches ink at `ink.tsx:672-674`.
  //
  // Assumes `target` shares the same tty as `writeStream`: the erase and
  // repaint both go to stdout while `target` may be stderr. On a real
  // terminal the two streams attach to the same device, so the visual
  // effect is "data appears between erase and repaint." If stderr is piped
  // elsewhere, the data goes to the pipe and stdout shows a clean reflow —
  // surprising but not corrupting.
  //
  // Debug-mode branch mirrors ink at `ink.tsx:676-678` (stdout) and
  // `:705-708` (stderr): a single combined `stdout.write(data + frame)`
  // for stdout writes, and `stderr.write(data)` + a single replay write
  // to stdout for stderr writes. Splitting into separate writes (the
  // non-debug path's erase/write/repaint) breaks parity with ink's
  // debug-mode test surface, which inspects each captured write.
  const writeAboveFrame = (target: NodeJS.WriteStream, data: string): void => {
    if (unmounted) return;
    if (debug) {
      // Read the live tree at write-time. In Vue, post-flush watchers (the
      // natural caller of `useStdout().write` during a rerender) can fire
      // before the renderer's own post-flush paint, so the cached
      // `lastOutput` may still reflect the pre-update frame. Rendering here
      // mirrors ink: by the time React calls `writeToStdout`, the new
      // commit's `lastOutput` is already settled
      // (`repos/ink/src/ink.tsx:677,707`).
      const { output: text, staticOutput } = renderTree(
        rootNode,
        getTerminalWidth(),
        isScreenReaderEnabled.value,
      );
      if (staticOutput !== lastStaticOutput && staticOutput.startsWith(lastStaticOutput)) {
        fullStaticOutput += staticOutput.slice(lastStaticOutput.length);
        lastStaticOutput = staticOutput;
      }
      lastOutput = text;
      const replay = `${fullStaticOutput}${text}`;
      if (target === writeStream) {
        writeStream.write(`${data}${replay}`);
      } else {
        target.write(data);
        writeStream.write(replay);
      }
      return;
    }
    const sync = useTTYFrame;
    if (sync) {
      writeStream.write(BSU);
      syncFrameDepth += 1;
    }
    try {
      eraseCurrentFrame();
      target.write(data);
      renderImmediate();
    } finally {
      if (sync) {
        syncFrameDepth -= 1;
        writeStream.write(ESU);
      }
    }
  };

  let trailingTimer: ReturnType<typeof setTimeout> | undefined;
  let lastRenderAt = 0;
  let hasPendingRender = false;
  const commitWaiters: Array<() => void> = [];

  const drainCommitWaiters = (): void => {
    if (commitWaiters.length === 0) return;
    const waiters = commitWaiters.splice(0);
    for (const resolve of waiters) resolve();
  };

  const clearTrailingTimer = (): void => {
    if (trailingTimer === undefined) return;
    clearTimeout(trailingTimer);
    trailingTimer = undefined;
  };

  // Shared paint-now core: clear any trailing timer, drop the pending flag,
  // stamp the window, and paint. Every commit path funnels through here so
  // the three pieces of state can't drift.
  let hasCommitted = false;
  const commitNow = (): void => {
    clearTrailingTimer();
    hasPendingRender = false;
    lastRenderAt = Date.now();
    hasCommitted = true;
    doRender();
  };

  // Sync entry point — flushes any pending throttled work and paints now.
  // Used on mount, resize, and unmount where we cannot drop the frame.
  const renderImmediate = commitNow;

  const scheduleTrailingRender = (delay: number): void => {
    if (trailingTimer !== undefined) return;
    trailingTimer = setTimeout(
      () => {
        trailingTimer = undefined;
        if (unmounted || !hasPendingRender) return;
        commitNow();
      },
      Math.max(0, delay),
    );
  };

  // Throttled entry point — called from scheduler/post-flush hooks. Honors
  // the leading-edge + trailing-edge contract: the first call in a window
  // paints immediately; subsequent calls coalesce into one trailing paint.
  const requestRender = (): void => {
    if (unmounted) return;
    if (renderThrottleMs === 0) {
      commitNow();
      return;
    }
    // Trailing timer already armed — the coalesced paint will catch this
    // state change. No further work to do.
    if (trailingTimer !== undefined) {
      hasPendingRender = true;
      return;
    }
    const elapsed = Date.now() - lastRenderAt;
    if (elapsed >= renderThrottleMs) {
      commitNow();
      return;
    }
    hasPendingRender = true;
    scheduleTrailingRender(renderThrottleMs - elapsed);
  };

  app.provide(STDOUT_CONTEXT_KEY, {
    stdout: writeStream,
    write: (data: string) => writeAboveFrame(writeStream, data),
  });
  app.provide(STDERR_CONTEXT_KEY, {
    stderr,
    write: (data: string) => writeAboveFrame(stderr, data),
  });

  const isScreenReaderEnabled = ref<boolean>(
    options.isScreenReaderEnabled ?? process.env["INK_SCREEN_READER"] === "true",
  );
  app.provide(ACCESSIBILITY_CONTEXT_KEY, { isScreenReaderEnabled });
  // `doRender` reads the ref but Vue's reactivity only triggers re-renders
  // via the component tree — toggling the ref from a host-side composable
  // (e.g. `useIsScreenReaderEnabled().value = true` outside a template)
  // wouldn't repaint on its own. This watcher closes that gap.
  watch(isScreenReaderEnabled, () => requestRender());

  const shouldPatchConsole = options.patchConsole ?? true;
  let unsubscribeConsole: (() => void) | undefined;
  if (shouldPatchConsole) {
    unsubscribeConsole = subscribeConsole({
      writeStdout: (data) => writeAboveFrame(writeStream, data),
      writeStderr: (data) => writeAboveFrame(stderr, data),
    });
  }

  const getTerminalWidth = (): number => {
    const cols = writeStream.columns;
    return typeof cols === "number" && cols > 0 ? cols : 80;
  };

  const hasOnRender = typeof options.onRender === "function";

  const doRender = (): void => {
    if (unmounted) return;
    const startedAt = hasOnRender ? performance.now() : 0;
    const { output: text, staticOutput } = renderTree(
      rootNode,
      getTerminalWidth(),
      isScreenReaderEnabled.value,
    );
    // Layout is committed at this point. Notify composables that depend on
    // Yoga-computed metrics (`useBoxMetrics`) so they update their refs in
    // time for Vue to coalesce any resulting re-render into the next paint.
    emitLayoutListeners(rootNode);

    // Snapshot cursor state for this paint — the consumer may mutate it
    // during the next render cycle but this paint's escapes must reflect
    // what was published before commit.
    const cursorPosition = currentCursorPosition;

    // The new static suffix: items present this paint that weren't in the
    // previous static snapshot. Static is strictly append-only because
    // terminal scrollback can't be erased — if the new output doesn't
    // start with the previous, we skip the emission (the survivors already
    // live in scrollback above; re-emitting them just produces duplicates).
    // The non-prefix case is a `<Static>` misuse: warn once via stderr.
    let newStatic = "";
    if (staticOutput !== lastStaticOutput) {
      if (staticOutput.startsWith(lastStaticOutput)) {
        newStatic = staticOutput.slice(lastStaticOutput.length);
      } else if (!staticDivergenceWarned) {
        staticDivergenceWarned = true;
        stderr.write(
          "vue-ink: <Static> items mutated non-append-only (item removed or reordered). Scrollback above the live frame cannot be erased; the divergent emission is skipped to avoid duplicates.\n",
        );
      }
      lastStaticOutput = staticOutput;
    }
    // Each emitted static chunk gets a trailing `\n` so the live frame
    // below it starts on a fresh line.
    const newStaticFrame = newStatic.length > 0 ? `${newStatic}\n` : "";

    if (debug) {
      if (newStaticFrame.length > 0) fullStaticOutput += newStaticFrame;
      // Track the latest live-frame text so `writeAboveFrame` can replay it
      // inline with a hook write (mirrors ink's `this.lastOutput` field used
      // by `writeToStdout`/`writeToStderr` in `ink.tsx:677,707`).
      lastOutput = text;
      writeStream.write(`${fullStaticOutput}${text}\n`);
      emitRenderMetrics(text, text.length === 0 ? 0 : text.split("\n").length, startedAt);
      drainCommitWaiters();
      return;
    }

    const cursorChanged = cursorPositionChanged(cursorPosition, lastCursorPosition);
    // Re-emit if anything visible to the user changed — frame text, static
    // suffix, or just the cursor position/visibility.
    if (text === lastOutput && newStaticFrame.length === 0 && !cursorChanged) {
      drainCommitWaiters();
      return;
    }

    const nextLines = text.length === 0 ? [] : text.split("\n");
    const lineCount = nextLines.length;

    if (useTTYFrame) {
      if (!cursorHidden) {
        writeStream.write(ansiEscapes.cursorHide);
        cursorHidden = true;
      }
      const cursorSuffix = buildCursorSuffix(lineCount, cursorPosition);
      // `returnPrefix` is non-empty only when the previous paint left the
      // cursor inside the frame; it hides the cursor and walks back down to
      // the bottom-left so the erase/diff math below is correct.
      const returnPrefix = buildReturnToBottomPrefix(
        lastCursorPosition !== undefined,
        lastLineCount,
        lastCursorPosition,
      );
      // Skip BSU/ESU when an outer `writeAboveFrame` already opened a
      // synchronized frame — nested pairs read as "close" on most terms.
      const openSync = syncFrameDepth === 0 ? BSU : "";
      const closeSync = syncFrameDepth === 0 ? ESU : "";

      if (
        incrementalRendering &&
        lastOutput.length > 0 &&
        text.length > 0 &&
        newStaticFrame.length === 0
      ) {
        writeStream.write(
          `${openSync}${returnPrefix}${buildIncrementalDiff(lastOutputLines, nextLines)}${cursorSuffix}${closeSync}`,
        );
      } else {
        const erase = lastLineCount > 0 ? ansiEscapes.eraseLines(lastLineCount + 1) : "";
        writeStream.write(
          `${openSync}${returnPrefix}${erase}${newStaticFrame}${text}\n${cursorSuffix}${closeSync}`,
        );
      }
    }
    // Non-interactive: buffer only — the final frame is flushed in unmount.

    lastOutput = text;
    lastLineCount = lineCount;
    lastOutputLines = nextLines;
    lastCursorPosition = cursorPosition ? { x: cursorPosition.x, y: cursorPosition.y } : undefined;
    emitRenderMetrics(text, lineCount, startedAt);
    drainCommitWaiters();
  };

  // Line-level diff: rewrite only the lines that changed, skip unchanged
  // lines with `cursorNextLine`, and erase any tail dropped by shrinking
  // output. The previous frame is assumed to end with `\n` (the cursor sits
  // on the line below row `prevVisible - 1`, i.e. at row `prevVisible`).
  // Mirrors ink's log-update.ts:257-303.
  //
  // Callers MUST guard against `prevVisible === 0`: this function emits no
  // cursor positioning when neither shrink nor grow applies — the call-site
  // check `lastOutput.length > 0` routes first paints through the
  // non-incremental branch instead.
  const buildIncrementalDiff = (previousLines: string[], nextLines: string[]): string => {
    const prevVisible = previousLines.length;
    const nextVisible = nextLines.length;
    const buf: string[] = [];

    // Step 1: position the cursor at the top of the previous frame.
    // On shrink, do the erase FIRST while the cursor is at the bottom —
    // `eraseLines` clears the current line and walks UP, so starting from
    // row `prevVisible` it erases the dropped tail + the trailing-newline
    // park slot in one shot, leaving the cursor at the top of the erased
    // block (row `nextVisible`). Then climb to row 0 with `cursorUp`.
    // Erasing AFTER the rewrite (the previous shape) wiped just-written
    // rows and left the real dropped tail on screen.
    if (nextVisible < prevVisible) {
      const dropped = prevVisible - nextVisible;
      // `+1` accounts for the line below the frame where the previous
      // trailing `\n` parked the cursor; otherwise a partial last row of
      // stale content can leak through.
      buf.push(ansiEscapes.eraseLines(dropped + 1));
      if (nextVisible > 0) buf.push(ansiEscapes.cursorUp(nextVisible));
    } else if (prevVisible > 0) {
      // Grow or same-size: cursor is at row `prevVisible`; climb to row 0.
      buf.push(ansiEscapes.cursorUp(prevVisible));
    }

    // Step 2: walk down rows 0..nextVisible-1, rewriting changed lines and
    // skipping unchanged ones with `cursorNextLine`. Rows past `prevVisible`
    // have `previousLines[i] === undefined` and will always differ from a
    // non-undefined string, so the same loop handles growth without a split.
    for (let i = 0; i < nextVisible; i += 1) {
      if (nextLines[i] === previousLines[i]) {
        buf.push(ansiEscapes.cursorNextLine);
        continue;
      }
      buf.push(ansiEscapes.cursorTo(0));
      buf.push(nextLines[i]!);
      buf.push(ansiEscapes.eraseEndLine);
      buf.push("\n");
    }

    return buf.join("");
  };

  const emitRenderMetrics = (text: string, lineCount: number, startedAt: number): void => {
    if (!hasOnRender) return;
    frameCounter += 1;
    const elapsed = performance.now() - startedAt;
    try {
      options.onRender!({
        frame: frameCounter,
        renderTime: elapsed,
        lineCount,
        output: text,
      });
    } catch (err) {
      const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
      stderr.write(`vue-ink onRender callback threw:\n${stack}\n`);
    }
  };

  rootNode.onRender = requestRender;
  rootNode.onComputeLayout = () => {
    // Guard: if a render-time throw has already torn the app down, the
    // post-flush layout job can still be in Vue's queue. The yogaNode is
    // freed in unmount(), so dereferencing it here would crash the process
    // before the user ever sees the rendered error message.
    if (!rootNode.yogaNode) return;
    rootNode.yogaNode.setWidth(getTerminalWidth());
  };

  app.config.errorHandler = (err, _instance, info) => {
    if (unmounted) return;
    // Erase the half-painted frame so the terminal isn't left in a weird
    // state, then print the error and tear down cleanly.
    eraseCurrentFrame();
    const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);
    stderr.write(`vue-ink render error (${info}):\n${stack}\n`);
    unmount();
  };

  const onResize = (): void => {
    // Width changed — previous line count can't be trusted for erase math
    // and the new layout may differ even from identical state. Reset the
    // cursor snapshot too so `buildReturnToBottom` doesn't try to walk
    // against coordinates that belong to the pre-resize layout.
    lastOutput = "";
    lastOutputLines = [];
    lastLineCount = 0;
    lastCursorPosition = undefined;
    renderImmediate();
  };

  const onSignal = (): void => {
    unmount();
  };

  const onBeforeExit = (): void => {
    unmount();
  };
  let beforeExitRegistered = false;

  unmount = (): void => {
    if (unmounted) return;
    // Flush any pending throttled render so the user's last state lands
    // before we tear down. Read `unmounted` after this — we still want the
    // trailing paint, but no new ones after.
    if (hasPendingRender) commitNow();
    else clearTrailingTimer();
    unmounted = true;
    // Restore native console first so any teardown-time log goes straight
    // to the real stream, not back through our (about-to-be-torn-down) frame
    // helper.
    if (unsubscribeConsole) {
      unsubscribeConsole();
      unsubscribeConsole = undefined;
    }
    // Non-interactive: flush the buffered final frame once before tearing down.
    if (!interactive && !debug && lastOutput.length > 0) {
      writeStream.write(`${lastOutput}\n`);
    }
    writeStream.off("resize", onResize);
    if (exitOnCtrlC) {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    }
    if (beforeExitRegistered) {
      process.off("beforeExit", onBeforeExit);
      beforeExitRegistered = false;
    }
    destroyFocusManager();
    animationScheduler.destroy();
    if (cancelKittyDetection) cancelKittyDetection();
    inputManager.destroy();
    app.unmount();
    if (kittyProtocolEnabled) {
      writeStream.write(disableKittyKeyboard());
      kittyProtocolEnabled = false;
    }
    // Leave the alt-screen buffer before restoring the cursor: the
    // alt-screen teardown is intentionally disposable (matches ink's
    // behavior — see brain/porting/from-react-ink.md), and cursorShow
    // has to land on the primary screen so the user's terminal isn't
    // left with a hidden caret.
    if (useAlternateScreen) {
      writeStream.write(ansiEscapes.exitAlternativeScreen);
    }
    if (useTTYFrame && cursorHidden) {
      writeStream.write(ansiEscapes.cursorShow);
      cursorHidden = false;
    }
    if (rootNode.yogaNode) {
      rootNode.yogaNode.freeRecursive();
      rootNode.yogaNode = undefined;
    }
    instances.delete(writeStream);
    // `instance` is forward-declared and assigned at the end of this
    // closure. If the errorHandler fires during mount, `unmount` may run
    // before that assignment — `Set#delete(undefined)` is a harmless no-op,
    // but `activeInstances.delete` is typed as `delete(Instance)` so guard.
    if (instance) activeInstances.delete(instance);
    drainCommitWaiters();
    exitResolve(exitResult);
  };

  // Alt-screen switch happens before any frame paints so the user's primary
  // screen content stays clean. Emitted before kitty so the test contract
  // "enter-alt-screen is the very first write" holds even when both are on.
  // Hide the cursor on entry (mirrors ink at `ink.tsx:969-975`) — the
  // alt-screen has its own cursor state, and without an explicit hide the
  // user briefly sees the caret blinking on a blank buffer before the
  // first paint lands.
  if (useAlternateScreen) {
    writeStream.write(ansiEscapes.enterAlternativeScreen);
    writeStream.write(ansiEscapes.cursorHide);
    cursorHidden = true;
  }

  // Push kitty keyboard mode (if requested) before app.mount so that any
  // composable attaching a stdin listener during mount sees the enhanced
  // format from the first event. Terminals that don't support kitty
  // silently ignore the escape.
  let cancelKittyDetection: (() => void) | undefined;
  const kittyOptions = options.kittyKeyboard;
  if (kittyOptions && kittyOptions.mode !== "disabled") {
    const flags: KittyFlagName[] = kittyOptions.flags ?? ["disambiguateEscapeCodes"];
    const mode = kittyOptions.mode ?? "auto";
    const enableProtocol = (): void => {
      writeStream.write(enableKittyKeyboard(flags));
      kittyProtocolEnabled = true;
    };
    // Both `enabled` and `auto` require real TTYs on both stdin and stdout
    // — terminals only respond to CSI escapes on a real tty, and writing
    // the query/push to a pipe/file pollutes captured output. The `auto`
    // path additionally needs stdin to deliver the response. Mirrors ink at
    // `repos/ink/src/ink.tsx:1120-1126`.
    const stdinIsTTY = Boolean((stdin as NodeJS.ReadStream).isTTY);
    if (mode === "enabled") {
      if (stdinIsTTY && isTTY) {
        enableProtocol();
      }
    } else if (interactive && isTTY && stdinIsTTY) {
      // `auto`: query the terminal and only push the protocol if it
      // responds within 200ms. Listen before writing the query so a fast
      // (synchronous) response isn't dropped.
      const responseBuffer: number[] = [];
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = (): void => {
        cancelKittyDetection = undefined;
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        stdin.off("data", onResponseData);
        // Hand user-typed bytes that landed during detection back to the
        // input pipeline. `bufferInput` queues them until `useInput`/etc.
        // triggers `startListening()`, which is safer than `stdin.unshift`
        // — the latter silently drops the bytes if no `data` listener is
        // attached when it fires (e.g. a slow `async setup()` boundary,
        // or no `useInput` mounted at all). See brain/renderer/kitty-detection.md.
        const remaining = stripKittyQueryResponses(responseBuffer);
        if (remaining.length > 0) {
          inputManager.bufferInput(Uint8Array.from(remaining));
        }
      };
      const onResponseData = (chunk: Buffer | string): void => {
        const buf = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
        for (let i = 0; i < buf.length; i += 1) responseBuffer.push(buf[i]!);
        if (hasCompleteKittyQueryResponse(responseBuffer)) {
          cleanup();
          if (!unmounted) enableProtocol();
        }
      };
      stdin.on("data", onResponseData);
      timer = setTimeout(cleanup, 200);
      cancelKittyDetection = cleanup;
      writeStream.write("\x1b[?u");
    }
  }

  // Conditionally connect Vue DevTools — mirrors react-ink's
  // `repos/ink/src/reconciler.ts:32-44`. `@vue/devtools` is an optional peer
  // dep so the resolve probe gates the side-effect import. `render()` is sync
  // so we fire-and-forget; Vue's devtools buffer (`repos/core/.../devtools.ts`)
  // replays APP_INIT once the hook connects.
  if (process.env["DEV"] === "true") {
    let isDevtoolsInstalled = false;
    try {
      import.meta.resolve("@vue/devtools");
      isDevtoolsInstalled = true;
    } catch {}
    if (isDevtoolsInstalled) {
      void import("./devtools.ts");
    }
  }

  app.mount(rootNode);

  // Resize handling is independent of painting mode: composables like
  // `useBoxMetrics` rely on the renderer running `renderTree` (and firing
  // layout listeners) on every column change. We always attach the
  // listener — non-TTY streams (CI, testing-library's fake stdout) simply
  // don't emit `resize` unless a test fires it manually.
  writeStream.on("resize", onResize);

  if (exitOnCtrlC) {
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  }

  // Mount-time mutations queue a post-flush render which Vue drains inside
  // `app.mount`; in that case `hasCommitted` is already set and we skip the
  // explicit paint to avoid a duplicate identical frame. Components that
  // render to a tree with no host mutations (rare) won't have triggered
  // `scheduleRender`, so the fallback paint here guarantees the first frame
  // lands before `render()` returns.
  if (!hasCommitted) renderImmediate();

  const rerender = (newComponent: Component): void => {
    // Component identity is changing — any prior `<Static>` scrollback
    // state is no longer a valid diff anchor for the new tree. Resetting
    // both vars matches ink's `handleStaticChange` (`ink.tsx:521-524`),
    // which fires when Static's identity flips. Without this, a fresh
    // Static in the new tree would be deduped against stale items.
    lastStaticOutput = "";
    fullStaticOutput = "";
    currentComponent.value = newComponent;
  };

  const waitUntilRenderFlush = async (): Promise<void> => {
    // Let Vue's scheduler drain so any pending state changes commit and
    // schedule a paint (immediate or trailing).
    await vueNextTick();
    // Force-flush a pending trailing-edge paint synchronously. Mirrors
    // ink's `settleThrottle(throttledOnRender).flush()`
    // (`repos/ink/src/ink.tsx:919-920`): flushing now keeps the test
    // pipeline off the throttle delay and avoids racing the timer
    // against an unmount or another wait.
    if (!unmounted && (hasPendingRender || trailingTimer !== undefined)) {
      commitNow();
    }
    // Match ink (`repos/ink/src/ink.tsx:922-928`): await an empty stream
    // write so the writable's drain callback fires before we resolve. On
    // slow / backpressured streams an earlier microtask yield can resolve
    // while bytes are still queued in the kernel buffer. Guard against
    // torn-down or non-writable streams (process exit, closed pipe,
    // test-stream without `write`). Skip the stderr leg — vue-ink writes
    // to stderr only via `useStderr().write` and patchConsole, both of
    // which use the same throttle + commit pipeline as stdout, so the
    // stdout barrier subsumes them.
    const stream = writeStream as NodeJS.WriteStream & {
      writable?: boolean;
      writableEnded?: boolean;
      destroyed?: boolean;
      _writableState?: unknown;
      writableLength?: number;
    };
    const canWrite =
      !unmounted &&
      typeof stream.write === "function" &&
      !stream.destroyed &&
      !stream.writableEnded &&
      (stream.writable ?? true);
    const hasWritableState =
      stream._writableState !== undefined || stream.writableLength !== undefined;
    if (canWrite && hasWritableState) {
      await new Promise<void>((resolve) => {
        stream.write("", () => resolve());
      });
    }
  };

  instance = {
    rerender,
    unmount,
    waitUntilExit: () => {
      if (!beforeExitRegistered && !unmounted) {
        process.once("beforeExit", onBeforeExit);
        beforeExitRegistered = true;
      }
      return exitPromise;
    },
    waitUntilRenderFlush,
    clear: eraseCurrentFrame,
    cleanup: () => unmount(),
  };
  instances.set(writeStream, instance);
  activeInstances.add(instance);
  return instance;
};

export default render;
