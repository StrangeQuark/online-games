import { test, expect, type Page } from "@playwright/test";
import {
  SCENES,
  dimensions,
  type PieceCount,
} from "../src/games/keepsake/engine";
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
async function dragPiece(page: Page, piece: number, size: PieceCount) {
  const item = page.getByRole("button", {
    name: `Pick up piece ${piece + 1}`,
    exact: true,
  });
  while (!(await item.count()))
    await page
      .getByRole("button", { name: "Next pieces", exact: true })
      .click();
  const a = (await item.boundingBox())!,
    b = (await page.locator(".keepsake-board").boundingBox())!,
    { cols, rows } = dimensions(size);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    b.x + (((piece % cols) + 0.5) * b.width) / cols,
    b.y + ((Math.floor(piece / cols) + 0.5) * b.height) / rows,
    { steps: 7 },
  );
  await page.mouse.up();
}
async function firstPiece(page: Page) {
  return (
    Number(
      (await page
        .getByRole("button", { name: /Pick up piece/ })
        .first()
        .getAttribute("aria-label"))!.match(/\d+/)![0],
    ) - 1
  );
}
test("all five Keepsake pictures assemble through real dragging across all three sizes", async ({
  page,
}) => {
  test.setTimeout(180000);
  const username = `Keepsake_${Date.now().toString(36)}`;
  users.push(username);
  const response = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Keepsake-test-1234",
      confirmPassword: "Keepsake-test-1234",
    },
  });
  expect(response.status()).toBe(201);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/keepsake");
  await expect(page.locator(".profile-link")).toContainText(username);
  for (let scene = 0; scene < SCENES.length; scene++) {
    const size = ([12, 24, 48, 12, 24] as PieceCount[])[scene];
    await page.getByLabel("Puzzle picture").selectOption(String(scene));
    await page.getByLabel("Puzzle size").selectOption(String(size));
    await page
      .getByRole("button", {
        name: scene === 0 ? "New puzzle" : "Start puzzle",
        exact: true,
      })
      .click();
    for (let n = 0; n < size; n++) {
      const piece = await firstPiece(page);
      await dragPiece(page, piece, size);
      await expect(page.locator(".keepsake-placed-piece")).toHaveCount(n + 1);
    }
    await expect(
      page.getByRole("heading", {
        name: "A picture worth keeping.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".score-notice")).toContainText("Round saved");
    if (scene === 2) {
      await page
        .getByRole("button", { name: "Admire the picture", exact: true })
        .click();
      await page.screenshot({
        path: "/tmp/afterhours-playtest/keepsake-48-complete.png",
        fullPage: true,
      });
    }
  }
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter((r: { game: string }) => r.game === "keepsake"),
  ).toHaveLength(5);
  expect(
    profile.highScores.find((r: { game: string }) => r.game === "keepsake")
      .score,
  ).toBe(3880);
  expect(errors).toEqual([]);
});
test("a phone supports touch pieces, keyboard placement, picture guides, filtering and saved progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/keepsake");
  await page
    .getByRole("button", { name: "Show picture guide", exact: true })
    .click();
  await expect(page.locator(".keepsake-reference")).toHaveClass(/visible/);
  await page.getByRole("checkbox", { name: "Edges first" }).check();
  const piece = await firstPiece(page);
  await page
    .locator(".keepsake-board")
    .evaluate((e) => e.scrollIntoView({ block: "start" }));
  const item = page.getByRole("button", {
      name: `Pick up piece ${piece + 1}`,
      exact: true,
    }),
    a = (await item.boundingBox())!,
    b = (await page.locator(".keepsake-board").boundingBox())!,
    cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: a.x + a.width / 2, y: a.y + a.height / 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      {
        id: 1,
        x: b.x + (((piece % 4) + 0.5) * b.width) / 4,
        y: b.y + ((Math.floor(piece / 4) + 0.5) * b.height) / 3,
      },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".keepsake-placed-piece")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".keepsake-placed-piece")).toHaveCount(1);
  const next = await firstPiece(page);
  await page
    .getByRole("button", { name: `Pick up piece ${next + 1}`, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  for (let row = 0; row < Math.floor(next / 4); row++)
    await page.keyboard.press("ArrowDown");
  for (let col = 0; col < next % 4; col++)
    await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator(".keepsake-placed-piece")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/keepsake-mobile.png",
    fullPage: true,
  });
});
test("four browsers contribute simultaneous pieces, finish together, and exclude a late arrival", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120000);
  const contexts = await Promise.all(
    Array.from({ length: 4 }, () => browser.newContext({ baseURL })),
  );
  try {
    const pages = await Promise.all(contexts.map((c) => c.newPage())),
      host = pages[0],
      username = `PuzzleHost_${Date.now().toString(36)}`;
    users.push(username);
    const response = await host.request.post("/api/auth/enroll", {
      data: {
        username,
        password: "Puzzle-test-1234",
        confirmPassword: "Puzzle-test-1234",
      },
    });
    expect(response.status()).toBe(201);
    await host.goto("/#/play/keepsake");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.locator(".room-connected")).toContainText(
      "You’re hosting",
    );
    const code = (
      await host.locator(".room-connected strong").innerText()
    ).replace("ROOM ", "");
    const round = await host
      .locator(".keepsake-board")
      .getAttribute("data-round");
    for (const guest of pages.slice(1)) {
      await guest.goto(`/#/play/keepsake?room=${code}`);
      await expect(guest.locator(".room-connected")).toContainText(
        "You’re connected",
      );
      await expect(guest.locator(".keepsake-board")).toHaveAttribute(
        "data-round",
        round!,
      );
    }
    for (let batch = 0; batch < 3; batch++) {
      await Promise.all(pages.map((p, i) => dragPiece(p, batch * 4 + i, 12)));
      for (const p of pages)
        await expect(p.locator(".keepsake-placed-piece")).toHaveCount(
          (batch + 1) * 4,
        );
    }
    for (const p of pages) {
      await expect(
        p.getByRole("heading", {
          name: "A picture worth keeping.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(p.locator(".score-notice")).toContainText(
        p === host ? "Round saved" : "guest scorebook",
      );
    }
    await contexts[3].close();
    await host.waitForTimeout(200);
    const late = await browser.newContext({ baseURL });
    try {
      const p = await late.newPage();
      await p.goto(`/#/play/keepsake?room=${code}`);
      await expect(
        p.getByRole("heading", {
          name: "A picture worth keeping.",
          exact: true,
        }),
      ).toBeVisible();
      await expect(p.locator(".score-notice")).toHaveCount(0);
    } finally {
      await late.close();
    }
    const profile = await (await host.request.get("/api/profile")).json();
    expect(
      profile.history.filter((r: { game: string }) => r.game === "keepsake"),
    ).toHaveLength(1);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
