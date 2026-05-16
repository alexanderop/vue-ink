import { EventEmitter } from 'node:events';
import parseKeypress, { nonAlphanumericKeys } from "./parse-keypress.js";
import { createInputParser } from "./input-parser.js";
const toKey = (parsed) => ({
    upArrow: parsed.name === 'up',
    downArrow: parsed.name === 'down',
    leftArrow: parsed.name === 'left',
    rightArrow: parsed.name === 'right',
    pageUp: parsed.name === 'pageup',
    pageDown: parsed.name === 'pagedown',
    home: parsed.name === 'home',
    end: parsed.name === 'end',
    return: parsed.name === 'return',
    escape: parsed.name === 'escape',
    tab: parsed.name === 'tab',
    backspace: parsed.name === 'backspace',
    delete: parsed.name === 'delete',
    ctrl: parsed.ctrl,
    shift: parsed.shift,
    meta: parsed.meta,
    super: parsed.super ?? false,
    hyper: parsed.hyper ?? false,
    capsLock: parsed.capsLock ?? false,
    numLock: parsed.numLock ?? false,
    eventType: parsed.eventType,
});
// Ink uses ~100ms — long enough that fast typing of Esc-prefixed sequences
// (Alt+letter) doesn't get split, short enough that a bare Esc keypress is
// reported promptly.
const ESCAPE_TIMEOUT_MS = 100;
const computeInput = (parsed) => {
    let input;
    if (parsed.isKittyProtocol) {
        if (parsed.isPrintable) {
            input = parsed.text ?? parsed.name;
        }
        else if (parsed.ctrl && parsed.name.length === 1) {
            input = parsed.name;
        }
        else {
            input = '';
        }
    }
    else if (parsed.ctrl) {
        input = parsed.name ?? '';
    }
    else {
        input = parsed.sequence;
    }
    if (!parsed.isKittyProtocol && nonAlphanumericKeys.has(parsed.name)) {
        input = '';
    }
    // Strip escape prefix from incomplete sequences flushed by the timer.
    if (input.startsWith('\x1b'))
        input = input.slice(1);
    return input;
};
export const createInputManager = ({ stdin, stdout, exitOnCtrlC, onCtrlC, }) => {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    const isRawModeSupported = Boolean(stdin.isTTY) && typeof stdin.setRawMode === 'function';
    const parser = createInputParser();
    let rawModeUsers = 0;
    let pasteModeUsers = 0;
    let listening = false;
    let pendingEscapeTimer;
    const emitKeypress = (sequence) => {
        const parsed = parseKeypress(sequence);
        const key = toKey(parsed);
        const input = computeInput(parsed);
        // Promote single-uppercase-letter input to shift so consumers can rely
        // on key.shift for case-insensitive matching.
        if (input.length === 1 && /[A-Z]/.test(input))
            key.shift = true;
        if (exitOnCtrlC && key.ctrl && input === 'c') {
            onCtrlC();
            return;
        }
        emitter.emit('input', input, key);
    };
    const flushPendingEscape = () => {
        const pending = parser.flushPendingEscape();
        if (pending !== undefined)
            emitKeypress(pending);
    };
    const clearPendingTimer = () => {
        if (pendingEscapeTimer) {
            clearTimeout(pendingEscapeTimer);
            pendingEscapeTimer = undefined;
        }
    };
    const schedulePendingFlush = () => {
        clearPendingTimer();
        if (parser.hasPendingEscape()) {
            pendingEscapeTimer = setTimeout(() => {
                pendingEscapeTimer = undefined;
                flushPendingEscape();
            }, ESCAPE_TIMEOUT_MS);
        }
    };
    const onData = (chunk) => {
        const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        const events = parser.push(text);
        for (const event of events) {
            if (typeof event === 'string') {
                emitKeypress(event);
            }
            else {
                emitter.emit('paste', event.paste);
            }
        }
        schedulePendingFlush();
    };
    const startListening = () => {
        /* v8 ignore next */
        if (listening)
            return;
        stdin.on('data', onData);
        listening = true;
    };
    const stopListening = () => {
        if (!listening)
            return;
        stdin.off('data', onData);
        clearPendingTimer();
        parser.reset();
        listening = false;
    };
    const setRawMode = (enable) => {
        if (!isRawModeSupported) {
            throw new Error('Raw mode is not supported on the current stdin. See https://github.com/vadimdemedes/ink#israwmodesupported');
        }
        if (enable) {
            rawModeUsers += 1;
            if (rawModeUsers === 1) {
                stdin.setRawMode(true);
                startListening();
                if (typeof stdin.resume === 'function')
                    stdin.resume();
            }
            return;
        }
        rawModeUsers = Math.max(0, rawModeUsers - 1);
        if (rawModeUsers === 0) {
            stdin.setRawMode(false);
            stopListening();
            if (typeof stdin.pause === 'function')
                stdin.pause();
        }
    };
    const setBracketedPasteMode = (enable) => {
        if (enable) {
            pasteModeUsers += 1;
            if (pasteModeUsers === 1) {
                stdout.write('\x1b[?2004h');
            }
            return;
        }
        pasteModeUsers = Math.max(0, pasteModeUsers - 1);
        if (pasteModeUsers === 0) {
            stdout.write('\x1b[?2004l');
        }
    };
    const destroy = () => {
        clearPendingTimer();
        if (rawModeUsers > 0 && isRawModeSupported) {
            stdin.setRawMode(false);
        }
        if (pasteModeUsers > 0) {
            stdout.write('\x1b[?2004l');
        }
        rawModeUsers = 0;
        pasteModeUsers = 0;
        stopListening();
        emitter.removeAllListeners();
    };
    return {
        emitter,
        isRawModeSupported,
        setRawMode,
        setBracketedPasteMode,
        destroy,
    };
};
//# sourceMappingURL=input.js.map