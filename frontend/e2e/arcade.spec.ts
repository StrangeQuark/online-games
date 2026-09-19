import { test, expect } from "@playwright/test";
import { games } from "../src/catalog";

test("overlapping completed rounds keep failed saves for an idempotent retry", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { user: { id: 123, username: "RetryTester" } } }),
  );
  const submissions: { runId: string; score: number }[] = [];
  let releaseFirst!: () => void;
  const firstCanFinish = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route("**/api/scores", async (route) => {
    submissions.push(route.request().postDataJSON());
    if (submissions.length === 1) {
      await firstCanFinish;
      await route.fulfill({
        status: 503,
        json: { error: "Temporary score service error." },
      });
    } else await route.fulfill({ json: { saved: true } });
  });
  await page.goto("/#/play/chess");
  await expect(page.locator(".profile-link")).toContainText("RetryTester");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  const completeRound = async () => {
    for (const [from, to] of [
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ]) {
      await page.getByRole("button", { name: new RegExp(`^${from},`) }).click();
      await page
        .getByRole("button", { name: new RegExp(`^${to},.*legal move`) })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: "Obsidian wins by checkmate" }),
    ).toBeVisible();
  };
  await completeRound();
  await expect.poll(() => submissions.length).toBe(1);
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await completeRound();
  releaseFirst();
  await expect(page.locator(".score-notice")).toContainText(
    "1 round(s) waiting to save.",
  );
  expect(submissions).toHaveLength(2);
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.locator(".score-notice")).toContainText(
    "Round saved to your player page.",
  );
  expect(submissions).toHaveLength(3);
  expect(submissions[0].runId).toBe(submissions[2].runId);
  expect(submissions[0].runId).not.toBe(submissions[1].runId);
});

test("profile loads older rounds without losing the current history", async ({
  page,
}) => {
  const user = { id: 123, username: "HistoryTester" };
  const row = (id: number) => ({
    id,
    game: "chess",
    score: id,
    outcome: "Checkmate",
    playedAt: "2026-09-05T12:00:00Z",
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { user } }),
  );
  await page.route("**/api/profile*", (route) => {
    const offset = Number(
      new URL(route.request().url()).searchParams.get("offset") || 0,
    );
    return route.fulfill({
      json: {
        user,
        highScores: [{ game: "chess", score: 101 }],
        totalGames: 101,
        hasMore: offset === 0,
        history:
          offset === 0
            ? Array.from({ length: 100 }, (_, i) => row(101 - i))
            : [row(1)],
      },
    });
  });
  await page.goto("/#/profile");
  await expect(page.locator("tbody tr")).toHaveCount(100);
  await expect(page.locator(".stat-grid").first()).toContainText("101");
  await page.getByRole("button", { name: "Load older rounds" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(101);
  await expect(
    page.getByRole("button", { name: "Load older rounds" }),
  ).toHaveCount(0);
});

test("the game shelf filters, searches, and opens every game", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".game-card")).toHaveCount(games.length);
  await page.getByRole("button", { name: "Our originals" }).click();
  await expect(page.locator(".game-card")).toHaveCount(
    games.filter((g) => g.original).length,
  );
  await page.getByRole("button", { name: "The classics" }).click();
  await expect(page.locator(".game-card")).toHaveCount(
    games.filter((g) => !g.original).length,
  );
  await page.getByRole("textbox", { name: "Find a game" }).fill("chess");
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Find a game" }).fill("missing game");
  await expect(
    page.getByRole("heading", { name: "No games on this shelf." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all games" }).click();
  await expect(page.locator(".game-card")).toHaveCount(games.length);
  for (const { id: slug, name } of games) {
    await page.locator(`.game-card[href="#/play/${slug}"]`).click();
    await expect(page.locator(".game-heading h1")).toContainText(name);
    await expect(page.locator(".game-loading")).toHaveCount(0);
    await page.getByRole("link", { name: "Back to the arcade" }).click();
  }
  expect(errors).toEqual([]);
});

test("mobile navigation, account dialog, and room errors remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.routeWebSocket(/\/ws$/, (ws) => {
    ws.onMessage(() => ws.close({ code: 1011, reason: "Test server failure" }));
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little out of time/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Join the club", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Username", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Our little story" }).click();
  await expect(
    page.getByRole("heading", { name: /For the love/ }),
  ).toBeVisible();
  await page.goto("/#/play/starfall");
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("disconnected");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("favorites, recent games, daily links, and keyboard search make the shelf personal", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add Lumen to favorites", exact: true })
    .click();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator('.game-card[href="#/play/lumen"]')).toBeVisible();
  await page.getByRole("button", { name: "All games", exact: true }).click();
  await page.keyboard.press("/");
  await expect(
    page.getByRole("textbox", { name: "Find a game", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Find a game", exact: true })
    .fill("neon");
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.locator(".game-card").click();
  await expect(page.locator(".neonbreak-game")).toBeVisible();
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Recently played" }),
  ).toContainText("Neon Break");
  await page.locator('.daily-shelf a[href="#/play/lumen?daily=1"]').click();
  await expect(page.locator(".lumen-board-heading")).toContainText(
    "TODAY’S CIRCUIT",
  );
  await expect(page.locator(".lumen-tile")).toHaveCount(36);
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await page.locator('.daily-shelf a[href="#/play/solitaire?daily=1"]').click();
  await expect(page.locator(".daily-deal-date")).toBeVisible();
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Play together", exact: true })
    .click();
  await expect(page.locator(".game-card")).toHaveCount(
    games.filter((g) => g.multiplayer !== false).length,
  );
  await page.getByRole("button", { name: "Surprise me", exact: false }).click();
  await expect(page).toHaveURL(
    /#\/play\/(chess|solitaire|checkers|starfall|rift|fourfold|keepsake)$/,
  );
});

test("guest rounds keep a local scorebook and personal best without an account", async ({
  page,
}) => {
  await page.goto("/#/play/fourfold");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  for (const col of [1, 7, 2, 7, 3, 6, 4])
    await page
      .getByRole("button", { name: `Drop in column ${col}`, exact: true })
      .click();
  await expect(page.locator(".score-notice")).toContainText("guest scorebook");
  await page
    .getByRole("link", { name: "Your guest scorebook", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your guest scorebook.", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.locator('.personal-bests a[href="#/play/fourfold"]'),
  ).toContainText("1,240");
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "The arcade", exact: true }).click();
  await expect(page.locator(".guest-scorebook-return")).toContainText(
    "1 completed round",
  );
});
