import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { withSetup } from '../_test/with-setup.ts';
import { useIsScreenReaderEnabled } from './index.ts';

describe('useIsScreenReaderEnabled', () => {
	it('should be defined', () => {
		expect(useIsScreenReaderEnabled).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useIsScreenReaderEnabled())).toThrow(
			/useIsScreenReaderEnabled/,
		);
	});

	it('returns the injected isScreenReaderEnabled ref', () => {
		const flag = ref(false);
		const { result, unmount } = withSetup(() => useIsScreenReaderEnabled(), {
			accessibility: { isScreenReaderEnabled: flag },
		});
		expect(result).toBe(flag);
		expect(result.value).toBe(false);
		unmount();
	});

	it('is reactive — consumers see updates', () => {
		const flag = ref(false);
		const { result, unmount } = withSetup(() => useIsScreenReaderEnabled(), {
			accessibility: { isScreenReaderEnabled: flag },
		});
		flag.value = true;
		expect(result.value).toBe(true);
		unmount();
	});
});
