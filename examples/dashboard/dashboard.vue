<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
	Box,
	Text,
	Spacer,
	useApp,
	useAnimation,
	useInput,
	useWindowSize,
} from 'vueink';
import type { Key } from 'vueink';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogLine = { level: LogLevel; text: string };
type LogEntry = LogLine & { time: string; id: number };
type Job = { name: string; progress: number; speed: number; color: string };

const { exit } = useApp();
const { columns } = useWindowSize();

const paused = ref(false);
const { frame: spinnerFrame } = useAnimation({ interval: 80, isActive: () => !paused.value });
const { frame: metricsFrame } = useAnimation({ interval: 500, isActive: () => !paused.value });
const { frame: logFrame } = useAnimation({ interval: 700, isActive: () => !paused.value });

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const SPARK_WIDTH = 32;

const metrics = reactive<{ cpu: number[]; mem: number[]; net: number[] }>({
	cpu: Array.from({ length: SPARK_WIDTH }, () => 0.3),
	mem: Array.from({ length: SPARK_WIDTH }, () => 0.5),
	net: Array.from({ length: SPARK_WIDTH }, () => 0.2),
});

const seeds = { cpu: 1, mem: 2, net: 3 };

const tick = (series: number[], seed: number, low: number, high: number) => {
	const prev = series[series.length - 1];
	const t = metricsFrame.value;
	const wave = (Math.sin((t + seed) * 0.4) + 1) / 2;
	const jitter = (Math.sin(t * 1.7 + seed * 3) + Math.cos(t * 0.9 + seed)) * 0.08;
	const target = low + (high - low) * wave + jitter;
	const next = Math.max(0, Math.min(1, prev * 0.6 + target * 0.4));
	series.push(next);
	if (series.length > SPARK_WIDTH) series.shift();
};

watch(metricsFrame, () => {
	tick(metrics.cpu, seeds.cpu, 0.1, 0.95);
	tick(metrics.mem, seeds.mem, 0.4, 0.85);
	tick(metrics.net, seeds.net, 0.05, 0.7);
});

const sparkline = (series: number[]): string =>
	series
		.map((v) => SPARK_CHARS[Math.min(SPARK_CHARS.length - 1, Math.floor(v * SPARK_CHARS.length))])
		.join('');

const latest = (series: number[]): number => Math.round(series[series.length - 1] * 100);

const jobs = reactive<Job[]>([
	{ name: 'build:packages', progress: 0, speed: 0.018, color: 'cyan' },
	{ name: 'test:unit', progress: 0.12, speed: 0.013, color: 'green' },
	{ name: 'deploy:edge', progress: 0.4, speed: 0.007, color: 'magenta' },
	{ name: 'index:search', progress: 0.7, speed: 0.004, color: 'yellow' },
]);

watch(metricsFrame, () => {
	for (const job of jobs) {
		job.progress = Math.min(1, job.progress + job.speed);
		if (job.progress >= 1) job.progress = 0;
	}
});

const PROGRESS_WIDTH = 24;

const progressBar = (value: number): string => {
	const filled = Math.round(value * PROGRESS_WIDTH);
	return '█'.repeat(filled) + '░'.repeat(PROGRESS_WIDTH - filled);
};

const LOG_LINES: LogLine[] = [
	{ level: 'info', text: 'GET /api/users 200 — 14ms' },
	{ level: 'info', text: 'cache hit · key=session:abc123' },
	{ level: 'warn', text: 'slow query took 312ms · users.list' },
	{ level: 'info', text: 'POST /api/orders 201 — 41ms' },
	{ level: 'error', text: 'connection reset · upstream redis' },
	{ level: 'info', text: 'job queued · build:packages' },
	{ level: 'debug', text: 'gc cycle freed 4.2MB' },
	{ level: 'info', text: 'edge fn cold start 84ms' },
	{ level: 'warn', text: 'retry 2/3 · stripe.charges.create' },
	{ level: 'info', text: 'webhook delivered · github:push' },
];

const logs = ref<LogEntry[]>([]);
watch(logFrame, () => {
	const idx = logFrame.value % LOG_LINES.length;
	const entry = LOG_LINES[idx];
	const time = new Date().toLocaleTimeString();
	logs.value = [{ ...entry, time, id: Math.random() }, ...logs.value].slice(0, 6);
});

const levelColor = (level: LogLevel): string =>
	({ info: 'cyan', warn: 'yellow', error: 'red', debug: 'gray' })[level] ?? 'white';

const spinner = computed(() => SPINNER_FRAMES[spinnerFrame.value % SPINNER_FRAMES.length]);

useInput((input: string, key: Key) => {
	if (input === 'q' || key.escape) exit();
	if (input === ' ') paused.value = !paused.value;
});

const minWidth = computed(() => Math.max(columns.value, 80));
</script>

<template>
	<Box flexDirection="column" :width="minWidth" :paddingX="1">
		<Box>
			<Text bold color="cyan">⚡ vue-ink ops dashboard</Text>
			<Spacer />
			<Text :color="paused ? 'yellow' : 'green'">{{ paused ? '⏸ paused' : `${spinner} live` }}</Text>
		</Box>

		<Box :marginTop="1" :gap="1">
			<Box
				v-for="m in [
					{ label: 'CPU', key: 'cpu', color: 'red', series: metrics.cpu, suffix: '%' },
					{ label: 'MEM', key: 'mem', color: 'magenta', series: metrics.mem, suffix: '%' },
					{ label: 'NET', key: 'net', color: 'cyan', series: metrics.net, suffix: 'Mb/s' },
				]"
				:key="m.key"
				flexDirection="column"
				borderStyle="round"
				:borderColor="m.color"
				:paddingX="1"
				:flexGrow="1"
			>
				<Box>
					<Text bold :color="m.color">{{ m.label }}</Text>
					<Spacer />
					<Text :color="m.color">{{ latest(m.series) }}{{ m.suffix }}</Text>
				</Box>
				<Text :color="m.color">{{ sparkline(m.series) }}</Text>
			</Box>
		</Box>

		<Box :marginTop="1" borderStyle="single" borderColor="cyan" flexDirection="column" :paddingX="1">
			<Text bold>jobs</Text>
			<Box v-for="job in jobs" :key="job.name" :marginTop="0">
				<Text :color="job.color">{{ progressBar(job.progress) }}</Text>
				<Text> </Text>
				<Text>{{ String(Math.round(job.progress * 100)).padStart(3, ' ') }}%</Text>
				<Text dimColor>  ·  </Text>
				<Text>{{ job.name }}</Text>
			</Box>
		</Box>

		<Box :marginTop="1" borderStyle="single" borderColor="gray" flexDirection="column" :paddingX="1">
			<Text bold>recent logs</Text>
			<Box v-if="logs.length === 0">
				<Text dimColor italic>waiting for events…</Text>
			</Box>
			<Box v-for="entry in logs" :key="entry.id">
				<Text dimColor>{{ entry.time }} </Text>
				<Text :color="levelColor(entry.level)" bold>[{{ entry.level.padEnd(5) }}]</Text>
				<Text> {{ entry.text }}</Text>
			</Box>
		</Box>

		<Box :marginTop="1">
			<Text dimColor>space pause · q / esc quit</Text>
		</Box>
	</Box>
</template>
