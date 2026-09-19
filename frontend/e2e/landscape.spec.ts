import { test, expect } from "@playwright/test";
test("landscape phones keep four action playfields and their touch controls on screen", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    for (const [id, start, selector] of [
      ["neonbreak", "Let it glow", ".neon-stage canvas"],
      ["driftline", "Hit the road", ".drift-stage canvas"],
      ["wispwood", "Into the woods", ".wisp-stage canvas"],
      ["pocketputt", "Play nine holes", ".putt-stage canvas"],
    ]) {
      await page.goto(`/#/play/${id}`);
      const canvas = page.locator(selector);
      await canvas.waitFor();
      await page.getByRole("button", { name: new RegExp(start) }).click();
      await page.waitForTimeout(250);
      const bounds = (await canvas.boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
      if (id === "neonbreak") {
        await page
          .getByRole("button", { name: "Pause playfield", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Resume game", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Resume game", exact: true })
          .click();
      }
      if (id === "driftline" || id === "wispwood") {
        const control = page.getByRole("button", {
            name: "Right",
            exact: true,
          }),
          box = (await control.boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(390);
        const before = Number(await canvas.getAttribute("data-x"));
        if (id === "driftline") {
          await canvas.focus();
          await page.keyboard.down("w");
          await page.waitForTimeout(900);
        }
        const cdp = await context.newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          ],
        });
        await page.waitForTimeout(250);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        expect(Number(await canvas.getAttribute("data-x"))).toBeGreaterThan(
          before,
        );
        if (id === "driftline") await page.keyboard.up("w");
        await cdp.detach();
      }
      if (id === "pocketputt") {
        const putt = page.getByRole("button", { name: "Putt", exact: true }),
          box = (await putt.boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(390);
        await putt.click();
        await expect(canvas).toHaveAttribute("data-strokes", "1");
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/afterhours-playtest/landscape-${id}.png`,
        animations: "disabled",
      });
    }
  } finally {
    await context.close();
  }
});
