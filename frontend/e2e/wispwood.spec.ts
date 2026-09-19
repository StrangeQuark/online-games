import { test, expect, type Page } from "@playwright/test";
import { GROVES } from "../src/games/wispwood/engine";
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
async function walk(page: Page, level: number) {
  const canvas = page.locator(".wisp-stage canvas"),
    grove = GROVES[level];
  let target = 1,
    held = "",
    jumpHeld = false,
    captured = false;
  await expect(canvas).toHaveAttribute("data-level", String(level));
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  for (let tick = 0; tick < 2200; tick++) {
    const data = await canvas.evaluate((c) => ({ ...c.dataset }));
    if (data.phase !== "playing") break;
    const x = Number(data.x),
      y = Number(data.y),
      vy = Number(data.vy),
      ground = Number(data.ground),
      jumps = Number(data.jumps),
      lanterns = JSON.parse(data.lanterns!) as number[];
    if (Number(data.respawn) > 0) target = Number(data.checkpoint) + 1;
    if (vy < -610) {
      const spring = grove.platforms.findIndex(
        (p) => p.spring && x > p.x - 20 && x < p.x + p.w + 20,
      );
      if (spring >= target) target = spring + 1;
    }
    if (ground >= target) {
      const needed = grove.lanterns.findIndex((l) => l.platform === ground);
      if (needed < 0 || lanterns.includes(needed))
        target = Math.min(grove.platforms.length, ground + 1);
    }
    const p = grove.platforms[Math.min(target, grove.platforms.length - 1)],
      missing = grove.lanterns.findIndex(
        (l, i) => l.platform === target && !lanterns.includes(i),
      ),
      targetX =
        target >= grove.platforms.length
          ? grove.exit.x
          : missing >= 0
            ? grove.lanterns[missing].x
            : p.x + p.w * 0.55;
    const direction =
      targetX - x > 16 ? "ArrowRight" : targetX - x < -16 ? "ArrowLeft" : "";
    if (direction !== held) {
      if (held) await page.keyboard.up(held);
      if (direction) await page.keyboard.down(direction);
      held = direction;
    }
    let jump = false;
    if (ground >= 0) {
      const plat = grove.platforms[ground],
        thorn = grove.thorns.find(
          (t) => t.x > x && t.x - x < 80 && Math.abs(t.y - (y + 20)) < 5,
        );
      jump = Boolean(thorn) || (target > ground && x > plat.x + plat.w - 57);
    } else if (
      jumps === 1 &&
      vy > 15 &&
      y + 20 > p.y - 55 &&
      Math.abs(targetX - x) > 60
    )
      jump = true;
    if (jumpHeld) jump = false;
    if (jump !== jumpHeld) {
      if (jump) await page.keyboard.down("Space");
      else await page.keyboard.up("Space");
      jumpHeld = jump;
    }
    if (level === 2 && x > 1200 && !captured) {
      await page.screenshot({
        path: "/tmp/afterhours-playtest/wispwood-live.png",
        fullPage: true,
      });
      captured = true;
    }
    await page.waitForTimeout(45);
  }
  if (held) await page.keyboard.up(held);
  if (jumpHeld) await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-phase", "clear", {
    timeout: 10000,
  });
}
test("an actual eight-grove journey collects every lantern and saves its completed score", async ({
  page,
}) => {
  test.setTimeout(300000);
  const username = `Wisp_${Date.now().toString(36)}`;
  users.push(username);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Wisp-test-12345",
      confirmPassword: "Wisp-test-12345",
    },
  });
  expect(response.status()).toBe(201);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/wispwood");
  await page
    .getByRole("button", { name: "Into the woods", exact: false })
    .click();
  for (let level = 0; level < 8; level++) {
    await walk(page, level);
    await expect(page.locator(".wisp-lantern-count .lit")).toHaveCount(3);
    await page
      .locator(".wisp-clear")
      .getByRole("button", {
        name: level === 7 ? "A light in the window" : "On to the next grove",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", {
      name: "You brought the light home.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".score-notice")).toContainText("Round saved");
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter((row: { game: string }) => row.game === "wispwood"),
  ).toHaveLength(1);
  expect(profile.highScores[0].score).toBeGreaterThan(15000);
  expect(errors).toEqual([]);
});
test("a phone can move and jump together, pause, and resume its saved journey", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/wispwood");
  await page
    .getByRole("button", { name: "Into the woods", exact: false })
    .click();
  const canvas = page.locator(".wisp-stage canvas"),
    right = (await page
      .getByRole("button", { name: "Right", exact: true })
      .boundingBox())!,
    jump = (await page
      .getByRole("button", { name: "Jump", exact: true })
      .boundingBox())!,
    cdp = await page.context().newCDPSession(page);
  const points = [
    { id: 1, x: right.x + right.width / 2, y: right.y + right.height / 2 },
    { id: 2, x: jump.x + jump.width / 2, y: jump.y + jump.height / 2 },
  ];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points,
  });
  await page.waitForTimeout(220);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(Number(await canvas.getAttribute("data-x"))).toBeGreaterThan(110);
  expect(Number(await canvas.getAttribute("data-y"))).toBeLessThan(520);
  await page
    .getByRole("button", { name: "Pause journey", exact: true })
    .click();
  const time = await canvas.getAttribute("data-time");
  await page.waitForTimeout(200);
  await expect(canvas).toHaveAttribute("data-time", time!);
  await page.reload();
  await page
    .getByRole("button", { name: "Continue your journey", exact: false })
    .click();
  await expect(canvas).toHaveAttribute("data-phase", "playing");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/wispwood-mobile.png",
    fullPage: true,
  });
});
