import { test, expect } from "@playwright/test";
import { DELIVERIES } from "../src/games/parcel/levels";
import { solveParcel, dailyParcel } from "../src/games/parcel/engine";
import { cleanupAccounts } from "./cleanup";
const accounts: string[] = [];
test.afterAll(() => cleanupAccounts(accounts));
const keys = {
  up: "ArrowUp",
  right: "ArrowRight",
  down: "ArrowDown",
  left: "ArrowLeft",
};
test("every Parcel chapter is delivered through legal keyboard moves and recorded to an account", async ({
  page,
}) => {
  test.setTimeout(120000);
  const username = `Parcel_${Date.now().toString(36)}`;
  accounts.push(username);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Parcel-test-1234",
      confirmPassword: "Parcel-test-1234",
    },
  });
  expect(response.status()).toBe(201);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/parcel");
  await expect(page.locator(".profile-link")).toContainText(username);
  await page.locator(".parcel-game").focus();
  for (let i = 0; i < 12; i++) {
    const path = solveParcel(DELIVERIES[i], DELIVERIES[i])!;
    for (const d of path) await page.keyboard.press(keys[d]);
    await expect(
      page.getByRole("heading", {
        name: "A lovely little delivery.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".score-notice")).toContainText("Round saved");
    if (i < 11)
      await page
        .getByRole("button", { name: "Next delivery", exact: true })
        .click();
  }
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter((r: { game: string }) => r.game === "parcel"),
  ).toHaveLength(12);
  expect(
    profile.highScores.find((r: { game: string }) => r.game === "parcel").score,
  ).toBe(1500);
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Admire the courtyard", exact: true })
    .click();
  await page.screenshot({
    path: "/tmp/afterhours-playtest/parcel-completed.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Delivery 12: A letter home",
      exact: true,
    }),
  ).toBeEnabled();
});
test("a phone supports touch moves, hints, undo, theme and exact route resume", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/parcel");
  const board = page.locator(".parcel-board"),
    before = await board.getAttribute("data-player");
  const up = page.getByRole("button", { name: "Walk up", exact: true });
  await up.scrollIntoViewIfNeeded();
  const rect = (await up.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(board).not.toHaveAttribute("data-player", before!);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(board).toHaveAttribute("data-player", before!);
  await page.getByRole("button", { name: "Route hint", exact: true }).click();
  await expect(page.locator(".parcel-message")).toContainText("Try one step");
  await expect(page.locator(".parcel-hint")).toHaveCount(1);
  await page.getByRole("button", { name: "Walk up", exact: true }).click();
  const boxes = await board.getAttribute("data-boxes"),
    player = await board.getAttribute("data-player");
  await page.getByLabel("Courtyard theme").selectOption("moonlit");
  await page.reload();
  await expect(board).toHaveAttribute("data-boxes", boxes!);
  await expect(board).toHaveAttribute("data-player", player!);
  await expect(page.getByLabel("Courtyard theme")).toHaveValue("moonlit");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(board).toHaveAttribute("data-player", before!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/parcel-mobile.png",
    fullPage: true,
  });
});
test("the daily delivery is reproducible and can be completed", async ({
  page,
}) => {
  await page.goto("/#/play/parcel?daily=1");
  const p = dailyParcel(DELIVERIES),
    board = page.locator(".parcel-board");
  await expect(board).toHaveAttribute("data-boxes", JSON.stringify(p.boxes));
  await page.reload();
  await expect(board).toHaveAttribute("data-boxes", JSON.stringify(p.boxes));
  await page.locator(".parcel-game").focus();
  for (const d of solveParcel(p, p)!) await page.keyboard.press(keys[d]);
  await expect(
    page.getByRole("heading", {
      name: "A lovely little delivery.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".score-notice")).toContainText("guest scorebook");
});
