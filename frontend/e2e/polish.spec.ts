import { test, expect } from "@playwright/test";

test("board games support drag moves, useful hints, themes, difficulty, and focus", async ({
  page,
}) => {
  for (const [game, from, to] of [
    ["chess", "e2", "e4"],
    ["checkers", "c3", "d4"],
  ]) {
    await page.goto(`/#/play/${game}`);
    await page.getByLabel("Opponent difficulty").selectOption("relaxed");
    await page
      .getByRole("button", { name: "Pass & play", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Midnight board", exact: true })
      .click();
    await expect(page.locator(".classics-game")).toHaveClass(
      /board-theme-midnight/,
    );
    const source = await page
      .getByRole("button", { name: new RegExp(`^${from},`) })
      .boundingBox();
    const target = await page
      .getByRole("button", { name: new RegExp(`^${to},`) })
      .boundingBox();
    await page.mouse.move(
      source!.x + source!.width / 2,
      source!.y + source!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      target!.x + target!.width / 2,
      target!.y + target!.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();
    await expect(
      page.getByRole("button", { name: new RegExp(`^${from}, empty`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(
          `^${to}, ${game === "chess" ? "white pawn" : "copper checker"}`,
        ),
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Hint/ }).click();
    await expect(page.locator(".board-hint-arrow line")).toHaveCount(1);
    await page.getByRole("button", { name: "Focus mode", exact: true }).click();
    await expect(page.locator(".header")).toBeHidden();
    const board = await page.locator(".classic-board").boundingBox();
    expect(board!.y + board!.height).toBeLessThan(1000);
    await page.getByRole("button", { name: "Exit focus", exact: true }).click();
    await expect(page.locator(".header")).toBeVisible();
  }
  await page.goto("/");
  await expect(page.locator("body")).not.toHaveClass(/playing-game|focus-game/);
});

test("Solitaire daily shuffle repeats, draw three preserves cards, and preferences survive navigation", async ({
  page,
}) => {
  await page.goto("/#/play/solitaire");
  await page.getByRole("button", { name: "Daily deal", exact: false }).click();
  const cards = await page
    .locator(".tableau-stack .playing-card")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-card-id")));
  await page.getByRole("button", { name: /^Draw a card/ }).click();
  await page.getByRole("button", { name: "Replay deal", exact: false }).click();
  expect(
    await page
      .locator(".tableau-stack .playing-card")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-card-id"))),
  ).toEqual(cards);
  await page.getByLabel("Cards per draw").selectOption("3");
  await page.getByRole("button", { name: /^Draw three cards, 24/ }).click();
  await expect(
    page.getByRole("button", { name: /^Draw three cards, 21/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Undo/ }).click();
  await expect(
    page.getByRole("button", { name: /^Draw three cards, 24/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Plum table", exact: true }).click();
  await page.reload();
  await expect(page.locator(".solitaire-game")).toHaveClass(/table-plum/);
  await page.getByRole("button", { name: "Daily deal", exact: false }).click();
  expect(
    await page
      .locator(".tableau-stack .playing-card")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-card-id"))),
  ).toEqual(cards);
  await expect(page.getByLabel("Cards per draw")).toHaveValue("1");
});

test("all classic enhancements fit a narrow touch screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const game of ["chess", "checkers", "solitaire"]) {
    await page.goto(`/#/play/${game}`);
    await page.locator(".classics-game").waitFor();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Focus mode", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("Starfall saves a solo expedition and restores it paused with station controls", async ({
  page,
}) => {
  await page.goto("/#/play/starfall");
  await page
    .getByRole("button", { name: "Begin training", exact: true })
    .click();
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  const canvas = page.locator(".sf-stage canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(
    box.x + box.width / 2 + (848 - 900) * 0.85,
    box.y + box.height / 2 + 10 * 0.85,
  );
  await expect(page.locator(".sf-quick-station")).toContainText(
    "Mineral miner",
  );
  await expect(
    page.getByRole("button", {
      name: "Quick upgrade selected station",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Quick upgrade selected station",
      exact: true,
    })
    .click();
  await expect(page.locator(".sf-quick-station")).toContainText("Upgrading");
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /A little out of time/ }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("afterhours:starfall-checkpoint-v1") || "null",
    ),
  );
  expect(
    saved.game.structures.some((s: { upgrading: unknown }) => s.upgrading),
  ).toBe(true);
  await page.goto("/#/play/starfall");
  await page
    .getByRole("button", { name: "Resume expedition", exact: true })
    .click();
  await expect(page.locator(".sf-paused")).toContainText("PAUSED");
  await expect(page.locator(".sf-message")).toContainText(
    "Expedition restored",
  );
  await expect(
    page.getByRole("button", { name: "▶ Resume", exact: true }),
  ).toBeVisible();
});

test("Rift pause freezes the clock and settings persist", async ({ page }) => {
  await page.clock.install();
  await page.goto("/#/play/rift");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByLabel("Mouse sensitivity", { exact: true })
    .selectOption("0.5");
  await page.getByLabel("Field of view", { exact: true }).selectOption("95");
  await page
    .getByLabel("Camera motion", { exact: true })
    .selectOption("reduced");
  await page.getByLabel("Crosshair style", { exact: true }).selectOption("dot");
  await page
    .getByRole("button", { name: "Enter the arena", exact: false })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.runFor(100);
  const before = await page.locator(".rift-match-clock strong").textContent();
  await page.clock.runFor(3000);
  expect(await page.locator(".rift-match-clock strong").textContent()).toBe(
    before,
  );
  await expect(page.locator(".rift-stage canvas")).toHaveAttribute(
    "data-paused",
    "true",
  );
  await page.getByRole("button", { name: "Resume match", exact: true }).click();
  await page.clock.runFor(1200);
  await expect(page.locator(".rift-stage canvas")).toHaveAttribute(
    "data-paused",
    "false",
  );
  expect(await page.locator(".rift-match-clock strong").textContent()).not.toBe(
    before,
  );
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("Field of view", { exact: true })).toHaveValue(
    "95",
  );
  await expect(page.getByLabel("Camera motion", { exact: true })).toHaveValue(
    "reduced",
  );
});

test("either side can play the computer, with accurate flipped labels and take-backs", async ({
  page,
}) => {
  for (const game of ["chess", "checkers"]) {
    await page.goto(`/#/play/${game}`);
    await page
      .getByRole("combobox", { name: "Play as", exact: true })
      .selectOption("black");
    await expect(page.locator(".board-player").last()).toContainText(
      game === "chess" ? "You · Obsidian" : "You · Jade",
    );
    await expect(page.locator(".board-player").last()).toContainText("TO MOVE");
    await page
      .getByRole("button", { name: "Flip board", exact: false })
      .click();
    await expect(page.locator(".board-player").first()).toContainText(
      game === "chess" ? "You · Obsidian" : "You · Jade",
    );
    await page.getByRole("button", { name: "Hint", exact: false }).click();
    await expect(page.locator(".board-hint-arrow")).toBeVisible();
    const selected = page.locator('[aria-pressed="true"][data-square]');
    await expect(selected).toHaveCount(1);
    const destination = page
      .getByRole("button", { name: /legal move/ })
      .first();
    await destination.click();
    await expect(page.locator(".board-player").first()).toContainText(
      "TO MOVE",
    );
    await page.getByRole("button", { name: "Take back", exact: false }).click();
    await expect(page.locator(".board-player").first()).toContainText(
      "TO MOVE",
    );
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Play as", exact: true }),
    ).toHaveValue("black");
    await expect(page.locator(".board-player").first()).toContainText(
      game === "chess" ? "You · Obsidian" : "You · Jade",
    );
  }
});

test("Solitaire resumes the exact draw-three deal and undo history after leaving", async ({
  page,
}) => {
  await page.goto("/#/play/solitaire");
  await page.getByLabel("Cards per draw").selectOption("3");
  await page.getByRole("button", { name: /^Draw three cards, 24/ }).click();
  await page.getByRole("button", { name: /^Draw three cards, 21/ }).click();
  const cards = await page
    .locator(".tableau-stack .playing-card")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-card-id")));
  const waste = await page
    .locator(".waste-slot .playing-card")
    .getAttribute("data-card-id");
  await expect(page.locator(".saved-deal-label")).toBeVisible();
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await page.locator('.game-card[href="#/play/solitaire"]').click();
  await expect(
    page.getByRole("button", { name: /^Draw three cards, 18/ }),
  ).toBeVisible();
  expect(
    await page
      .locator(".tableau-stack .playing-card")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-card-id"))),
  ).toEqual(cards);
  await expect(page.locator(".waste-slot .playing-card")).toHaveAttribute(
    "data-card-id",
    waste!,
  );
  await page.getByRole("button", { name: /Undo/ }).click();
  await expect(
    page.getByRole("button", { name: /^Draw three cards, 21/ }),
  ).toBeVisible();
});
