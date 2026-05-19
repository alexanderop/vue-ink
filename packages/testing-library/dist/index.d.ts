import { EventEmitter } from 'node:events';
import type { Component } from 'vue';
export declare class Stdout extends EventEmitter {
    #private;
    readonly frames: string[];
    columns: number;
    rows: number;
    isTTY: boolean;
    write: (frame: string) => void;
    lastFrame: () => string | undefined;
}
export declare class Stderr extends EventEmitter {
    #private;
    readonly frames: string[];
    write: (frame: string) => void;
    lastFrame: () => string | undefined;
}
export type StdinOptions = {
    isTTY?: boolean;
};
export declare class Stdin extends EventEmitter {
    #private;
    isTTY: boolean;
    constructor(options?: StdinOptions);
    write: (data: string) => void;
    setEncoding(): void;
    setRawMode(): void;
    resume(): void;
    pause(): void;
    ref(): void;
    unref(): void;
    read: () => string | null;
}
export type RenderResult = {
    stdout: Stdout;
    stderr: Stderr;
    stdin: Stdin;
    frames: string[];
    lastFrame: () => string | undefined;
    rerender: (component: Component) => void;
    unmount: () => void;
    cleanup: () => void;
    /**
     * Vue commits state changes on `nextTick`. Await this after mutating a
     * `ref` or triggering an event to ensure the resulting frame has landed
     * in `frames` / `lastFrame()` before asserting.
     */
    waitUntilFlush: () => Promise<void>;
};
export type RenderOptions = {
    /**
     * Render the screen-reader output path instead of the visual layout.
     * Mirrors ink's `renderToString(node, { isScreenReaderEnabled: true })`.
     */
    isScreenReaderEnabled?: boolean;
};
export declare const render: (component: Component, options?: RenderOptions) => RenderResult;
export declare const cleanup: () => void;
//# sourceMappingURL=index.d.ts.map