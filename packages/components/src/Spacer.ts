import { defineComponent, h } from 'vue';
import Box from './Box.ts';

/**
 * `<Spacer>` is a flexible-grow `<Box>` that consumes any remaining space
 * along its parent's main axis. Drop one between siblings to push them to
 * opposite ends — a tidy alternative to setting `justifyContent`
 * explicitly when you only need to separate two items.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { Box, Spacer, Text } from 'vueink';
 * </script>
 *
 * <template>
 *   <Box>
 *     <Text>Left</Text>
 *     <Spacer />
 *     <Text>Right</Text>
 *   </Box>
 * </template>
 * ```
 */
const Spacer = defineComponent({
	name: 'Spacer',
	setup() {
		return () => h(Box, { flexGrow: 1 });
	},
});

export default Spacer;
