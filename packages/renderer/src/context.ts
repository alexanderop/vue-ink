import type { InjectionKey, Ref } from 'vue';
import type { EventEmitter } from 'node:events';

export type CursorPosition = {
	x: number;
	y: number;
};

export type CursorContext = {
	setCursorPosition: (position: CursorPosition | undefined) => void;
};

export type AppContext = {
	exit: (error?: Error) => void;
	waitUntilRenderFlush: () => Promise<void>;
};

export type StdinContext = {
	stdin: NodeJS.ReadStream;
	isRawModeSupported: boolean;
	setRawMode: (enable: boolean) => void;
	setBracketedPasteMode: (enable: boolean) => void;
	emitter: EventEmitter;
};

export type StdoutContext = {
	stdout: NodeJS.WriteStream;
	write: (data: string) => void;
};

export type StderrContext = {
	stderr: NodeJS.WriteStream;
	write: (data: string) => void;
};

export type AccessibilityContext = {
	isScreenReaderEnabled: Ref<boolean>;
};

export type FocusContext = {
	activeId: Ref<string | undefined>;
	isFocusEnabled: Ref<boolean>;
	add: (id: string, options: { autoFocus: boolean }) => void;
	remove: (id: string) => void;
	activate: (id: string) => void;
	deactivate: (id: string) => void;
	focus: (id: string) => void;
	focusNext: () => void;
	focusPrevious: () => void;
	enableFocus: () => void;
	disableFocus: () => void;
};

export type AnimationTickCallback = (currentTime: number) => void;

export type AnimationSubscription = {
	readonly startTime: number;
	readonly unsubscribe: () => void;
};

export type AnimationContext = {
	/**
	 * Window (in ms) in which the renderer coalesces paints. `useAnimation`
	 * uses this to skip ticks that would land inside the current throttle
	 * window — the next allowed render still gets the latest values.
	 */
	readonly renderThrottleMs: number;
	/**
	 * Subscribe to the shared animation timer. The callback fires roughly
	 * every `interval` ms with the current `performance.now()` reading.
	 * Returns the scheduler's `startTime` so consumers derive frame counts
	 * and elapsed time from the exact origin the scheduler used.
	 */
	subscribe: (callback: AnimationTickCallback, interval: number) => AnimationSubscription;
};

export const APP_CONTEXT_KEY: InjectionKey<AppContext> = Symbol('vue-ink.app');
export const STDIN_CONTEXT_KEY: InjectionKey<StdinContext> = Symbol('vue-ink.stdin');
export const STDOUT_CONTEXT_KEY: InjectionKey<StdoutContext> = Symbol('vue-ink.stdout');
export const STDERR_CONTEXT_KEY: InjectionKey<StderrContext> = Symbol('vue-ink.stderr');
// Shared with `@vue-ink/components` via the global Symbol registry so Box and
// Text can inject the SR flag without forcing components to depend on the
// renderer (and without moving the key into core, which is intentionally
// Vue-free). Both sides call `Symbol.for(SR_KEY)` and get the same identity.
export const ACCESSIBILITY_CONTEXT_KEY: InjectionKey<AccessibilityContext> =
	Symbol.for('vue-ink.accessibility') as InjectionKey<AccessibilityContext>;
export const FOCUS_CONTEXT_KEY: InjectionKey<FocusContext> = Symbol('vue-ink.focus');
export const ANIMATION_CONTEXT_KEY: InjectionKey<AnimationContext> =
	Symbol('vue-ink.animation');
export const CURSOR_CONTEXT_KEY: InjectionKey<CursorContext> =
	Symbol('vue-ink.cursor');
