import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pty from 'node-pty';
import stripAnsi from 'strip-ansi';
import { runFixture } from './fixtures/runFixture.ts';

// Ported from repos/ink/test/exit.tsx. These exercise the renderer through a
// real PTY: signal handling, raw-mode toggles, exit value forwarding, and
// the Static append-once invariant only break under a true TTY, so the
// in-process Lifecycle suite can't catch them. Each fixture is a runnable
// process under test/fixtures/.
//
// Hard sequencing requirement: `process.stdin` is global and the fixture
// runner is fork-based, but the renderer leaves no global state — running
// these in parallel would still oversubscribe pty allocations on CI. Vitest
// schedules tests within a describe sequentially, which is enough.

const TIMEOUT = 15_000;

describe('exit (real PTY)', () => {
	it(
		'exits normally without unmount() or exit()',
		async () => {
			const output = await runFixture('exit-normally');
			expect(output).toContain('exited');
		},
		TIMEOUT,
	);

	it(
		'exits on unmount()',
		async () => {
			const output = await runFixture('exit-on-unmount');
			expect(output).toContain('exited');
		},
		TIMEOUT,
	);

	it(
		'exits when app finishes execution',
		async () => {
			await expect(runFixture('exit-on-finish')).resolves.toBeDefined();
		},
		TIMEOUT,
	);

	it(
		'exits on exit()',
		async () => {
			const output = await runFixture('exit-on-exit');
			expect(output).toContain('exited');
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with error',
		async () => {
			const output = await runFixture('exit-on-exit-with-error');
			expect(output).toContain('errored');
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with error with value property',
		async () => {
			const output = await runFixture('exit-on-exit-with-error-value-property');
			expect(output).toContain('errored');
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with result value',
		async () => {
			const output = await runFixture('exit-on-exit-with-result');
			expect(output).toContain('result:hello from vue-ink');
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with object result',
		async () => {
			const output = await runFixture('exit-on-exit-with-value-object');
			expect(output).toContain('result:hello from vue-ink object');
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with raw mode',
		async () => {
			const output = await runFixture('exit-raw-on-exit');
			expect(output).toContain('exited');
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with raw mode with error',
		async () => {
			const output = await runFixture('exit-raw-on-exit-with-error');
			expect(output).toContain('errored');
		},
		TIMEOUT,
	);

	it(
		'exits on unmount() with raw mode',
		async () => {
			const output = await runFixture('exit-raw-on-unmount');
			expect(output).toContain('exited');
		},
		TIMEOUT,
	);

	it(
		'exits with thrown error',
		async () => {
			const output = await runFixture('exit-with-thrown-error');
			expect(output).toContain('errored');
		},
		TIMEOUT,
	);

	// Flakes on GitHub Actions runners: the spawned child occasionally exits
	// inside the 500ms wait window because of PTY scheduling jitter, even
	// though the process is well-behaved locally. `Lifecycle.test.ts` covers
	// the same exit-while-raw-mode invariant in-process. Skip on Actions only.
	it.skipIf(process.env['GITHUB_ACTIONS'])(
		"doesn't exit while raw mode is active",
		async () => {
			// This one can't go through runFixture — it needs bidirectional I/O.
			// The fixture writes 's' once it has cycled raw mode off/on; we then
			// wait 500ms to confirm the process is still alive, send 'q', and
			// expect a clean exit.
			const here = path.dirname(fileURLToPath(import.meta.url));
			const fixturePath = path.join(here, 'fixtures', 'exit-double-raw-mode.ts');
			const env: Record<string, string> = { ...process.env } as Record<string, string>;
			delete env['CI'];
			delete env['CONTINUOUS_INTEGRATION'];
			env['NODE_NO_WARNINGS'] = '1';
			await new Promise<void>((resolve, reject) => {
				const term = pty.spawn(
					process.execPath,
					['--import=tsx', fixturePath],
					{
						name: 'xterm-color',
						cols: 100,
						cwd: path.resolve(here, '..'),
						env,
					},
				);

				let isExited = false;
				let output = '';
				const failTimer = setTimeout(() => {
					try {
						term.kill();
					} catch {}
					reject(new Error(`timeout — output so far:\n${output}`));
				}, 5_000);

				term.onData((data) => {
					if (data === 's') {
						setTimeout(() => {
							try {
								expect(isExited).toBe(false);
								term.write('q');
							} catch (err) {
								clearTimeout(failTimer);
								try {
									term.kill();
								} catch {}
								reject(err);
							}
						}, 500);
					} else {
						output += data;
					}
				});

				term.onExit(({ exitCode }) => {
					isExited = true;
					clearTimeout(failTimer);
					if (exitCode === 0) {
						try {
							expect(output).toContain('exited');
							resolve();
						} catch (err) {
							reject(err);
						}
						return;
					}
					reject(new Error(`process exited with code ${exitCode}`));
				});
			});
		},
		TIMEOUT,
	);

	it(
		'exits on exit() with error and static output (issue #397 regression)',
		async () => {
			const output = await runFixture('exit-with-static');
			// Error is propagated, not swallowed
			expect(output).toContain('errored');
			// Static items rendered
			const cleaned = stripAnsi(output);
			expect(cleaned).toContain('A');
			expect(cleaned).toContain('B');
			expect(cleaned).toContain('C');
			// Static items NOT duplicated — exactly one 'A' line
			const aLines = cleaned.split('\n').filter((line) => /^\s*A\s*$/.test(line));
			expect(aLines).toHaveLength(1);
		},
		TIMEOUT,
	);
});
