import { type Component } from 'vue';
import { type KittyKeyboardOptions } from './kitty-keyboard.ts';
export type RenderOptions = {
    stdout?: NodeJS.WriteStream;
    stdin?: NodeJS.ReadStream;
    stderr?: NodeJS.WriteStream;
    debug?: boolean;
    exitOnCtrlC?: boolean;
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
export type RenderMetrics = {
    frame: number;
    durationMs: number;
    lineCount: number;
    output: string;
};
export type Instance = {
    rerender: (component: Component) => void;
    unmount: () => void;
    /**
     * Resolves when the app unmounts. If `useApp().exit(value)` was called the
     * promise resolves with that value; `useApp().exit(error)` (an `Error`)
     * rejects it. Plain `unmount()` resolves with `undefined`.
     */
    waitUntilExit: () => Promise<unknown>;
    waitUntilRenderFlush: () => Promise<void>;
    clear: () => void;
};
export declare const _flushActiveInstances: () => Promise<void>;
declare const render: (component: Component, options?: RenderOptions) => Instance;
export default render;
//# sourceMappingURL=render.d.ts.map