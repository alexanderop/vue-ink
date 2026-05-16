<script setup lang="ts">
import { ref, computed } from 'vue';
import {
	Box,
	Text,
	useApp,
	useInput,
	useFocus,
	useFocusManager,
} from 'vueink';
import type { Key } from 'vueink';

const { exit } = useApp();
const manager = useFocusManager();

const messages = ref<string[]>([]);
const log = (line: string) => {
	messages.value = [...messages.value, line].slice(-4);
};

const home = useFocus({ id: 'home', autoFocus: true });
const search = useFocus({ id: 'search' });
const cartActive = ref(true);
const cart = useFocus({ id: 'cart', isActive: cartActive });
const account = useFocus({ id: 'account' });

const buttons = computed(() => [
	{ label: 'Home', focus: home },
	{ label: 'Search', focus: search },
	{ label: `Cart${cartActive.value ? '' : ' (off)'}`, focus: cart },
	{ label: 'Account', focus: account },
]);

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) {
		exit();
		return;
	}
	if (key.return) {
		log(`activated → ${manager.activeId.value ?? '(none)'}`);
		return;
	}
	if (input === 'd') {
		cartActive.value = !cartActive.value;
		log(`cart ${cartActive.value ? 'enabled' : 'disabled'}`);
		return;
	}
	if (input === 'x') {
		manager.disableFocus();
		log('focus disabled');
		return;
	}
	if (input === 'e') {
		manager.enableFocus();
		log('focus enabled');
		return;
	}
	if (input === '1') manager.focus('home');
	if (input === '2') manager.focus('search');
	if (input === '3') manager.focus('cart');
	if (input === '4') manager.focus('account');
});
</script>

<template>
	<Box flexDirection="column">
		<Text bold color="cyan">useFocus / useFocusManager demo</Text>
		<Text dimColor>Tab / Shift+Tab to cycle · Enter to "activate" · 1-4 jump · d toggles cart · x/e disable/enable focus · q to quit</Text>

		<Box :marginTop="1" :gap="2">
			<Box
				v-for="btn in buttons"
				:key="btn.label"
				borderStyle="round"
				:borderColor="btn.focus.isFocused.value ? 'green' : 'gray'"
				:paddingX="2"
			>
				<Text :bold="btn.focus.isFocused.value" :color="btn.focus.isFocused.value ? 'green' : undefined">
					{{ btn.label }}
				</Text>
			</Box>
		</Box>

		<Box :marginTop="1" flexDirection="column">
			<Text>activeId: <Text color="yellow">{{ manager.activeId.value ?? '(none)' }}</Text></Text>
		</Box>

		<Box :marginTop="1" flexDirection="column">
			<Text dimColor>log:</Text>
			<Text v-for="(line, idx) in messages" :key="idx" color="magenta">  · {{ line }}</Text>
			<Text v-if="messages.length === 0" dimColor>  (no events yet)</Text>
		</Box>
	</Box>
</template>
