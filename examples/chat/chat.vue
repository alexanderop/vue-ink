<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import {
  Box,
  Text,
  Spacer,
  useApp,
  useAnimation,
  useCursor,
  useInput,
  usePaste,
  useWindowSize,
} from "vueink";
import type { Key } from "vueink";

const MESSAGES_MIN_HEIGHT = 12;

type Role = "system" | "user" | "bot" | "action";
type Message = { role: Role; text: string; id: number };

const { exit } = useApp();
const { columns } = useWindowSize();
const { setCursorPosition } = useCursor();

const draft = ref("");
const messages = ref<Message[]>([
  { role: "system", text: "welcome to vue-ink chat. type /help for commands.", id: 0 },
]);
let nextId = 1;
const typingFromBot = ref(false);

const { frame: typingFrame } = useAnimation({ interval: 120, isActive: () => typingFromBot.value });
const TYPING_FRAMES = ["◐", "◓", "◑", "◒"];

const PROMPT = "› ";

const append = (role: Role, text: string) => {
  const id = nextId;
  nextId += 1;
  messages.value = [...messages.value, { role, text, id }];
};

const BOT_REPLIES = [
  "interesting — tell me more.",
  "ack. logged that.",
  "noted. what next?",
  "sounds reasonable.",
  "shipping it 🚀",
  "have you considered the opposite?",
  "+1",
  "tldr?",
];

const botReply = (userText: string) => {
  typingFromBot.value = true;
  setTimeout(
    () => {
      const reply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      append("bot", userText.length > 60 ? "whoa, novella." : reply);
      typingFromBot.value = false;
    },
    600 + Math.random() * 600,
  );
};

const handleCommand = (cmd: string): boolean => {
  const [name, ...args] = cmd.slice(1).split(/\s+/);
  switch (name) {
    case "help":
      append("system", "commands: /help · /clear · /quit · /me <action> · /name <name>");
      return true;
    case "clear":
      messages.value = [];
      return true;
    case "quit":
    case "q":
    case "exit":
      exit();
      return true;
    case "me":
      append("action", `* you ${args.join(" ") || "wave"}`);
      return true;
    case "name":
      append("system", `(renaming is just for show — hi, ${args.join(" ") || "friend"}!)`);
      return true;
    default:
      append("system", `unknown command: /${name}`);
      return true;
  }
};

const submit = () => {
  const trimmed = draft.value;
  if (!trimmed) return;
  if (trimmed.startsWith("/")) {
    handleCommand(trimmed);
  } else {
    append("user", trimmed);
    botReply(trimmed);
  }
  draft.value = "";
};

useInput((input: string, key: Key) => {
  if (key.return) {
    submit();
    return;
  }
  if (key.backspace || key.delete) {
    draft.value = draft.value.slice(0, -1);
    return;
  }
  if (key.ctrl && input === "c") {
    exit();
    return;
  }
  if (key.escape) {
    exit();
    return;
  }
  if (!key.ctrl && !key.meta && input) {
    draft.value += input;
  }
});

usePaste((text: string) => {
  draft.value += text.replace(/\n/g, " ");
});

const visibleMessages = computed(() => messages.value.slice(-12));

// Layout: title(1) + marginTop(1) + messages(≥MESSAGES_MIN_HEIGHT) + marginTop(1) + topBorder(1)
// → cursor lands on the prompt content row. Messages box has minHeight, so it
// only grows past it when the typing indicator pushes a full 12-message list.
const promptY = computed(() => {
  const contentHeight = visibleMessages.value.length + (typingFromBot.value ? 1 : 0);
  const messagesHeight = Math.max(MESSAGES_MIN_HEIGHT, contentHeight);
  return 1 + 1 + messagesHeight + 1 + 1;
});

// X: outer paddingX(1) + border(1) + inner paddingX(1) + prompt + draft
watchEffect(() => {
  setCursorPosition({ x: 3 + PROMPT.length + draft.value.length, y: promptY.value });
});

const roleColor = (role: Role): string =>
  ({ user: "green", bot: "cyan", system: "yellow", action: "magenta" })[role] ?? "white";

const roleLabel = (role: Role): string =>
  ({ user: "you", bot: "bot", system: "sys", action: "·" })[role] ?? role;

const minWidth = computed(() => Math.max(columns.value, 60));
</script>

<template>
  <Box flexDirection="column" :width="minWidth" :paddingX="1">
    <Box>
      <Text bold color="cyan"># vue-ink-chat</Text>
      <Spacer />
      <Text dimColor>enter send · /help · esc quit</Text>
    </Box>

    <Box :marginTop="1" flexDirection="column" :minHeight="12">
      <Box v-for="m in visibleMessages" :key="m.id">
        <Text :color="roleColor(m.role)" bold>{{ roleLabel(m.role).padEnd(4) }}</Text>
        <Text> </Text>
        <Text :italic="m.role === 'action'" :dimColor="m.role === 'system'">{{ m.text }}</Text>
      </Box>
      <Box v-if="typingFromBot">
        <Text color="black" bold>bot </Text>
        <Text dimColor> {{ TYPING_FRAMES[typingFrame % TYPING_FRAMES.length] }} typing…</Text>
      </Box>
    </Box>

    <Box :marginTop="1" borderStyle="round" borderColor="green" :paddingX="1">
      <Text color="green">{{ PROMPT }}</Text>
      <Text>{{ draft }}</Text>
    </Box>
  </Box>
</template>
