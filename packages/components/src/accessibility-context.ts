import type { Ref } from "vue";
import { createContext } from "./helpers/create-context.ts";

/**
 * Shape of the accessibility context the renderer provides. Mirrored here so
 * `<Text>`/`<Box>` can inject it without depending on `@vue-ink/renderer`.
 * `global: true` makes `createContext` seed the underlying symbol via
 * `Symbol.for('vue-ink.accessibility')`, so both packages share identity
 * through Node's global symbol registry.
 */
export type AccessibilityContext = {
  isScreenReaderEnabled: Ref<boolean>;
};

export const [useAccessibilityContext, provideAccessibilityContext] =
  createContext<AccessibilityContext>("vue-ink.accessibility", { global: true });
