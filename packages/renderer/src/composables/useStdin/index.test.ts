import { describe, it, expect } from 'vitest';
import {
	createFakeStdin,
	fakeStdinContext,
	withSetup,
} from '../_test/with-setup.ts';
import { useStdin } from './index.ts';

describe('useStdin', () => {
	it('should be defined', () => {
		expect(useStdin).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useStdin())).toThrow(/useStdin/);
	});

	it('exposes the injected stdin stream and raw-mode controls', () => {
		const stdin = createFakeStdin();
		const ctx = fakeStdinContext(stdin);
		const { result, unmount } = withSetup(() => useStdin(), { stdin: ctx });
		expect(result.stdin).toBe(stdin);
		expect(result.isRawModeSupported).toBe(true);
		expect(typeof result.setRawMode).toBe('function');
		expect(typeof result.setBracketedPasteMode).toBe('function');
		unmount();
	});

	it('reports isRawModeSupported=false for non-TTY stdin', () => {
		const stdin = createFakeStdin({ isTTY: false });
		const ctx = fakeStdinContext(stdin);
		const { result, unmount } = withSetup(() => useStdin(), { stdin: ctx });
		expect(result.isRawModeSupported).toBe(false);
		unmount();
	});

	it('does not expose the internal emitter', () => {
		const ctx = fakeStdinContext();
		const { result, unmount } = withSetup(() => useStdin(), { stdin: ctx });
		expect((result as { emitter?: unknown }).emitter).toBeUndefined();
		unmount();
	});
});
