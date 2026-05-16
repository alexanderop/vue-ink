import type { Ref } from 'vue';
import { type FocusContext } from '../../context.ts';
export interface UseFocusManagerReturn {
    activeId: Ref<string | undefined>;
    focus: FocusContext['focus'];
    focusNext: FocusContext['focusNext'];
    focusPrevious: FocusContext['focusPrevious'];
    enableFocus: FocusContext['enableFocus'];
    disableFocus: FocusContext['disableFocus'];
}
/**
 * Programmatic access to the focus manager — switch focus by id, cycle
 * forward/backward, and toggle the manager on or off entirely.
 *
 * Sibling to {@link useFocus}, which registers an individual focusable.
 */
export declare const useFocusManager: () => UseFocusManagerReturn;
//# sourceMappingURL=index.d.ts.map