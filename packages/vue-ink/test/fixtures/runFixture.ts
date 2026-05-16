// PTY-driven fixture runner used by `Exit.test.ts`. Ported from
// `repos/ink/test/helpers/run.ts`. Spawns a fixture under tsx so the child
// process sees a real TTY and the renderer takes its interactive code path.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pty from 'node-pty';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..', '..');

export type RunFixtureOptions = {
	env?: Record<string, string>;
	columns?: number;
};

export const runFixture = async (
	fixture: string,
	options: RunFixtureOptions = {},
): Promise<string> => {
	const fixturePath = path.join(here, `${fixture}.ts`);
	// vue-ink's render() inlines `is-in-ci`'s detection and treats any truthy
	// `env.CI` as CI — including the string 'false'. Deleting CI from the
	// child env is what actually puts the renderer in interactive mode.
	const env: Record<string, string> = { ...process.env } as Record<string, string>;
	delete env['CI'];
	delete env['CONTINUOUS_INTEGRATION'];
	delete env['BUILD_NUMBER'];
	delete env['RUN_ID'];
	env['NODE_NO_WARNINGS'] = '1';
	Object.assign(env, options.env ?? {});
	return new Promise<string>((resolve, reject) => {
		const proc = pty.spawn(
			process.execPath,
			['--import=tsx', fixturePath],
			{
				name: 'xterm-color',
				cols: options.columns ?? 100,
				cwd: packageRoot,
				env,
			},
		);

		let output = '';
		proc.onData((data) => {
			output += data;
		});
		proc.onExit(({ exitCode }) => {
			if (exitCode === 0) {
				resolve(output);
				return;
			}
			reject(new Error(`Fixture "${fixture}" exited with code ${exitCode}\nOutput:\n${output}`));
		});
	});
};
