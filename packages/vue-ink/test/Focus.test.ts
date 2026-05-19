import { describe, it, expect } from "vitest";
import { defineComponent, h, ref, watch } from "vue";
import { render } from "@vue-ink/testing-library";
import { Box, Text, useFocus, useFocusManager } from "../src/index.ts";

// Ported from repos/ink/test/focus.tsx. Drives Tab/Shift+Tab/Esc through the
// testing library's fake stdin instead of a PTY.

type TestProps = {
  autoFocus?: boolean;
  showFirst?: boolean;
  disableFirst?: boolean;
  disableSecond?: boolean;
  disableThird?: boolean;
};

const Item = defineComponent({
  props: {
    label: { type: String, required: true as const },
    autoFocus: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    const { isFocused } = useFocus({
      autoFocus: props.autoFocus,
      isActive: () => !props.disabled,
    });
    return () => h(Text, null, () => `${props.label}${isFocused.value ? " ✔" : ""}`);
  },
});

const TestApp = (props: TestProps = {}) =>
  defineComponent({
    setup() {
      useFocusManager();
      return () =>
        h(Box, { flexDirection: "column" }, () => [
          props.showFirst === false
            ? null
            : h(Item, {
                label: "First",
                autoFocus: props.autoFocus ?? false,
                disabled: props.disableFirst ?? false,
              }),
          h(Item, {
            label: "Second",
            autoFocus: props.autoFocus ?? false,
            disabled: props.disableSecond ?? false,
          }),
          h(Item, {
            label: "Third",
            autoFocus: props.autoFocus ?? false,
            disabled: props.disableThird ?? false,
          }),
        ]);
    },
  });

const waitForEscDisambiguation = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 150));
};

describe("focus", () => {
  it("does not auto-focus when autoFocus is off", async () => {
    const { lastFrame, waitUntilFlush } = render(TestApp());
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third"].join("\n"));
  });

  it("focuses the first component when autoFocus is on", async () => {
    const { lastFrame, waitUntilFlush } = render(TestApp({ autoFocus: true }));
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));
  });

  it("switches focus to first component on Tab from empty", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(TestApp());
    await waitUntilFlush();
    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));
  });

  it("unfocuses the active component on Esc", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(TestApp({ autoFocus: true }));
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));

    stdin.write("\u001B");
    await waitForEscDisambiguation();
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third"].join("\n"));
  });

  it("advances to next component on Tab", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(TestApp());
    await waitUntilFlush();
    stdin.write("\t");
    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second ✔", "Third"].join("\n"));
  });

  it("wraps to first component when Tab from last", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(TestApp({ autoFocus: true }));
    await waitUntilFlush();
    stdin.write("\t"); // First → Second
    stdin.write("\t"); // Second → Third
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));

    stdin.write("\t"); // Third → First (wrap)
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));
  });

  it("skips a disabled component on Tab", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(
      TestApp({ autoFocus: true, disableSecond: true }),
    );
    await waitUntilFlush();
    stdin.write("\t"); // First → (skip Second) → Third
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));
  });

  it("switches to previous component on Shift+Tab", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(TestApp({ autoFocus: true }));
    await waitUntilFlush();
    stdin.write("\t"); // First → Second
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second ✔", "Third"].join("\n"));

    stdin.write("[Z"); // Shift+Tab → Second → First
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));
  });

  it("wraps to last component when Shift+Tab from first", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(TestApp({ autoFocus: true }));
    await waitUntilFlush();

    stdin.write("[Z");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));
  });

  it("skips disabled component on Shift+Tab", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(
      TestApp({ autoFocus: true, disableSecond: true }),
    );
    await waitUntilFlush();
    stdin.write("\t"); // First → Third (skip Second)
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));

    stdin.write("[Z"); // Shift+Tab → (skip Second) → First
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));
  });

  it("skips disabled components when wrapping backward from the front", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(
      TestApp({ autoFocus: true, disableThird: true }),
    );
    await waitUntilFlush();

    stdin.write("[Z");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second ✔", "Third"].join("\n"));
  });

  it("exposes activeId from useFocusManager", async () => {
    const observed: Array<string | undefined> = [];
    const Probe = defineComponent({
      setup() {
        const { activeId } = useFocusManager();
        useFocus({ autoFocus: true, id: "alpha" });
        watch(activeId, (id) => observed.push(id), { immediate: true });
        return () => h(Text, null, () => "probe");
      },
    });

    const { waitUntilFlush, unmount } = render(Probe);
    await waitUntilFlush();
    unmount();
    expect(observed.at(-1)).toBe("alpha");
  });

  it("activeId resets to undefined on Esc", async () => {
    const observed: Array<string | undefined> = [];
    const Probe = defineComponent({
      setup() {
        useFocus({ autoFocus: true, id: "alpha" });
        const { activeId } = useFocusManager();
        watch(activeId, (id) => observed.push(id), { immediate: true });
        return () => h(Text, null, () => activeId.value ?? "none");
      },
    });

    const { lastFrame, stdin, waitUntilFlush, unmount } = render(Probe);
    await waitUntilFlush();
    expect(lastFrame()).toBe("alpha");

    stdin.write("\u001B");
    await waitForEscDisambiguation();
    await waitUntilFlush();

    expect(lastFrame()).toBe("none");
    expect(observed).toContain(undefined);
    unmount();
  });

  it("reset focus when focused component unregisters", async () => {
    const showFirst = ref(true);
    const App = defineComponent({
      setup() {
        useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            showFirst.value ? h(Item, { label: "First", autoFocus: true }) : null,
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
      },
    });

    const { lastFrame, waitUntilFlush } = render(App);
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));

    showFirst.value = false;
    await waitUntilFlush();
    expect(lastFrame()).toBe(["Second", "Third"].join("\n"));
  });

  it("focus first component after focused component unregisters", async () => {
    const showFirst = ref(true);
    const App = defineComponent({
      setup() {
        useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            showFirst.value ? h(Item, { label: "First", autoFocus: true }) : null,
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
      },
    });

    const { lastFrame, stdin, waitUntilFlush } = render(App);
    await waitUntilFlush();

    showFirst.value = false;
    await waitUntilFlush();
    expect(lastFrame()).toBe(["Second", "Third"].join("\n"));

    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["Second ✔", "Third"].join("\n"));
  });

  it("toggle focus management", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Item, { label: "First", autoFocus: true }),
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
      },
    });

    const { lastFrame, stdin, waitUntilFlush } = render(App);
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));

    captured.disableFocus();
    await waitUntilFlush();
    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third"].join("\n"));

    captured.enableFocus();
    await waitUntilFlush();
    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));
  });

  it("manually focus next component", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Item, { label: "First", autoFocus: true }),
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
      },
    });

    const { lastFrame, waitUntilFlush } = render(App);
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));

    captured.focusNext();
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second ✔", "Third"].join("\n"));
  });

  it("manually focus previous component", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Item, { label: "First", autoFocus: true }),
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
      },
    });

    const { lastFrame, waitUntilFlush } = render(App);
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First ✔", "Second", "Third"].join("\n"));

    captured.focusPrevious();
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));
  });

  it("does not crash when focusing next on unmounted children", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const showChildren = ref(true);
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () => {
          if (!showChildren.value) return null;
          return h(Box, { flexDirection: "column" }, () => [
            h(Item, { label: "First", autoFocus: true }),
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
        };
      },
    });

    const { lastFrame, waitUntilFlush } = render(App);
    await waitUntilFlush();

    showChildren.value = false;
    await waitUntilFlush();
    expect(() => captured.focusNext()).not.toThrow();
    await waitUntilFlush();
    expect(lastFrame()).toBe("");
  });

  it("does not crash when focusing previous on unmounted children", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const showChildren = ref(true);
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () => {
          if (!showChildren.value) return null;
          return h(Box, { flexDirection: "column" }, () => [
            h(Item, { label: "First", autoFocus: true }),
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
        };
      },
    });

    const { lastFrame, waitUntilFlush } = render(App);
    await waitUntilFlush();

    showChildren.value = false;
    await waitUntilFlush();
    expect(() => captured.focusPrevious()).not.toThrow();
    await waitUntilFlush();
    expect(lastFrame()).toBe("");
  });

  it("focuses first non-disabled component", async () => {
    const { lastFrame, waitUntilFlush } = render(
      TestApp({ autoFocus: true, disableFirst: true, disableSecond: true }),
    );
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));
  });

  it("skips disabled elements when wrapping around", async () => {
    const { lastFrame, stdin, waitUntilFlush } = render(
      TestApp({ autoFocus: true, disableFirst: true }),
    );
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second ✔", "Third"].join("\n"));

    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second", "Third ✔"].join("\n"));

    stdin.write("\t");
    await waitUntilFlush();
    expect(lastFrame()).toBe(["First", "Second ✔", "Third"].join("\n"));
  });

  it("activeId is set immediately when component uses autoFocus", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const Probe = defineComponent({
      setup() {
        captured = useFocusManager();
        useFocus({ autoFocus: true, id: "first" });
        return () => h(Text, null, () => "probe");
      },
    });

    const { waitUntilFlush, unmount } = render(Probe);
    await waitUntilFlush();
    expect(captured.activeId.value).toBe("first");
    unmount();
  });

  it("activeId updates when focus is changed programmatically", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            h(Item, { label: "First", autoFocus: true }),
            h(Item, { label: "Second", autoFocus: true }),
            h(Item, { label: "Third", autoFocus: true }),
          ]);
      },
    });

    const { waitUntilFlush, unmount } = render(App);
    await waitUntilFlush();
    const firstId = captured.activeId.value;
    expect(firstId).toBeDefined();

    captured.focusNext();
    await waitUntilFlush();
    const secondId = captured.activeId.value;
    expect(secondId).toBeDefined();
    expect(secondId).not.toBe(firstId);

    captured.focusPrevious();
    await waitUntilFlush();
    expect(captured.activeId.value).toBe(firstId);
    unmount();
  });

  it("activeId resets to undefined when focused component unmounts", async () => {
    let captured!: ReturnType<typeof useFocusManager>;
    const showFirst = ref(true);
    const App = defineComponent({
      setup() {
        captured = useFocusManager();
        return () =>
          h(Box, { flexDirection: "column" }, () => [
            showFirst.value
              ? h(ItemWithId, { label: "First", id: "first", autoFocus: true })
              : null,
            h(ItemWithId, { label: "Second", id: "second" }),
          ]);
      },
    });

    const { waitUntilFlush, unmount } = render(App);
    await waitUntilFlush();
    expect(captured.activeId.value).toBe("first");

    showFirst.value = false;
    await waitUntilFlush();
    expect(captured.activeId.value).toBeUndefined();
    unmount();
  });
});

const ItemWithId = defineComponent({
  props: {
    label: { type: String, required: true as const },
    id: { type: String, required: true as const },
    autoFocus: { type: Boolean, default: false },
  },
  setup(props) {
    const { isFocused } = useFocus({ id: props.id, autoFocus: props.autoFocus });
    return () => h(Text, null, () => `${props.label}${isFocused.value ? " ✔" : ""}`);
  },
});
