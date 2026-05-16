<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	Box,
	Text,
	Static,
	Spacer,
	useApp,
	useAnimation,
	useInput,
} from 'vueink';
import type { Key } from 'vueink';

type Suite = { file: string; tests: string[] };
type Test = { id: string; suite: string; title: string; willFail: boolean; durationMs: number };
type CompletedTest = Test & { passed: boolean };

const { exit } = useApp();

const SUITES: Suite[] = [
	{ file: 'packages/renderer/src/output/index.test.ts', tests: ['emits initial frame', 'overwrites previous frame', 'handles ANSI escapes', 'truncates on narrow width'] },
	{ file: 'packages/renderer/src/yoga/index.test.ts', tests: ['computes flex layout', 'respects gap', 'reflows on resize'] },
	{ file: 'packages/renderer/src/composables/useFocus/index.test.ts', tests: ['Tab cycles focusables', 'autoFocus first focusable', 'disableFocus blocks Tab', 'focus(id) jumps directly'] },
	{ file: 'packages/renderer/src/composables/useInput/index.test.ts', tests: ['delivers keypresses', 'parses Kitty CSI', 'ignores when disabled'] },
	{ file: 'packages/renderer/src/composables/useAnimation/index.test.ts', tests: ['advances frame counter', 'pauses when isActive=false', 'resets on toggle'] },
	{ file: 'packages/components/src/Box.test.ts', tests: ['renders children', 'applies borders', 'propagates style'] },
	{ file: 'packages/components/src/Text.test.ts', tests: ['flattens nested text', 'wraps on width', 'applies inverse'] },
	{ file: 'packages/components/src/Static.test.ts', tests: ['dedups committed items', 'preserves order on append'] },
];

const ALL_TESTS: Test[] = SUITES.flatMap((suite) =>
	suite.tests.map((title, i): Test => ({
		id: `${suite.file}:${i}`,
		suite: suite.file,
		title,
		// 1-in-12 fail rate, scattered, for visual variety
		willFail: Math.random() < 0.08,
		durationMs: 12 + Math.floor(Math.random() * 180),
	})),
);

const completed = ref<CompletedTest[]>([]);
const currentIndex = ref(0);
const running = ref(true);
const startedAt = Date.now();

const total = ALL_TESTS.length;
const failed = computed(() => completed.value.filter((t) => !t.passed).length);
const passed = computed(() => completed.value.filter((t) => t.passed).length);

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const { frame } = useAnimation({ interval: 80, isActive: () => running.value });
const spinner = computed(() => SPINNER[frame.value % SPINNER.length]);

const { frame: tickFrame } = useAnimation({ interval: 220, isActive: () => running.value });
watch(tickFrame, () => {
	if (!running.value) return;
	const next = ALL_TESTS[currentIndex.value];
	if (!next) {
		running.value = false;
		return;
	}
	completed.value = [...completed.value, { ...next, passed: !next.willFail }];
	currentIndex.value += 1;
	if (currentIndex.value >= ALL_TESTS.length) {
		running.value = false;
	}
});

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit();
});

const PROGRESS_WIDTH = 32;
const progress = computed(() => {
	const ratio = completed.value.length / total;
	const filled = Math.round(ratio * PROGRESS_WIDTH);
	return '█'.repeat(filled) + '░'.repeat(PROGRESS_WIDTH - filled);
});

const currentSuite = computed(() => ALL_TESTS[currentIndex.value]?.suite ?? '');
const currentTitle = computed(() => ALL_TESTS[currentIndex.value]?.title ?? '');

const elapsed = computed(() => {
	// Touch the spinner frame so this re-runs ~10×/s without its own timer.
	void frame.value;
	const s = Math.floor((Date.now() - startedAt) / 1000);
	return `${s}s`;
});
</script>

<template>
	<Box flexDirection="column">
		<Static :items="completed">
			<template #default="{ item }">
				<Box :paddingX="1">
					<Text :color="item.passed ? 'green' : 'red'" bold>
						{{ item.passed ? '✓' : '✗' }}
					</Text>
					<Text> </Text>
					<Text dimColor>{{ item.suite }}</Text>
					<Text dimColor> › </Text>
					<Text>{{ item.title }}</Text>
					<Text dimColor> ({{ item.durationMs }}ms)</Text>
				</Box>
			</template>
		</Static>

		<Box flexDirection="column" :marginTop="1" borderStyle="round" :borderColor="running ? 'cyan' : failed > 0 ? 'red' : 'green'" :paddingX="1">
			<Box>
				<Text v-if="running" color="cyan" bold>{{ spinner }} running</Text>
				<Text v-else-if="failed > 0" color="red" bold>✗ failed</Text>
				<Text v-else color="green" bold>✓ all passed</Text>
				<Spacer />
				<Text dimColor>{{ elapsed }}</Text>
			</Box>

			<Box v-if="running" :marginTop="1">
				<Text dimColor>{{ currentSuite }} › </Text>
				<Text>{{ currentTitle }}</Text>
			</Box>

			<Box :marginTop="1">
				<Text color="cyan">{{ progress }}</Text>
				<Text>  {{ completed.length }}/{{ total }}</Text>
			</Box>

			<Box :marginTop="1">
				<Text color="green">{{ passed }} passed</Text>
				<Text dimColor> · </Text>
				<Text :color="failed > 0 ? 'red' : 'gray'">{{ failed }} failed</Text>
				<Spacer />
				<Text dimColor>q / esc to quit</Text>
			</Box>
		</Box>
	</Box>
</template>
