import { cleanupAccounts } from "./cleanup";
import { expect, test, type Page } from "@playwright/test";

const password = "Arcade-test-password-42";
const createdUsers: string[] = [];

async function move(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: new RegExp(`^${from},`) }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${to},.*legal move`) })
    .click();
}

test.afterAll(() => cleanupAccounts(createdUsers));

test("account enrollment, an actual completed Chess game, scorebook, and persistent login", async ({
  page,
}) => {
  const username = `E2E_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  createdUsers.push(username);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Join the club", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Username", { exact: true }).fill(username);
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog
    .getByLabel("Confirm password", { exact: true })
    .fill("A-different-password");
  await dialog
    .getByRole("button", { name: "Join the club", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "passwords don’t match",
  );
  await dialog.getByLabel("Confirm password", { exact: true }).fill(password);
  await dialog
    .getByRole("button", { name: "Join the club", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".profile-link")).toContainText(username);

  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "ARCADE_SESSION",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "ARCADE_SESSION",
  );

  // Complete a real round through board controls, without injecting score or game state.
  await page.goto("/#/play/chess");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  await move(page, "f2", "f3");
  await move(page, "e7", "e5");
  await move(page, "g2", "g4");
  await move(page, "d8", "h4");
  await expect(
    page.getByRole("heading", { name: "Obsidian wins by checkmate" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Round saved to your player page." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Your hiscores & history" }).click();
  await expect(
    page.getByRole("heading", { name: `${username}’s corner.` }),
  ).toBeVisible();
  await expect(
    page.locator(".personal-bests a").filter({ hasText: "Chess" }),
  ).toContainText("1,000");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr").first()).toContainText("Chess");
  await expect(page.locator("tbody tr").first()).toContainText("Checkmate");
  await expect(page.locator("tbody tr").first()).toContainText("1,000");
  await page.getByLabel("Filter game history").selectOption("rift");
  await expect(
    page.getByRole("heading", { name: "A fresh page." }),
  ).toBeVisible();
  await page.getByLabel("Filter game history").selectOption("chess");
  await expect(page.locator("tbody tr")).toHaveCount(1);

  await page.getByRole("link", { name: "Hiscores", exact: true }).click();
  await page.getByRole("button", { name: "Chess", exact: true }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: username }),
  ).toContainText("1,000");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
  await page.goto("/#/profile");
  await expect(
    page.getByRole("heading", { name: "A home for your hiscores." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Log in", exact: true })
    .first()
    .click();
  await dialog
    .getByLabel("Username", { exact: true })
    .fill(username.toLowerCase());
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("Wrong-test-password");
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Incorrect username or password",
  );
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: `${username}’s corner.` }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `${username}’s corner.` }),
  ).toBeVisible();
  await expect(page.locator("tbody tr").first()).toContainText("1,000");
});

test("two browser contexts exchange Chess moves and handle the host leaving", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  try {
    await host.goto("/#/play/chess");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    const hostRoom = host.getByRole("region", { name: "Multiplayer room" });
    await expect(hostRoom).toContainText("You’re hosting");
    const room = (await hostRoom.locator("strong").innerText()).replace(
      "ROOM ",
      "",
    );
    await guest.goto("/#/play/chess");
    await guest.getByLabel("Room code").fill(room);
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(
      guest.getByRole("region", { name: "Multiplayer room" }),
    ).toContainText("You’re connected");
    await expect(host.locator(".room-connected")).toContainText(
      /Guest-[a-f0-9]{4} · Guest-[a-f0-9]{4}/,
    );
    await expect(
      guest.getByText("Online match · playing Obsidian"),
    ).toBeVisible();

    // The guest cannot move Black before White has moved.
    await guest
      .getByRole("button", { name: "e7, black pawn", exact: true })
      .click();
    await expect(
      guest.getByRole("button", { name: "e7, black pawn", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await move(host, "e2", "e4");
    await expect(
      guest.getByRole("button", { name: "e4, white pawn", exact: true }),
    ).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Obsidian to move", exact: true }),
    ).toBeVisible();
    await move(guest, "e7", "e5");
    await expect(
      host.getByRole("button", { name: "e5, black pawn", exact: true }),
    ).toBeVisible();
    await expect(
      host.getByRole("heading", { name: "Ivory to move", exact: true }),
    ).toBeVisible();
    await expect(host.locator(".move-row")).toContainText("e4");
    await expect(host.locator(".move-row")).toContainText("e5");

    await host.getByRole("button", { name: "Leave room", exact: true }).click();
    await expect(guest.getByRole("alert")).toContainText("The host left");
    await expect(
      guest.getByRole("button", { name: "Create room", exact: true }),
    ).toBeEnabled();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test("login displays a service failure and leaves the form usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Login is temporarily unavailable. Please try again.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Username", { exact: true }).fill("ServiceFailure");
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Login is temporarily unavailable",
  );
  await expect(
    dialog.getByRole("button", { name: "Log in", exact: true }),
  ).toBeEnabled();
  await expect(dialog.getByLabel("Username", { exact: true })).toHaveValue(
    "ServiceFailure",
  );
  await dialog.getByRole("button", { name: "Close account dialog" }).click();
  await expect(dialog).not.toBeVisible();
});
