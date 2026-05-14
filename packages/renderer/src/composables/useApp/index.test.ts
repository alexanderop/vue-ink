import { describe, it, expect } from 'vitest';
import { fakeAppContext, withSetup } from '../_test/with-setup.ts';
import { useApp } from './index.ts';

describe('useApp', () => {
	it('should be defined', () => {
		expect(useApp).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useApp())).toThrow(/useApp/);
	});

	it('exposes the injected app context', () => {
		const app = fakeAppContext();
		const { result, unmount } = withSetup(() => useApp(), { app });
		expect(result).toBe(app);
		unmount();
	});

	it('exit() delegates to the injected exit handler', () => {
		const app = fakeAppContext();
		const { result, unmount } = withSetup(() => useApp(), { app });
		result.exit();
		expect(app.exitMock).toHaveBeenCalledTimes(1);
		expect(app.exitMock).toHaveBeenCalledWith();
		unmount();
	});

	it('exit(error) forwards the error to the host', () => {
		const app = fakeAppContext();
		const { result, unmount } = withSetup(() => useApp(), { app });
		const err = new Error('boom');
		result.exit(err);
		expect(app.exitMock).toHaveBeenCalledWith(err);
		unmount();
	});
});
