import { inject, provide } from 'vue';
// Set by <Text>, <Newline>, <Transform>; checked by the same components so a
// nested ink-text is downgraded to ink-virtual-text (yoga can't measure
// children of a measure-function node).
export const INSIDE_TEXT_KEY = Symbol('vue-ink:inside-text');
// Every component that emits ink-text must call this so the nested-text
// invariant holds — see brain/renderer/nested-text-must-be-virtual.md.
export const useTextHost = () => {
    const isNested = inject(INSIDE_TEXT_KEY, false);
    provide(INSIDE_TEXT_KEY, true);
    return isNested ? 'ink-virtual-text' : 'ink-text';
};
//# sourceMappingURL=text-context.js.map