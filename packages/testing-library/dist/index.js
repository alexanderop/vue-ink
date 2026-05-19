import { EventEmitter } from 'node:events';
import { render as vueInkRender } from '@vue-ink/renderer';
// Strip a single trailing newline added by the renderer's debug-mode write
// (`${text}\n`) so `lastFrame()` returns the rendered content without
// transport padding, matching ink-testing-library's documented behaviour.
const trimFrame = (raw) => raw.endsWith('\n') ? raw.slice(0, -1) : raw;
export class Stdout extends EventEmitter {
    frames = [];
    #lastFrame;
    columns = 100;
    rows = 24;
    isTTY = false;
    write = (frame) => {
        const trimmed = trimFrame(frame);
        this.frames.push(trimmed);
        this.#lastFrame = trimmed;
    };
    lastFrame = () => this.#lastFrame;
}
export class Stderr extends EventEmitter {
    frames = [];
    #lastFrame;
    write = (frame) => {
        const trimmed = trimFrame(frame);
        this.frames.push(trimmed);
        this.#lastFrame = trimmed;
    };
    lastFrame = () => this.#lastFrame;
}
export class Stdin extends EventEmitter {
    isTTY;
    #data = null;
    constructor(options = {}) {
        super();
        this.isTTY = options.isTTY ?? true;
        // EventEmitter caps at 10 by default — vue-ink composables can attach
        // several listeners (input, paste, focus) per render() call.
        this.setMaxListeners(0);
    }
    write = (data) => {
        this.#data = data;
        this.emit('readable');
        this.emit('data', data);
    };
    setEncoding() { }
    setRawMode() { }
    resume() { }
    pause() { }
    ref() { }
    unref() { }
    read = () => {
        const data = this.#data;
        this.#data = null;
        return data;
    };
}
const activeInstances = new Set();
export const render = (component, options = {}) => {
    const stdout = new Stdout();
    const stderr = new Stderr();
    const stdin = new Stdin();
    const instance = vueInkRender(component, {
        stdout: stdout,
        stderr: stderr,
        stdin: stdin,
        // `debug: true` makes the renderer emit each frame as a full string
        // instead of ANSI cursor diffs — required for frame-by-frame
        // assertions. `maxFps: Infinity` disables throttling so a single
        // commit produces a single frame synchronously.
        debug: true,
        exitOnCtrlC: false,
        patchConsole: false,
        maxFps: Number.POSITIVE_INFINITY,
        isScreenReaderEnabled: options.isScreenReaderEnabled,
    });
    activeInstances.add(instance);
    let unmounted = false;
    const unmount = () => {
        if (unmounted)
            return;
        unmounted = true;
        instance.unmount();
        activeInstances.delete(instance);
    };
    return {
        stdout,
        stderr,
        stdin,
        frames: stdout.frames,
        lastFrame: stdout.lastFrame,
        rerender: instance.rerender,
        unmount,
        cleanup: unmount,
        waitUntilFlush: () => instance.waitUntilRenderFlush(),
    };
};
export const cleanup = () => {
    for (const instance of activeInstances)
        instance.unmount();
    activeInstances.clear();
};
//# sourceMappingURL=index.js.map