import { describe, it, expect, beforeAll } from "vitest";
import { defineComponent, h, onMounted, ref, watch } from "vue";
import { Box, Text, render, useInput, useStderr, useStdout } from "../src/index.ts";
// `useCursor` is the missing port from react-ink. Tests below are TDD-style:
// they document the desired API and currently fail because `useCursor` is
// not exported. See brain/porting/from-react-ink.md.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VueInkApi = (await import("../src/index.ts")) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useCursor: () => {
  setCursorPosition: (pos: { x: number; y: number } | undefined) => void;
} = VueInkApi.useCursor ?? (() => ({ setCursorPosition: () => {} }));

beforeAll(() => {
  expect(
    typeof VueInkApi.useCursor,
    "useCursor must be exported from @vue-ink/renderer (currently missing — see brain/porting/from-react-ink.md)",
  ).toBe("function");
});
import { createCaptureStream, createFakeStdin, flush } from "./helpers.ts";

// Ported from repos/ink/test/cursor.tsx — adapted to vue-ink's
// createCaptureStream + createFakeStdin pattern.

const showCursorEscape = "[?25h";
const hideCursorEscape = "[?25l";
const cursorToColumn = (x: number): string => `[${x + 1}G`;

const InputApp = defineComponent({
  setup() {
    const text = ref("");
    const { setCursorPosition } = useCursor();

    useInput((input, key) => {
      if (key.backspace || key.delete) {
        text.value = text.value.slice(0, -1);
        return;
      }
      if (!key.ctrl && !key.meta && input) {
        text.value += input;
      }
    });

    return () => {
      setCursorPosition({ x: 2 + text.value.length, y: 0 });
      return h(Box, null, () => h(Text, null, () => `> ${text.value}`));
    };
  },
});

describe("useCursor", () => {
  it("cursor is shown at the specified position after first render", async () => {
    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(InputApp, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    const out = stdout.frames.join("");
    expect(out).toContain(showCursorEscape);
    expect(out).toContain(cursorToColumn(2));
    instance.unmount();
  });

  it("cursor follows text input", async () => {
    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(InputApp, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    stdin.emitData("a");
    await flush();

    const out = stdout.frames.join("");
    expect(out).toContain(showCursorEscape);
    expect(out).toContain(cursorToColumn(3));
    instance.unmount();
  });

  it("last cursor visibility escape is SHOW, not HIDE, after first render", async () => {
    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(InputApp, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    const out = stdout.frames.join("");
    expect(out.lastIndexOf(showCursorEscape)).toBeGreaterThan(out.lastIndexOf(hideCursorEscape));
    instance.unmount();
  });

  it("cursor is hidden when the component calling useCursor unmounts", async () => {
    const CursorChild = defineComponent({
      setup() {
        const { setCursorPosition } = useCursor();
        return () => {
          setCursorPosition({ x: 5, y: 0 });
          return h(Text, null, () => "child");
        };
      },
    });

    const Parent = defineComponent({
      setup() {
        const showChild = ref(true);
        useInput((_input, key) => {
          if (key.return) showChild.value = false;
        });
        return () =>
          h(Box, null, () => (showChild.value ? h(CursorChild) : h(Text, null, () => "no cursor")));
      },
    });

    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(Parent, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    const beforeUnmountFrames = stdout.frames.length;
    const initialOut = stdout.frames.join("");
    expect(initialOut).toContain(showCursorEscape);

    stdin.emitData("\r");
    await flush();

    const tail = stdout.frames.slice(beforeUnmountFrames).join("");
    expect(tail.lastIndexOf(hideCursorEscape)).toBeGreaterThan(tail.lastIndexOf(showCursorEscape));
    instance.unmount();
  });

  it("cursor moves on space input even when output is identical", async () => {
    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(InputApp, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    stdin.emitData("a");
    await flush();
    const framesAfterA = stdout.frames.length;

    stdin.emitData(" ");
    await flush();

    expect(stdout.frames.length).toBeGreaterThan(framesAfterA);
    // After "a ", cursor should be at column 4 ("> a " = 4 chars).
    const allOut = stdout.frames.join("");
    expect(allOut).toContain(cursorToColumn(4));
    instance.unmount();
  });

  it("multi-line output: cursor positioned at y=1 does not scroll the screen on rerender", async () => {
    const MultiLineApp = defineComponent({
      setup() {
        const text = ref("");
        const { setCursorPosition } = useCursor();
        useInput((input, key) => {
          if (!key.ctrl && !key.meta && input) text.value += input;
        });
        return () => {
          setCursorPosition({ x: 2 + text.value.length, y: 1 });
          return h(Box, { flexDirection: "column" }, () => [
            h(Text, null, () => "Header"),
            h(Text, null, () => `> ${text.value}`),
          ]);
        };
      },
    });

    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(MultiLineApp, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    const beforeInputFrames = stdout.frames.length;
    stdin.emitData("x");
    await flush();

    const secondPaint = stdout.frames.slice(beforeInputFrames).join("");
    expect(secondPaint).toContain(hideCursorEscape);
    expect(secondPaint).toContain("x");
    instance.unmount();
  });

  it("cursor remains visible after useStdout().write()", async () => {
    const StdoutWriteApp = defineComponent({
      setup() {
        const { setCursorPosition } = useCursor();
        const { write } = useStdout();
        onMounted(() => {
          write("from stdout hook\n");
        });
        return () => {
          setCursorPosition({ x: 2, y: 0 });
          return h(Text, null, () => "Hello");
        };
      },
    });

    const stdout = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(StdoutWriteApp, {
      stdout,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    const out = stdout.frames.join("");
    expect(out).toContain("from stdout hook");
    expect(out.lastIndexOf(showCursorEscape)).toBeGreaterThan(out.lastIndexOf(hideCursorEscape));
    instance.unmount();
  });

  it("cursor remains visible after useStderr().write()", async () => {
    const StderrWriteApp = defineComponent({
      setup() {
        const { setCursorPosition } = useCursor();
        const { write } = useStderr();
        onMounted(() => {
          write("from stderr hook\n");
        });
        return () => {
          setCursorPosition({ x: 2, y: 0 });
          return h(Text, null, () => "Hello");
        };
      },
    });

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    const stdin = createFakeStdin();
    const instance = render(StderrWriteApp, {
      stdout,
      stderr,
      stdin,
      exitOnCtrlC: false,
      interactive: true,
    });
    await flush();

    expect(stderr.frames.join("")).toContain("from stderr hook");
    const out = stdout.frames.join("");
    expect(out.lastIndexOf(showCursorEscape)).toBeGreaterThan(out.lastIndexOf(hideCursorEscape));
    instance.unmount();
  });

  it("debug mode: useStdout().write() replays latest frame", async () => {
    const DebugStdoutWriteApp = defineComponent({
      setup() {
        const { write } = useStdout();
        onMounted(() => {
          write("from stdout hook\n");
        });
        return () => h(Text, null, () => "Hello");
      },
    });

    const stdout = createCaptureStream();
    const instance = render(DebugStdoutWriteApp, { stdout, debug: true });
    await flush();

    expect(stdout.frames.some((write) => write.includes("from stdout hook\nHello"))).toBe(true);
    expect(stdout.frames).not.toContain("");
    instance.unmount();
  });

  it("debug mode: useStdout().write() does not leak into stderr", async () => {
    const DebugStdoutWriteApp = defineComponent({
      setup() {
        const { write } = useStdout();
        onMounted(() => {
          write("from stdout hook\n");
        });
        return () => h(Text, null, () => "Hello");
      },
    });

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    const instance = render(DebugStdoutWriteApp, { stdout, stderr, debug: true });
    await flush();

    const stderrFrames = stderr.frames;
    expect(stderrFrames.some((write) => write.includes("from stdout hook"))).toBe(false);
    expect(stderrFrames.some((write) => write.includes("Hello"))).toBe(false);
    expect(stderrFrames).not.toContain("");
    instance.unmount();
  });

  it("debug mode: useStderr().write() replays latest frame without empty writes", async () => {
    const DebugStderrWriteApp = defineComponent({
      setup() {
        const { write } = useStderr();
        onMounted(() => {
          write("from stderr hook\n");
        });
        return () => h(Text, null, () => "Hello");
      },
    });

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    const instance = render(DebugStderrWriteApp, { stdout, stderr, debug: true });
    await flush();

    const stdoutFrames = stdout.frames;
    const stderrFrames = stderr.frames;
    const stdoutAfterInitial = stdoutFrames.slice(1);

    expect(stderrFrames.some((write) => write.includes("from stderr hook"))).toBe(true);
    expect(stderrFrames.some((write) => write.includes("Hello"))).toBe(false);
    expect(stdoutAfterInitial.length).toBeGreaterThan(0);
    expect(stdoutAfterInitial.some((write) => write.includes("Hello"))).toBe(true);
    expect(stdoutAfterInitial.some((write) => write.includes("from stderr hook"))).toBe(false);
    expect(stdoutFrames).not.toContain("");
    expect(stderrFrames).not.toContain("");
    instance.unmount();
  });

  it("debug mode: useStdout().write() replays rerendered frame", async () => {
    const DebugStdoutWriteAfterRerenderApp = defineComponent({
      setup() {
        const text = ref("Initial");
        const { write } = useStdout();
        onMounted(() => {
          text.value = "Updated";
        });
        watch(
          text,
          (newValue) => {
            if (newValue === "Updated") write("from stdout hook\n");
          },
          { flush: "post" },
        );
        return () => h(Text, null, () => text.value);
      },
    });

    const stdout = createCaptureStream();
    const instance = render(DebugStdoutWriteAfterRerenderApp, { stdout, debug: true });
    await flush();

    const stdoutFrames = stdout.frames;
    expect(stdoutFrames.some((write) => write.includes("from stdout hook\nUpdated"))).toBe(true);
    expect(stdoutFrames.some((write) => write.includes("from stdout hook\nInitial"))).toBe(false);
    expect(stdoutFrames).not.toContain("");
    instance.unmount();
  });

  it("debug mode: useStderr().write() replays rerendered frame", async () => {
    const DebugStderrWriteAfterRerenderApp = defineComponent({
      setup() {
        const text = ref("Initial");
        const { write } = useStderr();
        onMounted(() => {
          text.value = "Updated";
        });
        watch(
          text,
          (newValue) => {
            if (newValue === "Updated") write("from stderr hook\n");
          },
          { flush: "post" },
        );
        return () => h(Text, null, () => text.value);
      },
    });

    const stdout = createCaptureStream();
    const stderr = createCaptureStream();
    const instance = render(DebugStderrWriteAfterRerenderApp, { stdout, stderr, debug: true });
    await flush();

    const stdoutFrames = stdout.frames;
    const stderrFrames = stderr.frames;
    const stdoutAfterInitial = stdoutFrames.slice(1);

    expect(stderrFrames.some((write) => write.includes("from stderr hook"))).toBe(true);
    expect(stderrFrames.some((write) => write.includes("Updated"))).toBe(false);
    expect(stderrFrames.some((write) => write.includes("Initial"))).toBe(false);
    expect(stdoutAfterInitial.some((write) => write.includes("Updated"))).toBe(true);
    expect(stdoutAfterInitial.some((write) => write.includes("Initial"))).toBe(false);
    expect(stdoutAfterInitial.some((write) => write.includes("from stderr hook"))).toBe(false);
    expect(stdoutFrames).not.toContain("");
    expect(stderrFrames).not.toContain("");
    instance.unmount();
  });
});
