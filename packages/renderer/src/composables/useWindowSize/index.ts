import { shallowRef, type ShallowRef } from 'vue';
import { useStdout } from '../useStdout/index.ts';
import { tryOnScopeDispose } from '../_internal/index.ts';

export interface UseWindowSizeReturn {
	columns: ShallowRef<number>;
	rows: ShallowRef<number>;
}

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

const readDim = (raw: unknown, fallback: number): number =>
	typeof raw === 'number' && raw > 0 ? raw : fallback;

/**
 * Reactive terminal dimensions. Updates on stdout's `resize` event and
 * detaches the listener when the surrounding scope is disposed.
 *
 * Returns two `ShallowRef<number>`s — destructure them so Vue's template
 * auto-unwrap kicks in:
 *
 * ```vue
 * <script setup>
 * const { columns, rows } = useWindowSize();
 * </script>
 * <template>{{ columns }} × {{ rows }}</template>
 * ```
 */
export const useWindowSize = (): UseWindowSizeReturn => {
	const { stdout } = useStdout();

	const columns = shallowRef(readDim(stdout.columns, DEFAULT_COLUMNS));
	const rows = shallowRef(readDim(stdout.rows, DEFAULT_ROWS));

	const update = (): void => {
		const nextCols = readDim(stdout.columns, DEFAULT_COLUMNS);
		const nextRows = readDim(stdout.rows, DEFAULT_ROWS);
		if (nextCols !== columns.value) columns.value = nextCols;
		if (nextRows !== rows.value) rows.value = nextRows;
	};

	stdout.on('resize', update);
	tryOnScopeDispose(() => {
		stdout.off('resize', update);
	});

	return { columns, rows };
};
