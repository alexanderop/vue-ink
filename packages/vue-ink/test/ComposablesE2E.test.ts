import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pty from 'node-pty';
import stripAnsi from 'strip-ansi';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, 'fixtures/composables-demo.ts');
const packageRoot = path.resolve(here, '..');

const spawnFixture = (cols: number, rows: number) => {
	const buffer: string[] = [];
	const proc = pty.spawn(process.execPath, ['--import=tsx', fixture], {
		name: 'xterm-color',
		cols,
		rows,
		cwd: packageRoot,
		env: { ...process.env, FORCE_COLOR: 'true' },
	});
	proc.onData((data) => buffer.push(data));
	const joined = () => stripAnsi(buffer.join(''));
	const waitFor = (matcher: RegExp, timeoutMs: number): Promise<void> =>
		new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`timeout waiting for ${matcher}; got:\n${joined()}`));
			}, timeoutMs);
			const check = (): boolean => {
				if (matcher.test(joined())) {
					clearTimeout(timer);
					resolve();
					return true;
				}
				return false;
			};
			if (check()) return;
			const sub = proc.onData(() => {
				if (check()) sub.dispose();
			});
		});
	const onExit = (): Promise<{ exitCode: number; signal?: number }> =>
		new Promise((resolve) => {
			proc.onExit(resolve);
		});
	return { proc, joined, waitFor, onExit };
};

describe('composables end-to-end (real PTY)', () => {
	it(
		'useStdout, useStderr, useWindowSize and useApp work together in a real terminal',
		async () => {
			const app = spawnFixture(80, 24);

			try {
				// useStdout().write('boot\n') from onMounted prints above the frame.
				await app.waitFor(/boot/, 5000);
				// useWindowSize reports the PTY dimensions inside the frame.
				await app.waitFor(/cols=80 rows=24/, 5000);

				// useWindowSize is reactive. The fixture watches size and writes
				// "resized:..." to stderr when dimensions change.
				app.proc.resize(120, 30);
				await app.waitFor(/cols=120 rows=30/, 5000);
				await app.waitFor(/resized:120x30/, 5000);

				// useApp().exit() — fixture quits on 'q' via useInput.
				app.proc.write('q');
				const exit = await app.onExit();
				expect(exit.exitCode).toBe(0);
			} finally {
				try {
					app.proc.kill();
				} catch {}
			}
		},
		30_000,
	);
});
