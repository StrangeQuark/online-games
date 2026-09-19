import { test, expect, type Page } from "@playwright/test";
import { newCircuit, maskOf, rotate } from "../src/games/lumen/engine";
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
async function solve(page: Page, level = 0, seed?: number, daily = false) {
  const game = newCircuit(level, seed, daily);
  for (let i = 0; i < game.tiles.length; i++) {
    if (i === game.root) continue;
    const tile = page.locator(`[data-tile="${i}"]`);
    let mask = Number(await tile.getAttribute("data-mask"));
    for (let n = 0; n < 4 && mask !== game.tiles[i].solution; n++) {
      await tile.click();
      mask = rotate(mask);
    }
  }
  await expect(
    page.getByRole("heading", { name: "You made it glow." }),
  ).toBeVisible();
}

test("Lumen solves a real network, saves the new game's score, and unlocks the next garden", async ({
  page,
}) => {
  const name = `Lumen_${Date.now().toString(36)}`;
  users.push(name);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username: name,
      password: "Lumen-test-12345",
      confirmPassword: "Lumen-test-12345",
    },
  });
  expect(response.status()).toBe(201);
  await page.goto("/#/play/lumen");
  await solve(page);
  await expect(page.locator(".score-notice")).toContainText("Round saved");
  await page
    .getByRole("button", { name: "Admire the lights", exact: true })
    .click();
  await expect(page.locator(".lumen-tile.powered")).toHaveCount(16);
  await expect(page.getByRole("button", { name: /^Garden 2:/ })).toBeEnabled();
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter((h: { game: string }) => h.game === "lumen"),
  ).toHaveLength(1);
  expect(profile.highScores[0].score).toBeGreaterThan(1000);
  await page.getByRole("button", { name: /^Garden 2:/ }).click();
  await expect(page.locator(".lumen-board-heading")).toContainText(
    "First branches",
  );
  await page.reload();
  await expect(page.locator(".lumen-board-heading")).toContainText(
    "First branches",
  );
  await expect(page.getByRole("button", { name: /^Garden 2:/ })).toBeEnabled();
});

test("Lumen supports keyboard turns, undo, pinning, hints, and saved puzzle position", async ({
  page,
}) => {
  await page.goto("/#/play/lumen");
  const tile = page.locator('[data-tile="0"]');
  const start = Number(await tile.getAttribute("data-mask"));
  await tile.focus();
  await page.keyboard.press("Enter");
  await expect(tile).toHaveAttribute("data-mask", String(rotate(start)));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(tile).toHaveAttribute("data-mask", String(start));
  await page.getByRole("button", { name: "Pin tiles", exact: true }).click();
  await tile.click();
  await page.getByRole("button", { name: "Pin mode on", exact: true }).click();
  await tile.click();
  await expect(tile).toHaveAttribute("data-mask", String(start));
  await expect(tile).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(page.locator(".lumen-tile.hint")).toHaveCount(1);
  await expect(page.locator(".lumen-notice")).toContainText("Rotate");
  const other = page.locator('[data-tile="1"]');
  await other.click();
  const turned = await other.getAttribute("data-mask");
  await page.reload();
  await expect(page.locator('[data-tile="1"]')).toHaveAttribute(
    "data-mask",
    turned!,
  );
  await expect(page.locator('[data-tile="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the daily circuit is solvable and fits a phone", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/lumen");
  await page
    .getByRole("button", { name: "Daily puzzle", exact: false })
    .click();
  await expect(page.locator(".lumen-tile")).toHaveCount(36);
  const date = Number(
    new Date().toISOString().slice(0, 10).replaceAll("-", ""),
  );
  await solve(page, 0, date, true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Back to the gardens", exact: false })
    .click();
  await expect(page.locator(".lumen-tile")).toHaveCount(16);
});
