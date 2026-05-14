import type { InjectionKey } from 'vue';
import type { EventEmitter } from 'node:events';

export type AppContext = {
	exit: (error?: Error) => void;
};

export type StdinContext = {
	stdin: NodeJS.ReadStream;
	isRawModeSupported: boolean;
	setRawMode: (enable: boolean) => void;
	setBracketedPasteMode: (enable: boolean) => void;
	emitter: EventEmitter;
};

export const APP_CONTEXT_KEY: InjectionKey<AppContext> = Symbol('vue-ink.app');
export const STDIN_CONTEXT_KEY: InjectionKey<StdinContext> = Symbol('vue-ink.stdin');
