import { defineComponent, h } from 'vue';
import { useTextHost } from './text-context.ts';

export type NewlineProps = {
	/**
	 * Number of newlines to insert.
	 *
	 * @default 1
	 */
	count?: number;
};

/**
 * `<Newline>` inserts one or more line breaks inside a `<Text>` block. Use
 * it to split a single text run across rows without composing string
 * literals with `\n`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { Text, Newline } from 'vueink';
 * </script>
 *
 * <template>
 *   <Text>
 *     First line
 *     <Newline />
 *     Second line
 *   </Text>
 * </template>
 * ```
 */
const Newline = defineComponent({
	name: 'Newline',
	props: {
		count: { type: Number, default: 1 },
	},
	setup(props) {
		const tag = useTextHost();
		return () => h(tag, null, '\n'.repeat(props.count));
	},
});

export default Newline;
