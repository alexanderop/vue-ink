import { createContext } from "./helpers/create-context.ts";

/**
 * Nearest ancestor `<Box backgroundColor>` value, exposed as a getter so
 * descendant `<Text>` nodes inherit through Boxes that don't set their own
 * background (mirrors ink's inheritance rule). Returns `undefined` outside
 * any background-providing scope.
 */
export const [useBackgroundColor, provideBackgroundColor] = createContext<() => string | undefined>(
  "vue-ink:background-color",
);
