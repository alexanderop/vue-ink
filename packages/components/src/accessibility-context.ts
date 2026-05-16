import type { InjectionKey, Ref } from 'vue';

/**
 * Shape of the accessibility context the renderer provides. Mirrored here so
 * `<Text>`/`<Box>` can inject it without depending on `@vue-ink/renderer`.
 * The key uses `Symbol.for('vue-ink.accessibility')` so both packages share
 * the same identity via Node's global symbol registry.
 */
export type AccessibilityContext = {
	isScreenReaderEnabled: Ref<boolean>;
};

export const ACCESSIBILITY_CONTEXT_KEY: InjectionKey<AccessibilityContext> =
	Symbol.for('vue-ink.accessibility') as InjectionKey<AccessibilityContext>;
