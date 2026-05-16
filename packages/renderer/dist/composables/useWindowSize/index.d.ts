import { type ShallowRef } from 'vue';
export interface UseWindowSizeReturn {
    columns: ShallowRef<number>;
    rows: ShallowRef<number>;
}
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
export declare const useWindowSize: () => UseWindowSizeReturn;
//# sourceMappingURL=index.d.ts.map