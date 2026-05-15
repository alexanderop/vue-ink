import { chmodSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, vi } from 'vitest';

process.env['FORCE_COLOR'] = 'true';

// Defensive: tests run inside a single fork (see vitest.config.ts), so a
// fake-timer leak from one file can cause subsequent files to hang on real
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
