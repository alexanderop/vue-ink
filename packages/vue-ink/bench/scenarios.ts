import { Writable } from 'node:stream';
import { defineComponent, h, nextTick, type Component } from 'vue';
import { Box, Text } from '../src/index.ts';
import { render } from '../src/index.ts';

// A non-TTY capture stream so render() doesn't touch the real terminal.
export const createSilentStream = (columns = 80): NodeJS.WriteStream => {
	const stream = new Writable({
		write(_chunk, _enc, cb) {
			cb();
		},
	}) as Writable & { columns: number; isTTY: boolean };
	stream.columns = columns;
	stream.isTTY = false;
	return stream as unknown as NodeJS.WriteStream;
};

const flush = async (): Promise<void> => {
	await nextTick();
	await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
};

// Mount, flush, unmount — the full pipeline a real app pays per first frame.
export const renderOnce = async (component: Component, columns = 80): Promise<void> => {
	const instance = render(component, { stdout: createSilentStream(columns) });
	await flush();
	instance.unmount();
};

// ─── Scenario components ────────────────────────────────────────────────────

// Flat list of N text rows — the cheapest realistic shape.
export const FlatList = (count: number): Component =>
	defineComponent({
		setup: () => () =>
			h(
				Box,
				{ flexDirection: 'column' },
				() => Array.from({ length: count }, (_, i) => h(Text, null, () => `row ${i}`)),
			),
	});

// Nested boxes `depth` levels deep — stresses Yoga's recursive layout.
export const NestedBoxes = (depth: number): Component =>
	defineComponent({
		setup: () => {
			const build = (level: number): ReturnType<typeof h> =>
				level === 0
					? h(Text, null, () => 'leaf')
					: h(Box, { paddingLeft: 1, flexDirection: 'column' }, () => build(level - 1));
			return () => build(depth);
		},
	});

// `rows × cols` grid of styled cells with borders — closer to a real UI table.
export const StyledGrid = (rows: number, cols: number): Component =>
	defineComponent({
		setup: () => () =>
			h(
				Box,
				{ flexDirection: 'column' },
				() =>
					Array.from({ length: rows }, (_, r) =>
						h(
							Box,
							{ flexDirection: 'row' },
							() =>
								Array.from({ length: cols }, (_, c) =>
									h(
										Box,
										{
											borderStyle: 'single',
											paddingX: 1,
											marginRight: 1,
										},
										() =>
											h(
												Text,
												{ color: (c + r) % 2 === 0 ? 'cyan' : 'yellow' },
												() => `${r},${c}`,
											),
									),
								),
						),
					),
			),
	});

// Long text inside a narrow box — exercises the wrap path heavily.
export const WrappedParagraphs = (count: number): Component => {
	const lorem =
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
	return defineComponent({
		setup: () => () =>
			h(
				Box,
				{ flexDirection: 'column', width: 40 },
				() =>
					Array.from({ length: count }, () =>
						h(Box, { marginBottom: 1 }, () => h(Text, null, () => lorem)),
					),
			),
	});
};
