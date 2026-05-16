import { EventEmitter } from 'node:events';
export type Key = {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    pageUp: boolean;
    pageDown: boolean;
    home: boolean;
    end: boolean;
    return: boolean;
    escape: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
    ctrl: boolean;
    shift: boolean;
    meta: boolean;
    super: boolean;
    hyper: boolean;
    capsLock: boolean;
    numLock: boolean;
    eventType?: 'press' | 'repeat' | 'release';
};
export type InputManager = {
    emitter: EventEmitter;
    isRawModeSupported: boolean;
    setRawMode: (enable: boolean) => void;
    setBracketedPasteMode: (enable: boolean) => void;
    destroy: () => void;
};
export type InputManagerOptions = {
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
    exitOnCtrlC: boolean;
    onCtrlC: () => void;
};
export declare const createInputManager: ({ stdin, stdout, exitOnCtrlC, onCtrlC, }: InputManagerOptions) => InputManager;
//# sourceMappingURL=input.d.ts.map