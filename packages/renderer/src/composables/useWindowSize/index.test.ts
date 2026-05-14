import { describe, it, expect } from 'vitest';
import {
	createFakeStdout,
	fakeStdoutContext,
	withSetup,
} from '../_test/with-setup.ts';
import { useWindowSize } from './index.ts';

describe('useWindowSize', () => {
	it('should be defined', () => {
		expect(useWindowSize).toBeDefined();
	});

	it('returns the initial dimensions read from stdout', () => {
		const stdout = createFakeStdout(42);
		stdout.rows = 17;
		const { result, unmount } = withSetup(() => useWindowSize(), {
			stdout: fakeStdoutContext(stdout),
		});
		expect(result.columns.value).toBe(42);
		expect(result.rows.value).toBe(17);
		unmount();
	});

	it('falls back to 80x24 when stdout has no dimensions', () => {
		const stdout = createFakeStdout(80);
		Object.defineProperty(stdout, 'columns', { value: undefined, configurable: true });
		Object.defineProperty(stdout, 'rows', { value: undefined, configurable: true });
		const { result, unmount } = withSetup(() => useWindowSize(), {
			stdout: fakeStdoutContext(stdout),
		});
		expect(result.columns.value).toBe(80);
		expect(result.rows.value).toBe(24);
		unmount();
	});

	it('updates reactively on stdout `resize`', () => {
		const stdout = createFakeStdout(20);
		stdout.rows = 10;
		const { result, unmount } = withSetup(() => useWindowSize(), {
			stdout: fakeStdoutContext(stdout),
		});
		expect(result.columns.value).toBe(20);

		stdout.columns = 100;
		stdout.rows = 30;
		stdout.emit('resize');

		expect(result.columns.value).toBe(100);
		expect(result.rows.value).toBe(30);
		unmount();
	});

	it('detaches the resize listener on scope dispose', () => {
		const stdout = createFakeStdout(20);
		const { unmount } = withSetup(() => useWindowSize(), {
			stdout: fakeStdoutContext(stdout),
		});
		const before = stdout.listenerCount('resize');
		expect(before).toBeGreaterThan(0);
		unmount();
		expect(stdout.listenerCount('resize')).toBe(before - 1);
	});

	it('does not write when dimensions match (no churn)', () => {
		const stdout = createFakeStdout(20);
		stdout.rows = 10;
		const { result, unmount } = withSetup(() => useWindowSize(), {
			stdout: fakeStdoutContext(stdout),
		});
		const colsBefore = result.columns;
		const rowsBefore = result.rows;
		stdout.emit('resize');
		// Same identity: no .value reassignment happened.
		expect(result.columns).toBe(colsBefore);
		expect(result.rows).toBe(rowsBefore);
		expect(result.columns.value).toBe(20);
		expect(result.rows.value).toBe(10);
		unmount();
	});

	it('throws when useStdout is not provided', () => {
		expect(() => withSetup(() => useWindowSize())).toThrow(/useStdout/);
	});
});
