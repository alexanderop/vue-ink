import { ref, type Ref } from 'vue';
import type { EventEmitter } from 'node:events';
import type { Key } from './input.ts';
import type { FocusContext } from './context.ts';

type Focusable = { id: string; isActive: boolean };

export type FocusManager = FocusContext & {
	destroy: () => void;
};

export const createFocusManager = (emitter: EventEmitter): FocusManager => {
	const activeId: Ref<string | undefined> = ref<string | undefined>(undefined);
	const isFocusEnabled = ref<boolean>(true);
	const focusables: Focusable[] = [];

	const findIndex = (id: string | undefined): number =>
		id === undefined ? -1 : focusables.findIndex((entry) => entry.id === id);

	const firstActiveId = (): string | undefined =>
		focusables.find((entry) => entry.isActive)?.id;

	const lastActiveId = (): string | undefined => {
		for (let index = focusables.length - 1; index >= 0; index -= 1) {
			if (focusables[index]!.isActive) return focusables[index]!.id;
		}
		return undefined;
	};

	const nextActiveAfter = (currentId: string | undefined): string | undefined => {
		const start = findIndex(currentId);
		for (let index = start + 1; index < focusables.length; index += 1) {
			if (focusables[index]!.isActive) return focusables[index]!.id;
		}
		return undefined;
	};

	const previousActiveBefore = (currentId: string | undefined): string | undefined => {
		const start = findIndex(currentId);
		if (start < 0) return undefined;
		for (let index = start - 1; index >= 0; index -= 1) {
			if (focusables[index]!.isActive) return focusables[index]!.id;
		}
		return undefined;
	};

	const focusNext = (): void => {
		const next = nextActiveAfter(activeId.value);
		activeId.value = next ?? firstActiveId();
	};

	const focusPrevious = (): void => {
		const previous = previousActiveBefore(activeId.value);
		activeId.value = previous ?? lastActiveId();
	};

	const add = (id: string, { autoFocus }: { autoFocus: boolean }): void => {
		focusables.push({ id, isActive: true });
		if (autoFocus && activeId.value === undefined) {
			activeId.value = id;
		}
	};

	const remove = (id: string): void => {
		const index = findIndex(id);
		if (index >= 0) focusables.splice(index, 1);
		if (activeId.value === id) activeId.value = undefined;
	};

	const activate = (id: string): void => {
		const entry = focusables.find((item) => item.id === id);
		if (entry) entry.isActive = true;
	};

	const deactivate = (id: string): void => {
		const entry = focusables.find((item) => item.id === id);
		if (entry) entry.isActive = false;
		if (activeId.value === id) activeId.value = undefined;
	};

	const focus = (id: string): void => {
		const exists = focusables.some((entry) => entry.id === id);
		if (exists) activeId.value = id;
	};

	const enableFocus = (): void => {
		isFocusEnabled.value = true;
	};

	const disableFocus = (): void => {
		isFocusEnabled.value = false;
		activeId.value = undefined;
	};

	const onInput = (_input: string, key: Key): void => {
		if (!isFocusEnabled.value) return;
		if (key.escape) {
			activeId.value = undefined;
			return;
		}
		if (!key.tab) return;
		if (key.shift) focusPrevious();
		else focusNext();
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
