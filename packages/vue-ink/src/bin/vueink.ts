#!/usr/bin/env node
// Interactive playground for vue-ink — lists examples from
// `examples/manifest.json`, renders an arrow-key menu (built in vue-ink
// itself), and spawns the chosen example as a child process with inherited
// stdio.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { h, ref } from 'vue';
import { Box, Text, render, useApp, useInput } from '../index.ts';

type ManifestEntry = { name: string; description: string };

const here = path.dirname(fileURLToPath(import.meta.url));

const findExamplesDir = (start: string): string => {
	let current = start;
	while (true) {
		const candidate = path.join(current, 'examples');
		if (existsSync(path.join(candidate, 'manifest.json'))) return candidate;

		const parent = path.dirname(current);
		if (parent === current) {
			throw new Error('Could not find examples/manifest.json');
		}
		current = parent;
	}
};

const examplesDir = findExamplesDir(here);
const manifestPath = path.join(examplesDir, 'manifest.json');

const raw = await readFile(manifestPath, 'utf8');
const manifest = (JSON.parse(raw) as ManifestEntry[]).filter((entry) =>
	existsSync(path.join(examplesDir, entry.name, 'index.ts')),
);

if (manifest.length === 0) {
	process.stderr.write('No runnable examples found in examples/manifest.json\n');
	process.exit(1);
}

const selectedIndex = ref(0);
const chosen = ref<string | null>(null);

const Launcher = {
	setup() {
		const { exit } = useApp();

		useInput((input, key) => {
			if (key.upArrow || input === 'k') {
				selectedIndex.value =
					(selectedIndex.value - 1 + manifest.length) % manifest.length;
			} else if (key.downArrow || input === 'j') {
				selectedIndex.value = (selectedIndex.value + 1) % manifest.length;
			} else if (key.return) {
				chosen.value = manifest[selectedIndex.value]!.name;
				exit();
			} else if (input === 'q' || key.escape) {
				chosen.value = null;
				exit();
			}
		});

		const widest = Math.max(...manifest.map((e) => e.name.length));

		return () =>
			h(Box, { flexDirection: 'column' }, () => [
				h(Text, { bold: true, color: 'cyan' }, () => 'vue-ink playground'),
				h(Text, { dimColor: true }, () => '↑/↓ navigate · enter to run · q or esc to quit'),
				h(Box, { flexDirection: 'column', marginTop: 1 }, () =>
					manifest.map((entry, i) => {
						const selected = i === selectedIndex.value;
						return h(Box, { key: entry.name }, () => [
							h(
								Text,
								{ color: selected ? 'green' : undefined },
								() => (selected ? '› ' : '  '),
							),
							h(
								Text,
								{ bold: selected, color: selected ? 'green' : undefined },
								() => entry.name.padEnd(widest + 2),
							),
							h(Text, { dimColor: !selected }, () => entry.description),
						]);
					}),
				),
			]);
	},
};

const instance = render(Launcher);
await instance.waitUntilExit();

if (!chosen.value) {
	process.exit(0);
}

const name = chosen.value;
const exampleDir = path.join(examplesDir, name);
const entry = path.join(exampleDir, 'index.ts');

process.stdout.write(`\nRunning examples/${name} — Ctrl-C to exit\n\n`);

const child = spawn(process.execPath, ['--import=tsx', entry], {
	stdio: 'inherit',
	cwd: exampleDir,
});

const code: number = await new Promise((resolve) => {
	child.on('exit', (signalCode) => resolve(typeof signalCode === 'number' ? signalCode : 0));
});

process.exit(code);
