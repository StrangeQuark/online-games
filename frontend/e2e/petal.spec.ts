import { test, expect } from "@playwright/test";
import {
  newGarden,
  chooseSwap,
  swapGarden,
  legalSwaps,
} from "../src/games/petal/engine";
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
test("a complete Petal garden cascades, records its score, and unlocks the next garden", async ({
  page,
}) => {
  test.setTimeout(90000);
  const username = `Petal_${Date.now().toString(36)}`;
  users.push(username);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Petal-test-12345",
      confirmPassword: "Petal-test-12345",
    },
  });
  expect(response.status()).toBe(201);
  await page.goto("/#/play/petal");
  await page
    .getByRole("button", { name: "Tend a garden", exact: true })
    .click();
  let game = newGarden();
  while (!game.ended) {
    const move = chooseSwap(game)!;
    await page.locator(`[data-cell="${move.from}"]`).click();
    await page.locator(`[data-cell="${move.to}"]`).click();
    await expect(page.locator(".petal-board")).not.toHaveClass(/petal-busy/);
    game = swapGarden(game, move.from, move.to).state;
    const kinds = await page
      .locator(".petal-cell")
      .evaluateAll((cells) =>
        cells.map((cell) => Number((cell as HTMLElement).dataset.kind)),
      );
    expect(kinds).toEqual(game.board.map((gem) => gem!.kind));
  }
  expect(game.won).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Look what you grew.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".arcade-final-score")).toHaveText(
    game.score.toLocaleString(),
  );
  await expect(page.locator(".score-notice")).toContainText("Round saved");
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter((row: { game: string }) => row.game === "petal"),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Next garden", exact: false }).click();
  await expect(page.locator(".petal-statbar")).toContainText("GARDEN 02");
  await page.reload();
  await expect(page.getByRole("button", { name: /^Garden 2:/ })).toBeEnabled();
});
test("Petal supports keyboard selection, rejected swaps, hints, and touch swipes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/petal");
  await page
    .getByRole("button", { name: "Just grow · Zen mode", exact: true })
    .click();
  let game = newGarden(0, true);
  const legal = legalSwaps(game.board);
  let from = 0;
  while (
    from % 7 === 6 ||
    legal.some((m) => m.from === from && m.to === from + 1)
  )
    from++;
  const cell = page.locator(`[data-cell="${from}"]`);
  await cell.focus();
  await page.keyboard.press("Enter");
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator(".petal-board")).not.toHaveClass(/petal-busy/);
  await expect(page.getByRole("status")).toContainText("That swap needs");
  await expect(page.locator(".petal-statbar")).toContainText("0");
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(page.locator(".petal-cell.hinted")).toHaveCount(2);
  const move = chooseSwap(game)!;
  const a = await page.locator(`[data-cell="${move.from}"]`).boundingBox(),
    b = await page.locator(`[data-cell="${move.to}"]`).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: a!.x + a!.width / 2, y: a!.y + a!.height / 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".petal-board")).not.toHaveClass(/petal-busy/);
  game = swapGarden(game, move.from, move.to).state;
  await expect(page.locator(".petal-statbar")).toContainText(
    game.score.toLocaleString(),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/petal-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finish garden", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "That was lovely.", exact: true }),
  ).toBeVisible();
});

test("Petal resumes the exact garden after leaving the page", async ({
  page,
}) => {
  await page.goto("/#/play/petal");
  await page
    .getByRole("button", { name: "Tend a garden", exact: true })
    .click();
  const game = newGarden(),
    move = chooseSwap(game)!;
  await page.locator(`[data-cell="${move.from}"]`).click();
  await page.locator(`[data-cell="${move.to}"]`).click();
  await expect(page.locator(".petal-board")).not.toHaveClass(/petal-busy/);
  const kinds = await page
    .locator(".petal-cell")
    .evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute("data-kind")),
    );
  await page.reload();
  await page
    .getByRole("button", { name: "Resume garden 1", exact: false })
    .click();
  expect(
    await page
      .locator(".petal-cell")
      .evaluateAll((cells) =>
        cells.map((cell) => cell.getAttribute("data-kind")),
      ),
  ).toEqual(kinds);
  await expect(page.locator(".petal-statbar")).toContainText("22");
});
