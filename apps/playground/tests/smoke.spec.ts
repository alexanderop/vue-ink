import { expect, test } from "@playwright/test";

// Smoke coverage for the dual-execution playground. The point of this file
// is to fail when the wiring breaks — Monaco loads, the REPL mounts, the
// example picker swaps the bundle, the terminal preview produces ANSI text.
// Anything subtler belongs in component tests inside the workspace.

test.describe("playground", () => {
  test("loads, mounts the REPL and renders terminal output", async ({ page }) => {
    // Fail the test on hydration / Vue warnings — they're silent prod regressions.
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        const text = msg.text();
        // Filter known noise: Monaco / web worker chatter that doesn't matter.
        if (text.includes("monaco") || text.includes("worker")) return;
        consoleErrors.push(`[${msg.type()}] ${text}`);
      }
    });

    await page.goto("/");

    await expect(page.locator("header .sub")).toHaveText("playground");
    await expect(page.getByRole("combobox", { name: "Load example" })).toBeVisible();

    // The REPL mounts inside an iframe — wait for it to be attached before we
    // assert on the terminal output the iframe renders into.
    const previewFrame = page.locator("iframe").first();
    await expect(previewFrame).toBeVisible({ timeout: 30_000 });

    // Terminal preview is an xterm canvas. We can't read text from it, but we
    // can confirm the xterm DOM is mounted.
    await expect(page.locator(".xterm")).toBeVisible({ timeout: 30_000 });

    expect(consoleErrors, "no unexpected console errors").toEqual([]);
  });

  test("Monaco shows vue-ink types on hover after switching examples", async ({ page }) => {
    // Volar warmup on a cold worker can exceed the default 30s test budget.
    test.setTimeout(180_000);

    await page.goto("/");

    await expect(page.locator(".monaco-editor").first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("combobox", { name: "Load example" }).selectOption("counter");

    await expect
      .poll(() => page.locator(".monaco-editor .view-lines").first().innerText(), {
        timeout: 10_000,
      })
      .toContain("vueink");

    // vue-ink.d.ts is a hidden file; verify the store still carries it after loadExample.
    const fileKeys = await page.evaluate(() =>
      Object.keys(
        (window as unknown as { __playgroundStore?: { files: Record<string, unknown> } })
          .__playgroundStore?.files ?? {},
      ),
    );
    expect(fileKeys, "hidden vue-ink.d.ts must survive loadExample").toContain("vue-ink.d.ts");

    // Monaco renders each token as its own span; the first exact-match "Text"
    // span is the import identifier on line 3 of the counter example.
    const editor = page.locator(".monaco-editor").first();
    await editor.click();
    const textToken = editor
      .locator(".view-lines span")
      .filter({ hasText: /^Text$/ })
      .first();
    await expect(textToken).toBeVisible({ timeout: 10_000 });

    // Volar emits diagnostics before it can answer hover requests reliably.
    // Give it a head start so the first hover poll lands on a warm worker.
    await page.waitForTimeout(5_000);

    const hoverWidget = page.locator('[widgetid="editor.contrib.resizableContentHoverWidget"]');

    await expect
      .poll(
        async () => {
          // Bounce the mouse off the editor so re-entering retriggers the
          // hover delay on each poll iteration.
          await page.mouse.move(0, 0);
          await textToken.hover();
          return hoverWidget.innerText().catch(() => "");
        },
        { timeout: 120_000, intervals: [1_000, 2_000, 3_000] },
      )
      .toMatch(/DefineComponent|TextProps/);
  });

  test("theme toggle persists across reload", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
    await expect(toggle).toBeVisible();

    const initial = await toggle.getAttribute("aria-label");
    await toggle.click();
    const afterToggle = await toggle.getAttribute("aria-label");
    expect(afterToggle).not.toBe(initial);

    await page.reload();
    const afterReload = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
    await expect(afterReload).toHaveAttribute("aria-label", afterToggle ?? "");
  });
});
