import { test, expect } from "@playwright/test";
test("a failed account round survives navigation and reload without moving to another account", async ({
  page,
}) => {
  let user = { id: 701, username: "RecoveryPlayer" },
    online = false;
  const submissions: { expectedUserId: number; runId: string }[] = [];
  await page.route("**/api/auth/me", (r) => r.fulfill({ json: { user } }));
  await page.route("**/api/scores", (r) => {
    submissions.push(r.request().postDataJSON());
    return online
      ? r.fulfill({ json: { saved: true } })
      : r.fulfill({ status: 503, json: { error: "Connection interrupted." } });
  });
  await page.goto("/#/play/fourfold");
  await expect(page.locator(".profile-link")).toContainText(user.username);
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  for (const col of [1, 2, 1, 2, 1, 2, 1])
    await page
      .getByRole("button", { name: `Drop in column ${col}`, exact: true })
      .click();
  await expect(page.locator(".score-notice")).toContainText("waiting to save");
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await expect(page.locator(".score-recovery")).toContainText(
    "Kept on this device",
  );
  await page.reload();
  await expect(page.locator(".score-recovery")).toContainText(
    "waiting to save",
  );
  const tries = submissions.length;
  user = { id: 702, username: "SecondPlayer" };
  await page.reload();
  await expect(page.locator(".profile-link")).toContainText("SecondPlayer");
  await expect(page.locator(".score-recovery")).toHaveCount(0);
  expect(submissions).toHaveLength(tries);
  user = { id: 701, username: "RecoveryPlayer" };
  online = true;
  await page.reload();
  await expect.poll(() => submissions.length).toBe(tries + 1);
  await expect(page.locator(".score-recovery")).toHaveCount(0);
  expect(new Set(submissions.map((r) => r.runId)).size).toBe(1);
  expect(submissions.every((r) => r.expectedUserId === 701)).toBe(true);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) =>
          k.startsWith("afterhours:score-outbox"),
        ).length,
    ),
  ).toBe(0);
});
