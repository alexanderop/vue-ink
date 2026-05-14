import { describe, it, expect } from 'vitest';
import {
	createFakeStdout,
	fakeStderrContext,
	withSetup,
} from '../_test/with-setup.ts';
import { useStderr } from './index.ts';

describe('useStderr', () => {
	it('should be defined', () => {
		expect(useStderr).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useStderr())).toThrow(/useStderr/);
	});

	it('exposes the injected stderr stream', () => {
		const stderr = createFakeStdout(80);
		const ctx = fakeStderrContext(stderr);
		const { result, unmount } = withSetup(() => useStderr(), { stderr: ctx });
		expect(result.stderr).toBe(stderr);
		unmount();
	});

	it('write(data) goes through the context write fn', () => {
		const stderr = createFakeStdout(80);
		const ctx = fakeStderrContext(stderr);
		const { result, unmount } = withSetup(() => useStderr(), { stderr: ctx });
		result.write('boom\n');
		expect(stderr.writes).toEqual(['boom\n']);
		unmount();
	});
});
