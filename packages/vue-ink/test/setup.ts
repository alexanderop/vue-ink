import { chmodSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, vi } from 'vitest';

delete process.env['NO_COLOR'];
process.env['FORCE_COLOR'] = 'true';

// CI runners (GitHub Actions etc.) set `CI=true`, which makes `isCiEnv()` in
// the renderer flip to true and force `interactive: false` — even for tests
// that mock `isTTY = true` on a captured stream. Strip the CI-detection env
// vars so the suite sees a clean shell. Tests that intentionally exercise
// CI behavior set their own value via `withEnv()` (see `RenderInteractive.test.ts`).
delete process.env['CI'];
delete process.env['CONTINUOUS_INTEGRATION'];
delete process.env['BUILD_NUMBER'];
delete process.env['RUN_ID'];

// Defensive: a fake-timer leak from one test can hang subsequent tests on real
// setTimeouts. Force real timers between every test, no matter who forgot.
afterEach(() => {
	vi.useRealTimers();
});

// pnpm 11's tarball extraction drops the execute bit on node-pty's
// `spawn-helper` prebuilt binary, causing `posix_spawnp failed.` at runtime.
// Restore it once per test run so the counter PTY test works idempotently
// without a custom postinstall hook.
const ensureSpawnHelperExecutable = (): void => {
	try {
		const req = createRequire(import.meta.url);
		const ptyPkg = req.resolve('node-pty/package.json');
		const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64'];
		for (const platform of platforms) {
			const helper = path.join(path.dirname(ptyPkg), 'prebuilds', platform, 'spawn-helper');
			if (existsSync(helper) && (statSync(helper).mode & 0o111) === 0) {
				chmodSync(helper, 0o755);
			}
		}
	} catch {
		// node-pty not installed in this package — nothing to do.
	}
};

ensureSpawnHelperExecutable();
