import { ref } from 'vue';
export const createFocusManager = (emitter) => {
    const activeId = ref(undefined);
    const isFocusEnabled = ref(true);
    const focusables = [];
    const findIndex = (id) => id === undefined ? -1 : focusables.findIndex((entry) => entry.id === id);
    const firstActiveId = () => focusables.find((entry) => entry.isActive)?.id;
    const lastActiveId = () => {
        for (let index = focusables.length - 1; index >= 0; index -= 1) {
            if (focusables[index].isActive)
                return focusables[index].id;
        }
        return undefined;
    };
    const nextActiveAfter = (currentId) => {
        const start = findIndex(currentId);
        for (let index = start + 1; index < focusables.length; index += 1) {
            if (focusables[index].isActive)
                return focusables[index].id;
        }
        return undefined;
    };
    const previousActiveBefore = (currentId) => {
        const start = findIndex(currentId);
        if (start < 0)
            return undefined;
        for (let index = start - 1; index >= 0; index -= 1) {
            if (focusables[index].isActive)
                return focusables[index].id;
        }
        return undefined;
    };
    const focusNext = () => {
        const next = nextActiveAfter(activeId.value);
        activeId.value = next ?? firstActiveId();
    };
    const focusPrevious = () => {
        const previous = previousActiveBefore(activeId.value);
        activeId.value = previous ?? lastActiveId();
    };
    const add = (id, { autoFocus }) => {
        focusables.push({ id, isActive: true });
        if (autoFocus && activeId.value === undefined) {
            activeId.value = id;
        }
    };
    const remove = (id) => {
        const index = findIndex(id);
        if (index >= 0)
            focusables.splice(index, 1);
        if (activeId.value === id)
            activeId.value = undefined;
    };
    const activate = (id) => {
        const entry = focusables.find((item) => item.id === id);
        if (entry)
            entry.isActive = true;
    };
    const deactivate = (id) => {
        const entry = focusables.find((item) => item.id === id);
        if (entry)
            entry.isActive = false;
        if (activeId.value === id)
            activeId.value = undefined;
    };
    const focus = (id) => {
        const exists = focusables.some((entry) => entry.id === id);
        if (exists)
            activeId.value = id;
    };
    const enableFocus = () => {
        isFocusEnabled.value = true;
    };
    const disableFocus = () => {
        isFocusEnabled.value = false;
        activeId.value = undefined;
    };
    const onInput = (_input, key) => {
        if (!isFocusEnabled.value)
            return;
        if (!key.tab)
            return;
        if (key.shift)
            focusPrevious();
        else
            focusNext();
    };
    emitter.on('input', onInput);
    return {
        activeId,
        isFocusEnabled,
        add,
        remove,
        activate,
        deactivate,
        focus,
        focusNext,
        focusPrevious,
        enableFocus,
        disableFocus,
        destroy: () => {
            emitter.off('input', onInput);
        },
    };
};
//# sourceMappingURL=focus-context.js.map