<script setup>
import { computed, reactive, ref } from 'vue';
import {
	Box,
	Text,
	Newline,
	Spacer,
	Transform,
	useApp,
	useInput,
	usePaste,
	useFocus,
	useFocusManager,
	useStdin,
	useStdout,
	useStderr,
	useWindowSize,
	useIsScreenReaderEnabled,
} from 'vue-ink';

const { exit } = useApp();
const { columns, rows } = useWindowSize();
const { isRawModeSupported } = useStdin();
const stdout = useStdout();
const stderr = useStderr();
const isScreenReader = useIsScreenReaderEnabled();
const manager = useFocusManager();

const columnIds = ['todo', 'doing', 'done'];
const columnLabels = { todo: 'TODO', doing: 'DOING', done: 'DONE' };
const columnColors = { todo: 'red', doing: 'yellow', done: 'green' };

const focusables = {
	todo: useFocus({ id: 'todo', autoFocus: true }),
	doing: useFocus({ id: 'doing' }),
	done: useFocus({ id: 'done' }),
};

const board = reactive({
	todo: ['ship vue-ink v0.1', 'write more demos', 'sleep more'],
	doing: ['port useFocus tests'],
	done: ['migrate to /composables folder'],
});

const cursor = reactive({ todo: 0, doing: 0, done: 0 });
const lastAction = ref('start moving tasks around');
const pasteMode = ref(false);
const lastPasteSize = ref(0);
const taskCounter = ref(1);

const activeId = computed(() => {
	const id = manager.activeId.value;
	return id && columnIds.includes(id) ? id : 'todo';
});

const totals = computed(() => ({
	todo: board.todo.length,
	doing: board.doing.length,
	done: board.done.length,
	all: board.todo.length + board.doing.length + board.done.length,
}));

const log = (line) => {
	lastAction.value = line;
};

const clamp = (col) => {
	const max = Math.max(board[col].length - 1, 0);
	cursor[col] = Math.min(Math.max(cursor[col], 0), max);
};

const moveTask = (from, dir) => {
	if (board[from].length === 0) return;
	const idx = columnIds.indexOf(from);
	const targetIdx = idx + dir;
	if (targetIdx < 0 || targetIdx >= columnIds.length) return;
	const to = columnIds[targetIdx];
	const [task] = board[from].splice(cursor[from], 1);
	board[to].push(task);
	cursor[to] = board[to].length - 1;
	clamp(from);
	log(`moved "${task}" → ${columnLabels[to]}`);
};

const addTask = (text) => {
	const trimmed = text.trim();
	const nextNumber = taskCounter.value;
	taskCounter.value += 1;
	const value = trimmed || `new task #${nextNumber}`;
	const col = activeId.value;
	board[col].push(value);
	cursor[col] = board[col].length - 1;
	log(`added "${value}" to ${columnLabels[col]}`);
};

const removeTask = () => {
	const col = activeId.value;
	if (board[col].length === 0) {
		stderr.write(`! nothing to remove in ${columnLabels[col]}\n`);
		log('nothing to remove');
		return;
	}
	const [task] = board[col].splice(cursor[col], 1);
	clamp(col);
	log(`removed "${task}"`);
};

usePaste((text) => {
	if (!pasteMode.value) {
		log('paste ignored — press p to enable paste mode');
		return;
	}
	const lines = text
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
	for (const line of lines) addTask(line);
	lastPasteSize.value = text.length;
});

useInput((input, key) => {
	if (input === 'q' || key.escape) {
		exit();
		return;
	}
	if (input === '1') {
		manager.focus('todo');
		return;
	}
	if (input === '2') {
		manager.focus('doing');
		return;
	}
	if (input === '3') {
		manager.focus('done');
		return;
	}
	const col = activeId.value;
	if (key.upArrow || input === 'k') {
		cursor[col] = Math.max(cursor[col] - 1, 0);
		return;
	}
	if (key.downArrow || input === 'j') {
		cursor[col] = Math.min(cursor[col] + 1, Math.max(board[col].length - 1, 0));
		return;
	}
	if (key.leftArrow || input === 'h') {
		moveTask(col, -1);
		return;
	}
	if (key.rightArrow || input === 'l') {
		moveTask(col, +1);
		return;
	}
	if (input === 'n') {
		addTask('');
		return;
	}
	if (input === 'x') {
		removeTask();
		return;
	}
	if (input === 'p') {
		pasteMode.value = !pasteMode.value;
		log(pasteMode.value ? 'paste mode ON — paste text to add tasks' : 'paste mode off');
		return;
	}
	if (input === 's') {
		const t = totals.value;
		stdout.write(
			`[summary] ${t.all} task(s) · todo=${t.todo} doing=${t.doing} done=${t.done}\n`,
		);
		log('printed summary above the UI');
	}
});

const upper = (text) => text.toUpperCase();
const banner = (text, idx) => (idx === 0 ? `┃ ${text}` : `  ${text}`);
</script>

<template>
	<Box flexDirection="column" :width="Math.max(columns, 60)">
		<Box justifyContent="space-between" :paddingX="1">
			<Transform :transform="upper">
				<Text bold color="cyan">vue-ink kanban</Text>
			</Transform>
			<Spacer />
			<Text dimColor>
				{{ columns }}×{{ rows }} · raw={{ isRawModeSupported ? 'yes' : 'no' }} · SR={{ isScreenReader ? 'on' : 'off' }}
			</Text>
		</Box>

		<Box v-if="isScreenReader" :paddingX="1">
			<Text dimColor italic>
				screen-reader mode — tasks are read sequentially per column
			</Text>
		</Box>

		<Box :marginTop="1" :gap="1">
			<Box
				v-for="col in columnIds"
				:key="col"
				flexDirection="column"
				borderStyle="round"
				:borderColor="focusables[col].isFocused.value ? columnColors[col] : 'gray'"
				:borderDimColor="!focusables[col].isFocused.value"
				:paddingX="1"
				:flexGrow="1"
				:minWidth="18"
			>
				<Box justifyContent="space-between">
					<Text :bold="focusables[col].isFocused.value" :color="columnColors[col]">
						{{ columnLabels[col] }}
					</Text>
					<Spacer />
					<Text dimColor>({{ totals[col] }})</Text>
				</Box>

				<Box flexDirection="column" :marginTop="1">
					<Box v-if="board[col].length === 0">
						<Text dimColor italic>— empty —</Text>
					</Box>
					<Box
						v-for="(task, i) in board[col]"
						:key="i"
					>
						<Text
							:color="focusables[col].isFocused.value && i === cursor[col] ? 'black' : undefined"
							:backgroundColor="focusables[col].isFocused.value && i === cursor[col] ? columnColors[col] : undefined"
							:bold="focusables[col].isFocused.value && i === cursor[col]"
							:strikethrough="col === 'done'"
							:dimColor="col === 'done'"
						>
							{{ ' ' + String(i + 1).padStart(2, ' ') + '. ' + task + ' ' }}
						</Text>
					</Box>
				</Box>
			</Box>
		</Box>

		<Box
			:marginTop="1"
			flexDirection="column"
			borderStyle="single"
			borderColor="cyan"
			:paddingX="1"
		>
			<Box justifyContent="space-between">
				<Text bold>activity</Text>
				<Spacer />
				<Text :color="pasteMode ? 'magenta' : 'gray'" :inverse="pasteMode">
					{{ pasteMode ? ' PASTE MODE ' : ' paste off ' }}
				</Text>
			</Box>
			<Text>
				focused: <Text color="yellow" bold>{{ columnLabels[activeId] }}</Text>
				· total: <Text color="green">{{ totals.all }}</Text>
				· last paste: <Text dimColor>{{ lastPasteSize }} chars</Text>
			</Text>
			<Text>
				last action: <Text color="magenta">{{ lastAction }}</Text>
			</Text>
		</Box>

		<Box :marginTop="1" :paddingX="1" flexDirection="column">
			<Transform :transform="banner">
				<Text dimColor>
					tab / shift+tab cycle columns · 1·2·3 jump · j/k or ↑/↓ select<Newline />h/l or ←/→ move task across columns · n add · x delete<Newline />p toggle paste · s write summary to stdout · q / esc quit
				</Text>
			</Transform>
		</Box>
	</Box>
</template>
