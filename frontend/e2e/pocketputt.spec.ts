import { test, expect, type Page } from "@playwright/test";
import plans from "./fixtures/golf-plans.json" with { type: "json" };
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
async function shot(page: Page, angle: number, power: number) {
  const canvas = page.locator(".putt-stage canvas"),
    box = (await canvas.boundingBox())!,
    x = Number(await canvas.getAttribute("data-ball-x")),
    y = Number(await canvas.getAttribute("data-ball-y"));
  await page.mouse.move(
    box.x + (x / 900) * box.width,
    box.y + (y / 620) * box.height,
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + ((x - Math.cos(angle) * power * 160) / 900) * box.width,
    box.y + ((y - Math.sin(angle) * power * 160) / 620) * box.height,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-phase", "rolling");
  await expect(canvas).not.toHaveAttribute("data-phase", "rolling", {
    timeout: 20000,
  });
}
test("all nine gardens play through real putts and save a completed scorecard", async ({
  page,
}) => {
  test.setTimeout(150000);
  const username = `Putt_${Date.now().toString(36)}`;
  users.push(username);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Putt-test-12345",
      confirmPassword: "Putt-test-12345",
    },
  });
  expect(response.status()).toBe(201);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/pocketputt");
  await page
    .getByRole("button", { name: "Play nine holes", exact: false })
    .click();
  for (let hole = 0; hole < 9; hole++) {
    await expect(page.locator(".putt-stage canvas")).toHaveAttribute(
      "data-hole",
      String(hole),
    );
    for (const { angle, power } of plans[hole]) await shot(page, angle, power);
    await expect(page.locator(".putt-hole-result")).toBeVisible();
    if (hole === 3)
      await page.screenshot({
        path: "/tmp/afterhours-playtest/pocketputt-fourth-complete.png",
        fullPage: true,
      });
    await page
      .getByRole("button", {
        name: hole === 8 ? "See your scorecard" : "Next little garden",
        exact: false,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Lovely round.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".score-notice")).toContainText("Round saved");
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter(
      (row: { game: string }) => row.game === "pocketputt",
    ),
  ).toHaveLength(1);
  expect(
    Number(await page.locator(".putt-stage canvas").getAttribute("data-score")),
  ).toBeGreaterThan(10000);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.locator(".putt-best")).toContainText("STROKES");
});
test("a phone supports touch putting, mulligans, keyboard aiming, and resume", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/pocketputt");
  await page
    .getByRole("button", { name: "Play nine holes", exact: false })
    .click();
  const canvas = page.locator(".putt-stage canvas"),
    box = (await canvas.boundingBox())!,
    cdp = await page.context().newCDPSession(page);
  const x = box.x + (150 / 900) * box.width,
    y = box.y + (310 / 620) * box.height;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x - (25 / 900) * box.width, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(canvas).toHaveAttribute("data-phase", "rolling");
  await expect(canvas).toHaveAttribute("data-phase", "aiming");
  await expect(canvas).toHaveAttribute("data-strokes", "1");
  await page.getByRole("button", { name: /Mulligan/ }).click();
  await expect(canvas).toHaveAttribute("data-strokes", "0");
  await expect(canvas).toHaveAttribute("data-ball-x", "150");
  await canvas.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await expect(canvas).toHaveAttribute("data-phase", "rolling");
  await expect(canvas).not.toHaveAttribute("data-phase", "rolling");
  const savedX = await canvas.getAttribute("data-ball-x");
  await page.reload();
  await page
    .getByRole("button", { name: "Continue your round", exact: false })
    .click();
  await expect(canvas).toHaveAttribute("data-ball-x", savedX!);
  await expect(page.getByRole("button", { name: /Mulligan/ })).toContainText(
    "2",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/pocketputt-mobile.png",
    fullPage: true,
  });
});
