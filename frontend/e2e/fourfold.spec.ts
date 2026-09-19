import { test, expect } from "@playwright/test";
import { cleanupAccounts } from "./cleanup";
const users: string[] = [];
test.afterAll(() => cleanupAccounts(users));
test("a local Fourfold win highlights the line and records its result once", async ({
  page,
}) => {
  const username = `Four_${Date.now().toString(36)}`;
  users.push(username);
  const result = await page.request.post("/api/auth/enroll", {
    data: {
      username,
      password: "Four-test-12345",
      confirmPassword: "Four-test-12345",
    },
  });
  expect(result.status()).toBe(201);
  await page.goto("/#/play/fourfold");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  for (const column of [1, 7, 2, 7, 3, 6, 4])
    await page
      .getByRole("button", { name: `Drop in column ${column}`, exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "Honey makes four.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".fourfold-win-ring")).toHaveCount(4);
  await expect(page.locator(".score-notice")).toContainText("Round saved");
  const profile = await (await page.request.get("/api/profile")).json();
  expect(
    profile.history.filter((row: { game: string }) => row.game === "fourfold"),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "New round", exact: false }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(0);
});
test("computer side selection, hints, takeback, and keyboard columns work on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/fourfold");
  await page
    .getByRole("combobox", { name: "Play as", exact: true })
    .selectOption("2");
  await expect(page.locator("[data-slot]")).toHaveCount(1);
  await page.getByRole("button", { name: "Hint", exact: false }).click();
  await expect(page.locator(".fourfold-column-buttons .hinted")).toHaveCount(1);
  const button = page.getByRole("button", {
    name: "Drop in column 4",
    exact: true,
  });
  await button.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Drop in column 5", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-slot]")).toHaveCount(3);
  await page.getByRole("button", { name: "Take back", exact: false }).click();
  await expect(page.locator("[data-slot]")).toHaveCount(1);
  await page.getByRole("button", { name: "Walnut board", exact: true }).click();
  await expect(page.locator(".fourfold-game")).toHaveClass(
    /board-theme-walnut/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/afterhours-playtest/fourfold-mobile.png",
    fullPage: true,
  });
});
test("two browsers exchange a complete Fourfold match and a requested rematch", async ({
  browser,
}) => {
  const hostContext = await browser.newContext(),
    guestContext = await browser.newContext();
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const code = `FOUR${Date.now().toString(36).toUpperCase()}`;
  try {
    await host.goto(`http://127.0.0.1:5173/#/play/fourfold?room=${code}`);
    await expect(host.locator(".room-connected")).toContainText(
      "You’re hosting",
    );
    await guest.goto(`http://127.0.0.1:5173/#/play/fourfold?room=${code}`);
    await expect(guest.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await expect(
      guest.getByRole("button", { name: "Drop in column 1", exact: true }),
    ).toBeDisabled();
    const sequence = [1, 7, 2, 7, 3, 6, 4];
    for (let i = 0; i < sequence.length; i++) {
      const player = i % 2 ? guest : host;
      await player
        .getByRole("button", {
          name: `Drop in column ${sequence[i]}`,
          exact: true,
        })
        .click();
      await expect(host.locator("[data-slot]")).toHaveCount(i + 1);
      await expect(guest.locator("[data-slot]")).toHaveCount(i + 1);
    }
    await expect(
      host.getByRole("heading", { name: "Honey makes four.", exact: true }),
    ).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Honey makes four.", exact: true }),
    ).toBeVisible();
    await guest
      .getByRole("button", { name: "Ask for rematch", exact: false })
      .click();
    await expect(host.locator(".fourfold-notice")).toContainText(
      "opponent would love another",
    );
    await host.getByRole("button", { name: "New round", exact: false }).click();
    await expect(guest.locator("[data-slot]")).toHaveCount(0);
    await expect(host.locator("[data-slot]")).toHaveCount(0);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
