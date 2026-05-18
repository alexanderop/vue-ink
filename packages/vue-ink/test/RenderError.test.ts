import { describe, it, expect, vi } from 'vitest';
import { defineComponent } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, useStdin } from '../src/index.ts';
import { createCaptureStream, createFakeStdin, flush } from './helpers.ts';

// Ported from repos/ink/test/errors.tsx. Vue's failure mode differs from
// React's ErrorBoundary — vue-ink installs `app.config.errorHandler` which
// erases the half-painted frame, writes the stack to stderr, and unmounts.
// See the `// what this catches:` line above each `it` block for the
// specific failure mode it guards.

describe('render error handling', () => {
	// what this catches: a thrown setup() error must reach stderr (with
	// the "vue-ink render error" header) and the app must unmount.
	it('writes the thrown setup error to stderr and tears the app down', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);

		const Boom = defineComponent({
			setup() {
				throw new Error('Oh no');
			},
		});

		render(Boom, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});
		await flush();

		const stderrText = stripAnsi(stderr.frames.join(''));
		expect(stderrText).toContain('vue-ink render error');
		expect(stderrText).toContain('Oh no');
	});

	// Mirrors ink's "does not emit unhandledRejection when render exits with an
	// error and waitUntilExit is unused". The renderer attaches a noop catch
	// handler to the internal exit promise so consumers who never call
	// waitUntilExit() don't crash the process when a render throws.
	// what this catches: a render that throws without an awaited
	// waitUntilExit() must NOT trigger Node's unhandledRejection (which
	// could crash the host process on `--unhandled-rejections=strict`).
	it('does not emit unhandledRejection when render throws and waitUntilExit is unused', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);

		const reasons: unknown[] = [];
		const onUnhandledRejection = (reason: unknown): void => {
			reasons.push(reason);
		};
		process.on('unhandledRejection', onUnhandledRejection);

		try {
			const Boom = defineComponent({
				setup() {
					throw new Error('Oh no');
				},
			});

			render(Boom, {
				stdout,
				stderr: stderr as unknown as NodeJS.WriteStream,
				interactive: true,
			});

			await new Promise<void>((resolve) => setImmediate(resolve));
			await new Promise<void>((resolve) => setImmediate(resolve));

			expect(reasons).toHaveLength(0);
		} finally {
			process.off('unhandledRejection', onUnhandledRejection);
		}
	});

	// what this catches: raw mode that was turned on before a thrown
	// error must be turned back off during teardown. Regression would
	// leave the user's terminal stuck in raw mode after a crash.
	it('disables raw mode when a component throws after enabling it', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);
		const stdin = createFakeStdin();
		const setRawModeSpy = stdin.setRawMode as unknown as ReturnType<typeof vi.fn>;

		const Boom = defineComponent({
			setup() {
				const { setRawMode } = useStdin();
				setRawMode(true);
				return () => {
					throw new Error('Error after raw mode enabled');
				};
			},
		});

		render(Boom, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			stdin,
			interactive: true,
		});
		await flush();

		const calls = setRawModeSpy.mock.calls.map((c) => c[0]);
		expect(calls).toContain(true);
		expect(calls).toContain(false);
	});
});
