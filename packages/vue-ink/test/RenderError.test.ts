import { describe, it, expect, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import stripAnsi from 'strip-ansi';
import { render, Text, useStdin } from '../src/index.ts';
import { createCaptureStream, createFakeStdin, flush } from './helpers.ts';

// Ported from repos/ink/test/errors.tsx. Vue's failure mode differs from
// React's ErrorBoundary — vue-ink installs `app.config.errorHandler` which
// erases the half-painted frame, writes the stack to stderr, and unmounts.
// See the `// what this catches:` line above each `it` block for the
// specific failure mode it guards.

describe('render error handling', () => {
	// what this catches: a setup() throw during app.mount() must not leave a
	// torn-down render instance registered for the stdout stream. A later
	// render() against the same stdout should mount a fresh tree.
	it('does not register a dead instance after a setup error', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);

		const Boom = defineComponent({
			setup() {
				throw new Error('mount exploded');
			},
		});
		const Healthy = defineComponent({
			setup: () => () => h(Text, null, () => 'healthy'),
		});

		const first = render(Boom, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});
		await flush();

		const second = render(Healthy, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});
		await flush();

		expect(second).not.toBe(first);
		expect(stripAnsi(stdout.frames.join(''))).toContain('healthy');

		second.unmount();
	});

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

	// what this catches: render failures are observable to callers awaiting
	// waitUntilExit(). A thrown setup() error should reject with that error,
	// not resolve like a normal unmount.
	it('rejects waitUntilExit() when setup throws during mount', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);
		const boom = new Error('mount exploded');

		const Boom = defineComponent({
			setup() {
				throw boom;
			},
		});

		const instance = render(Boom, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});

		await expect(instance.waitUntilExit()).rejects.toBe(boom);
	});

	// what this catches: errors thrown by a later Vue render pass should also
	// reject waitUntilExit(), not be converted into a successful exit.
	it('rejects waitUntilExit() when a later render throws', async () => {
		const stdout = createCaptureStream(20);
		const stderr = createCaptureStream(20);
		const boom = new Error('rerender exploded');
		const shouldThrow = ref(false);

		const App = defineComponent({
			setup: () => () => {
				if (shouldThrow.value) throw boom;
				return h(Text, null, () => 'ok');
			},
		});

		const instance = render(App, {
			stdout,
			stderr: stderr as unknown as NodeJS.WriteStream,
			interactive: true,
		});
		await flush();

		shouldThrow.value = true;
		await flush();

		await expect(instance.waitUntilExit()).rejects.toBe(boom);
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
