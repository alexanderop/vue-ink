<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Box, Text, Spacer, useApp, useAnimation, useInput } from 'vueink';

type Cell = { x: number; y: number };
type Direction = { x: number; y: number };
type GameState = 'playing' | 'over' | 'paused';
type CellKind = 'head' | 'body' | 'food' | null;

const { exit } = useApp();

const WIDTH = 26;
const HEIGHT = 14;

const initialSnake = (): Cell[] => [
	{ x: 6, y: 7 },
	{ x: 5, y: 7 },
	{ x: 4, y: 7 },
];

const snake = ref<Cell[]>(initialSnake());
const direction = ref<Direction>({ x: 1, y: 0 });
const pendingDirection = ref<Direction>({ x: 1, y: 0 });
const food = reactive<Cell>({ x: 16, y: 7 });
const score = ref(0);
const best = ref(0);
const state = ref<GameState>('playing');

const SPEED_MS = 110;
const { frame: tickFrame, reset: resetTick } = useAnimation({
	interval: SPEED_MS,
	isActive: () => state.value === 'playing',
});

const spawnFood = () => {
	while (true) {
		const x = Math.floor(Math.random() * WIDTH);
		const y = Math.floor(Math.random() * HEIGHT);
		if (!snake.value.some((s) => s.x === x && s.y === y)) {
			food.x = x;
			food.y = y;
			return;
		}
	}
};

const step = () => {
	direction.value = pendingDirection.value;
	const [head] = snake.value;
	const next = { x: head.x + direction.value.x, y: head.y + direction.value.y };

	if (next.x < 0 || next.x >= WIDTH || next.y < 0 || next.y >= HEIGHT) {
		state.value = 'over';
		return;
	}
	if (snake.value.some((s) => s.x === next.x && s.y === next.y)) {
		state.value = 'over';
		return;
	}

	const ate = next.x === food.x && next.y === food.y;
	const body = ate ? snake.value : snake.value.slice(0, -1);
	snake.value = [next, ...body];

	if (ate) {
		score.value += 10;
		if (score.value > best.value) best.value = score.value;
		spawnFood();
	}
};

watch(tickFrame, (val, old) => {
	if (val !== old && state.value === 'playing') step();
});

const restart = () => {
	snake.value = initialSnake();
	direction.value = { x: 1, y: 0 };
	pendingDirection.value = { x: 1, y: 0 };
	score.value = 0;
	spawnFood();
	state.value = 'playing';
	resetTick();
};

const trySetDirection = (dx: number, dy: number) => {
	// Can't reverse onto yourself
	if (dx === -direction.value.x && dy === -direction.value.y) return;
	pendingDirection.value = { x: dx, y: dy };
};

useInput((input, key) => {
	if (input === 'q' || (key.ctrl && input === 'c')) {
		exit();
		return;
	}
	if (state.value === 'over') {
		if (input === 'r' || key.return) restart();
		return;
	}
	if (input === 'p' || input === ' ') {
		state.value = state.value === 'paused' ? 'playing' : 'paused';
		return;
	}
	if (key.upArrow || input === 'k' || input === 'w') trySetDirection(0, -1);
	else if (key.downArrow || input === 'j' || input === 's') trySetDirection(0, 1);
	else if (key.leftArrow || input === 'h' || input === 'a') trySetDirection(-1, 0);
	else if (key.rightArrow || input === 'l' || input === 'd') trySetDirection(1, 0);
});

const EMPTY_CELL = '  ';
const SNAKE_BODY = '██';
const SNAKE_HEAD = '██';
const FOOD_CELL = '◆ ';

const rows = computed<CellKind[][]>(() => {
	const grid: CellKind[][] = Array.from({ length: HEIGHT }, () =>
		Array<CellKind>(WIDTH).fill(null),
	);
	for (const [i, s] of snake.value.entries()) {
		grid[s.y][s.x] = i === 0 ? 'head' : 'body';
	}
	grid[food.y][food.x] ??= 'food';
	return grid;
});

const cellChar = (kind: CellKind): string => {
	if (kind === 'food') return FOOD_CELL;
	if (kind === 'head') return SNAKE_HEAD;
	if (kind === 'body') return SNAKE_BODY;
	return EMPTY_CELL;
};

const cellColor = (kind: CellKind): string | undefined => {
	if (kind === 'food') return 'red';
	if (kind === 'head') return 'greenBright';
	if (kind === 'body') return 'green';
	return undefined;
};

const length = computed(() => snake.value.length);
</script>

<template>
	<Box flexDirection="column" :paddingX="1">
		<Box>
			<Text bold color="green">🐍 vue-ink snake</Text>
			<Spacer />
			<Text>score: <Text color="yellow" bold>{{ score }}</Text></Text>
			<Text dimColor>  ·  </Text>
			<Text>best: <Text color="cyan">{{ best }}</Text></Text>
			<Text dimColor>  ·  </Text>
			<Text>len: <Text color="green">{{ length }}</Text></Text>
		</Box>

		<Box
			:marginTop="1"
			flexDirection="column"
			borderStyle="round"
			:borderColor="state === 'over' ? 'red' : state === 'paused' ? 'yellow' : 'green'"
		>
			<Box v-for="(row, y) in rows" :key="y">
				<Text v-for="(cell, x) in row" :key="x" :color="cellColor(cell)">{{ cellChar(cell) }}</Text>
			</Box>
		</Box>

		<Box :marginTop="1" flexDirection="column">
			<Box v-if="state === 'playing'">
				<Text dimColor>arrows / hjkl / wasd · space pause · q quit</Text>
			</Box>
			<Box v-else-if="state === 'paused'">
				<Text color="yellow" bold>⏸ paused</Text>
				<Text dimColor> — space to resume</Text>
			</Box>
			<Box v-else>
				<Text color="red" bold>game over</Text>
				<Text dimColor> — r or enter to restart · q quit</Text>
			</Box>
		</Box>
	</Box>
</template>
