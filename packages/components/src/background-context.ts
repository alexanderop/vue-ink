import { type InjectionKey } from 'vue';

export const BACKGROUND_COLOR_INJECT_KEY: InjectionKey<() => string | undefined> = Symbol(
	'vue-ink:background-color',
);
