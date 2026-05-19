import { createContext } from "./helpers/create-context.ts";

// Set by <Text>, <Newline>, <Transform>; checked by the same components so a
// nested ink-text is downgraded to ink-virtual-text (yoga can't measure
// children of a measure-function node).
const [useInsideText, provideInsideText] = createContext<true>("vue-ink:inside-text");

// Every component that emits ink-text must call this so the nested-text
// invariant holds — see brain/renderer/nested-text-must-be-virtual.md.
export const useTextHost = (): "ink-text" | "ink-virtual-text" => {
  const isNested = useInsideText() ?? false;
  provideInsideText(true);
  return isNested ? "ink-virtual-text" : "ink-text";
};
