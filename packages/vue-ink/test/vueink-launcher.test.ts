import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pty from 'node-pty';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..');
const launcher = path.join(packageRoot, 'bin/vueink.ts');

const ESC = String.fromCharCode(27);
const DOWN_ARROW = `${ESC}[B`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const collect = (proc: pty.IPty, until: (buf: string) => boolean, timeoutMs: number) => new Promise<string>((resolve) => {
		let buf = '';
		const timer = setTimeout(() => resolve(buf), timeoutMs);
		proc.onData((data) => {
			buf += data;
			if (until(buf)) {
				clearTimeout(timer);
				resolve(buf);
			}
		});
	});

describe('vueink launcher', () => {
	it('renders the menu and launches the chosen example', async () => {
		const proc = pty.spawn(
			process.execPath,
			['--import=tsx', launcher],
			{
				name: 'xterm-color',
				cols: 100,
				rows: 30,
				cwd: packageRoot,
				env: { ...process.env, FORCE_COLOR: 'true' },
			},
		);

		const menu = await collect(
			proc,
			(b) => /playground/i.test(b) && /counter/.test(b),
			3000,
		);
		expect(menu).toMatch(/playground/i);
		expect(menu).toMatch(/counter/);
		expect(menu).toMatch(/colors/);
		expect(menu).toMatch(/input/);

		// Press down arrow once → moves selection from counter (0) to colors (1).
		await sleep(50);
		proc.write(DOWN_ARROW);
		await sleep(120);
		proc.write('\r'); // enter

		// The colors example prints "Foreground:" and "Background:" labels.
		const childOut = await collect(
			proc,
			(b) => /Foreground/.test(b) && /Background/.test(b),
			5000,
		);
		expect(childOut).toMatch(/Foreground/);
		expect(childOut).toMatch(/Background/);

		try {
			proc.kill();
		} catch {}
	}, 15_000);
});
