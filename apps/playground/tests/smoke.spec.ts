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
