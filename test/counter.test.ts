import {describe, it, expect} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as pty from 'node-pty';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

const waitForOutput = async (
	matcher: RegExp,
	timeoutMs: number,
): Promise<string> => {
	let buffer = '';
	const proc = pty.spawn(
		process.execPath,
		['--import=tsx', path.join(projectRoot, 'examples/counter/index.ts')],
		{
			name: 'xterm-color',
			cols: 80,
			rows: 30,
			cwd: projectRoot,
			env: {...process.env, FORCE_COLOR: 'true'},
		},
	);

	const found = await new Promise<string>(resolve => {
		const timer = setTimeout(() => {
			resolve(buffer);
		}, timeoutMs);

		proc.onData(data => {
			buffer += data;
			if (matcher.test(buffer)) {
				clearTimeout(timer);
				resolve(buffer);
			}
		});
	});

	try {
		proc.kill();
	} catch {}

	return found;
};

describe('counter example', () => {
	it('prints incrementing green "N tests passed" lines', async () => {
		const output = await waitForOutput(
			/\[32m\d+ tests passed\[39m/,
			8000,
		);
		expect(output).toMatch(/\[32m\d+ tests passed\[39m/);
	}, 12_000);
});
