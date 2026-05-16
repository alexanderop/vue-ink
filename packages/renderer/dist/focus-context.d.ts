import type { EventEmitter } from 'node:events';
import type { FocusContext } from './context.ts';
export type FocusManager = FocusContext & {
    destroy: () => void;
};
export declare const createFocusManager: (emitter: EventEmitter) => FocusManager;
//# sourceMappingURL=focus-context.d.ts.map