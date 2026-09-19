import { test, expect, type Page } from "@playwright/test";
import {
  slide,
  type MosaicState,
  type Direction,
} from "../src/games/mosaic/engine";
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
const state = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("afterhours:mosaic-session-v1") || "null",
      ) as MosaicState,
  );
async function move(page: Page, direction: Direction) {
  await page.locator(".mosaic-game").focus();
  await page.keyboard.press(
    {
      left: "ArrowLeft",
      right: "ArrowRight",
      up: "ArrowUp",
      down: "ArrowDown",
    }[direction],
  );
  await page.waitForTimeout(115);
}
test("a daily Mosaic merges through real keyboard play, rewinds exactly and keeps one account score", async ({
  page,
}) => {
  test.setTimeout(90000);
  const username = `Mosaic_${Date.now().toString(36)}`;
  users.push(username);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Mosaic-test-1234",
      confirmPassword: "Mosaic-test-1234",
    },
  });
  expect(response.status()).toBe(201);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/mosaic?daily=1");
  await expect(page.locator(".mosaic-board")).toBeVisible();
  const first = await state(page);
  const initial = first.tiles;
  const d = (["left", "down", "right", "up"] as Direction[]).find((d) =>
    slide(first, d),
  )!;
  await move(page, d);
  await page.getByRole("button", { name: "Rewind · 3", exact: true }).click();
  expect((await state(page)).tiles).toEqual(initial);
  await expect(page.locator(".mosaic-board")).toHaveAttribute(
    "data-score",
    "0",
  );
  for (let i = 0; i < 80; i++) {
    const s = await state(page);
    const moves = (["left", "down", "right", "up"] as Direction[])
      .map((direction) => ({ direction, next: slide(s, direction) }))
      .filter((c) => c.next);
    if (!moves.length) break;
    moves.sort(
      (a, b) =>
        b.next!.gain +
        30 * (16 - b.next!.tiles.length) -
        (a.next!.gain + 30 * (16 - a.next!.tiles.length)),
    );
    await move(page, moves[0].direction);
  }
  const final = await state(page);
  expect(final.score).toBeGreaterThan(300);
  expect(final.moves).toBeGreaterThan(30);
  await page.getByRole("button", { name: "Keep score", exact: true }).click();
  await page
    .getByRole("button", { name: "Keep my score", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Completed mosaic" }),
  ).toBeVisible();
  await expect(page.locator(".score-notice")).toContainText(/saved/i);
  const profile = await (await page.request.get("/api/profile")).json();
  const rounds = profile.history.filter(
    (r: { game: string }) => r.game === "mosaic",
  );
  expect(rounds).toHaveLength(1);
  expect(rounds[0].score).toBe(final.score);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/mosaic-complete.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  expect(
    (await (await page.request.get("/api/profile")).json()).history.filter(
      (r: { game: string }) => r.game === "mosaic",
    ),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});
test("Mosaic phone swipes, roomy boards, saved progress, favorites and nearby games work together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/mosaic");
  await page
    .getByRole("button", { name: "Room to breathe", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Start a new mosaic", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "5 by 5 Mosaic board" }),
  ).toBeVisible();
  const before = await state(page),
    direction = (["left", "right", "up", "down"] as Direction[]).find((d) =>
      slide(before, d),
    )!;
  const board = page.locator(".mosaic-board");
  await board.scrollIntoViewIfNeeded();
  const box = (await board.boundingBox())!,
    cdp = await page.context().newCDPSession(page),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2,
    dx = direction === "left" ? -85 : direction === "right" ? 85 : 0,
    dy = direction === "up" ? -85 : direction === "down" ? 85 : 0;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + dx, y: y + dy }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(board).toHaveAttribute("data-moves", "1");
  await page.getByLabel("Mosaic palette").selectOption("moonlight");
  await page
    .getByRole("button", { name: "Add Mosaic to favorites", exact: true })
    .click();
  const saved = await state(page);
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Continue playing" })
    .locator('a[href="#/play/mosaic"]')
    .click();
  await expect(board).toHaveAttribute("data-moves", "1");
  expect((await state(page)).tiles).toEqual(saved.tiles);
  await expect(page.getByLabel("Mosaic palette")).toHaveValue("moonlight");
  await expect(
    page.getByRole("button", {
      name: "Remove Mosaic from favorites",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Start a new mosaic", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start fresh", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Confirm action" }),
  ).toHaveCount(0);
  expect((await state(page)).tiles).toEqual(saved.tiles);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/mosaic-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("region", { name: "More to play" })
    .locator('a[href="#/play/parcel"]')
    .click();
  await expect(page.locator(".parcel-game")).toBeVisible();
});
