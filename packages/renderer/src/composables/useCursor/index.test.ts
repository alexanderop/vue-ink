import { describe, it, expect, vi } from 'vitest';
import type { CursorContext } from '../../context.ts';
import { withSetup } from '../_test/with-setup.ts';
import { useCursor } from './index.ts';

const buildContext = () => {
	const setCursorPosition = vi.fn();
	const cursor: CursorContext = { setCursorPosition };
	return { cursor, setCursorPosition };
};

describe('useCursor', () => {
	it('is defined', () => {
		expect(useCursor).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useCursor())).toThrow(/useCursor/);
	});

	it('publishes a position through the cursor context', () => {
		const { cursor, setCursorPosition } = buildContext();
		const { result, unmount } = withSetup(() => useCursor(), { cursor });
		result.setCursorPosition({ x: 3, y: 1 });
		expect(setCursorPosition).toHaveBeenLastCalledWith({ x: 3, y: 1 });
		unmount();
	});

	it('publishes undefined to hide the cursor', () => {
		const { cursor, setCursorPosition } = buildContext();
		const { result, unmount } = withSetup(() => useCursor(), { cursor });
		result.setCursorPosition({ x: 0, y: 0 });
		setCursorPosition.mockClear();
		result.setCursorPosition(undefined);
		expect(setCursorPosition).toHaveBeenLastCalledWith(undefined);
		unmount();
	});

	it('resets the position to undefined when the scope is disposed after a claim', () => {
		const { cursor, setCursorPosition } = buildContext();
		const { result, unmount } = withSetup(() => useCursor(), { cursor });
		result.setCursorPosition({ x: 5, y: 0 });
		setCursorPosition.mockClear();
		unmount();
		expect(setCursorPosition).toHaveBeenLastCalledWith(undefined);
	});

	it('does not reset on dispose if setCursorPosition was never called', () => {
		const { cursor, setCursorPosition } = buildContext();
		const { unmount } = withSetup(() => useCursor(), { cursor });
		unmount();
		expect(setCursorPosition).not.toHaveBeenCalled();
	});
});
