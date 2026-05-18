import { PassThrough } from 'node:stream';
import React, { type ReactElement } from 'react';
import { Box, Text, render } from 'ink';
import { createSilentStream } from '../scenarios.ts';

// Stdin shim — ink wires `useInput` and raw-mode handling against this during
// mount, even when no <Stdin>-aware component is used.
const createSilentStdin = (): NodeJS.ReadStream => {
	const stream = new PassThrough() as unknown as NodeJS.ReadStream & {
		isTTY: boolean;
		setRawMode?: (mode: boolean) => unknown;
		ref?: () => unknown;
		unref?: () => unknown;
	};
	stream.isTTY = false;
	stream.setRawMode = () => stream;
	stream.ref = () => stream;
	stream.unref = () => stream;
	return stream;
};

// Mount → flush first frame → unmount. ink's `waitUntilRenderFlush` resolves
// after React commits and ink's stream write callback fires, which is the
// equivalent point to vue-ink's `nextTick`-plus-microtask in ../scenarios.ts.
export const renderOnce = async (
	element: ReactElement,
	columns = 80,
): Promise<void> => {
	const instance = render(element, {
		stdout: createSilentStream(columns),
		stdin: createSilentStdin(),
		stderr: createSilentStream(columns),
		debug: false,
		exitOnCtrlC: false,
		patchConsole: false,
		// Default ink throttles to 30fps via setTimeout, which adds ~16ms of
		// scheduler latency to every "first frame" measurement and dominates
		// the result. Crank it up so the bench reflects work, not the throttle.
		maxFps: 1000,
	});
	await instance.waitUntilRenderFlush();
	instance.unmount();
};

// ─── Scenario components (mirror ../scenarios.ts) ───────────────────────────

const h = React.createElement;

// Flat list of N text rows — the cheapest realistic shape.
export const FlatList = (count: number): ReactElement =>
	h(
		Box,
		{ flexDirection: 'column' },
		Array.from({ length: count }, (_, i) => h(Text, { key: i }, `row ${i}`)),
	);

// Nested boxes `depth` levels deep — stresses Yoga's recursive layout.
export const NestedBoxes = (depth: number): ReactElement => {
	const build = (level: number): ReactElement =>
		level === 0
			? h(Text, null, 'leaf')
			: h(Box, { paddingLeft: 1, flexDirection: 'column' }, build(level - 1));
	return build(depth);
};

// `rows × cols` grid of styled cells with borders — closer to a real UI table.
export const StyledGrid = (rows: number, cols: number): ReactElement =>
	h(
		Box,
		{ flexDirection: 'column' },
		Array.from({ length: rows }, (_, r) =>
			h(
				Box,
				{ key: r, flexDirection: 'row' },
				Array.from({ length: cols }, (_, c) =>
					h(
						Box,
						{
							key: c,
							borderStyle: 'single',
							paddingX: 1,
							marginRight: 1,
						},
						h(
							Text,
							{ color: (c + r) % 2 === 0 ? 'cyan' : 'yellow' },
							`${r},${c}`,
						),
					),
				),
			),
		),
	);

// Long text inside a narrow box — exercises the wrap path heavily.
export const WrappedParagraphs = (count: number): ReactElement => {
	const lorem =
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
	return h(
		Box,
		{ flexDirection: 'column', width: 40 },
		Array.from({ length: count }, (_, i) =>
			h(Box, { key: i, marginBottom: 1 }, h(Text, null, lorem)),
		),
	);
};
