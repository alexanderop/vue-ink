import type { InjectionKey, Ref } from 'vue';
import type { EventEmitter } from 'node:events';

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

export const APP_CONTEXT_KEY: InjectionKey<AppContext> = Symbol('vue-ink.app');
export const STDIN_CONTEXT_KEY: InjectionKey<StdinContext> = Symbol('vue-ink.stdin');
export const STDOUT_CONTEXT_KEY: InjectionKey<StdoutContext> = Symbol('vue-ink.stdout');
export const STDERR_CONTEXT_KEY: InjectionKey<StderrContext> = Symbol('vue-ink.stderr');
export const ACCESSIBILITY_CONTEXT_KEY: InjectionKey<AccessibilityContext> =
	Symbol('vue-ink.accessibility');
