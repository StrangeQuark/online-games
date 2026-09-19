import { test, expect } from "@playwright/test";

test("Neon Break plays through real paddle controls, pauses, and records a finished run once", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const submissions: unknown[] = [];
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { user: { id: 101, username: "BreakerTester" } } }),
  );
  await page.route("**/api/scores", (route) => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({ json: { saved: true } });
  });
  await page.clock.install();
  await page.goto("/#/play/neonbreak");
  await expect(
    page.getByRole("region", { name: "Multiplayer room" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Let it glow" }).click();
  const canvas = page.locator(".neon-stage canvas");
  for (let i = 0; i < 100; i++) {
    const x = Number(await canvas.getAttribute("data-ball-x"));
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(
      box.x + ((x + Math.sin(i * 0.4) * 24) / 900) * box.width,
      box.y + box.height * 0.85,
    );
    await page.clock.runFor(100);
  }
  expect(Number(await canvas.getAttribute("data-score"))).toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute("data-bricks"))).toBeLessThan(55);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.runFor(100);
  const x = await canvas.getAttribute("data-ball-x"),
    y = await canvas.getAttribute("data-ball-y");
  await page.clock.runFor(1200);
  expect(await canvas.getAttribute("data-ball-x")).toBe(x);
  expect(await canvas.getAttribute("data-ball-y")).toBe(y);
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  // Intentionally miss by steering to the opposite edge, using only real controls.
  for (let i = 0; i < 450; i++) {
    const phase = await canvas.getAttribute("data-phase");
    if (phase === "over") break;
    const box = (await canvas.boundingBox())!;
    if (phase === "ready") {
      await page
        .getByRole("button", { name: "Launch ball", exact: true })
        .click();
    }
    const ballX = Number(await canvas.getAttribute("data-ball-x"));
    await page.mouse.move(
      box.x + (ballX < 450 ? 0.94 : 0.06) * box.width,
      box.y + box.height * 0.9,
    );
    await page.clock.runFor(160);
  }
  await expect(
    page.getByRole("heading", { name: "One more spark?" }),
  ).toBeVisible();
  await expect.poll(() => submissions.length).toBe(1);
  await page.clock.runFor(1000);
  expect(submissions).toHaveLength(1);
  await expect(page.locator(".score-notice")).toContainText("Round saved");
  expect(errors).toEqual([]);
});

test("Neon Break touch control and mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/neonbreak");
  await page.getByRole("button", { name: "Chill", exact: false }).click();
  await page.getByRole("button", { name: "Let it glow" }).click();
  const c = page.locator("canvas");
  await c.scrollIntoViewIfNeeded();
  const box = (await c.boundingBox())!;
  await c.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: box.x + box.width * 0.7,
    clientY: box.y + box.height * 0.8,
    bubbles: true,
  });
  await c.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: box.x + box.width * 0.25,
    clientY: box.y + box.height * 0.8,
    bubbles: true,
  });
  await c.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: box.x + box.width * 0.25,
    clientY: box.y + box.height * 0.8,
    bubbles: true,
  });
  await expect
    .poll(async () => Number(await c.getAttribute("data-paddle")))
    .toBeLessThan(300);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("an interrupted Neon Break run resumes its exact score and board", async ({
  page,
}) => {
  await page.goto("/#/play/neonbreak");
  await page.getByRole("button", { name: "Chill", exact: false }).click();
  await page.getByRole("button", { name: "Let it glow", exact: true }).click();
  const canvas = page.locator(".neon-stage canvas");
  await page.waitForTimeout(1700);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  const before = await canvas.evaluate((c) => ({
    bricks: c.dataset.bricks,
    score: c.dataset.score,
    ballX: c.dataset.ballX,
    ballY: c.dataset.ballY,
  }));
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await expect(page.locator(".play-page")).toHaveCount(0);
  await page.goto("/#/play/neonbreak");
  await expect(
    page.getByRole("button", { name: "Continue saved run", exact: false }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute("data-score", before.score!);
  await expect(canvas).toHaveAttribute("data-bricks", before.bricks!);
  await expect(canvas).toHaveAttribute("data-ball-x", before.ballX!);
  await expect(canvas).toHaveAttribute("data-ball-y", before.ballY!);
  await page
    .getByRole("button", { name: "Continue saved run", exact: false })
    .click();
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  await page.getByRole("checkbox", { name: "Gentle motion" }).check();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Gentle motion" }),
  ).toBeChecked();
});
