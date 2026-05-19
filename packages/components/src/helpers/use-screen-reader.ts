import { computed, type ComputedRef } from "vue";
import { useAccessibilityContext } from "../accessibility-context.ts";

/**
 * Reactive view of the renderer's screen-reader flag. Returns a
 * `ComputedRef<boolean>` that resolves to `false` when no accessibility
 * context has been provided (i.e. the component is rendered outside the
 * vue-ink renderer — currently only happens in unit tests).
 */
export const useScreenReader = (): ComputedRef<boolean> => {
  const ctx = useAccessibilityContext();
  return computed(() => ctx?.isScreenReaderEnabled.value ?? false);
};
