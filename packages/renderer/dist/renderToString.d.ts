import { type Component } from 'vue';
export type RenderToStringOptions = {
    /**
     * Width of the virtual terminal in columns. Default: `80`.
     */
    columns?: number;
    /**
     * Render the screen-reader output path instead of the visual layout.
     * Mirrors the `isScreenReaderEnabled` option on `render()`.
     */
    isScreenReaderEnabled?: boolean;
};
/**
 * Render a Vue component to a string synchronously. Unlike {@link render},
 * this function does not write to stdout, does not attach terminal event
 * listeners, and returns the rendered output (with ANSI styling) as a string.
 *
 * Useful for generating documentation, writing output to files, snapshot
 * testing, or any scenario where you need the rendered output as a string
 * without starting a persistent terminal application.
 *
 * **Notes:**
 *
 * - Terminal-specific composables (`useInput`, `usePaste`, `useStdin`,
 *   `useStdout`, `useStderr`, `useApp`, `useFocus`, `useFocusManager`)
 *   resolve to no-op contexts. They will not throw, but they will not
 *   function as in a live terminal — input handlers never fire and writes
 *   are discarded.
 * - `onMounted` / `onBeforeUnmount` callbacks fire during the render +
 *   teardown pass, but state updates they trigger after layout commits
 *   will not be reflected in the returned output (which captures the
 *   first synchronous frame).
 * - Layout-effect-equivalents (post-commit work registered via
 *   `addLayoutListener`) **do** run, since layout has to complete before
 *   the output is serialized.
 * - The `<Static>` component is supported — its output is prepended to the
 *   dynamic output.
 */
export declare const renderToString: (component: Component, options?: RenderToStringOptions) => string;
//# sourceMappingURL=renderToString.d.ts.map