import { describe, it, expect } from 'vitest';
import {
	createFakeStdout,
	fakeStdoutContext,
	withSetup,
} from '../_test/with-setup.ts';
import { useStdout } from './index.ts';

describe('useStdout', () => {
	it('should be defined', () => {
		expect(useStdout).toBeDefined();
	});

	it('throws when not mounted inside vue-ink render()', () => {
		expect(() => withSetup(() => useStdout())).toThrow(/useStdout/);
	});

	it('exposes the injected stdout stream', () => {
		const stdout = createFakeStdout(42);
		const ctx = fakeStdoutContext(stdout);
		const { result, unmount } = withSetup(() => useStdout(), { stdout: ctx });
		expect(result.stdout).toBe(stdout);
		unmount();
	});

	it('write(data) goes through the context write fn (above-frame)', () => {
		const stdout = createFakeStdout(80);
		const ctx = fakeStdoutContext(stdout);
		const { result, unmount } = withSetup(() => useStdout(), { stdout: ctx });
		result.write('hello\n');
		expect(stdout.writes).toEqual(['hello\n']);
		unmount();
	});
});
