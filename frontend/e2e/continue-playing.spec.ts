import { test, expect } from "@playwright/test";
test("Chess and Checkers resume exact local matches, orientation and takeback from the shelf", async ({
  page,
}) => {
  for (const [id, name, from, to] of [
    ["chess", "Chess", "e2", "e4"],
    ["checkers", "Checkers", "a3", "b4"],
  ]) {
    await page.goto(`/#/play/${id}`);
    await page
      .getByRole("button", { name: "Pass & play", exact: true })
      .click();
    const origin = page.getByRole("button", { name: new RegExp(`^${from},`) }),
      original = await origin.getAttribute("aria-label");
    await origin.click();
    await page
      .getByRole("button", { name: new RegExp(`^${to},.*legal move`) })
      .click();
    await page
      .getByRole("button", { name: "Flip board", exact: false })
      .click();
    await expect(page.locator(".classic-save-note")).toContainText(
      "Match saved on this device",
    );
    const labels = await page
        .locator("[data-square]")
        .evaluateAll((cells) => cells.map((c) => c.getAttribute("aria-label"))),
      first = await page
        .locator("[data-square]")
        .first()
        .getAttribute("data-square");
    await page
      .getByRole("link", { name: "Back to the arcade", exact: true })
      .click();
    const shelf = page.getByRole("region", { name: "Continue playing" });
    await expect(shelf).toContainText(name);
    await expect(shelf).toContainText("Pass & play · 1 move");
    await shelf.locator(`a[href="#/play/${id}"]`).click();
    await expect(
      page.getByRole("button", { name: "Pass & play", exact: true }),
    ).toHaveClass("active");
    expect(
      await page
        .locator("[data-square]")
        .evaluateAll((cells) => cells.map((c) => c.getAttribute("aria-label"))),
    ).toEqual(labels);
    await expect(page.locator("[data-square]").first()).toHaveAttribute(
      "data-square",
      first!,
    );
    await page.getByRole("button", { name: "Take back", exact: false }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(`^${from},`) }),
    ).toHaveAttribute("aria-label", original!);
  }
});

test("Fourfold keeps its local drops and takeback when reopened from the shelf", async ({
  page,
}) => {
  await page.goto("/#/play/fourfold");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  await page
    .getByRole("button", { name: "Drop in column 3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Drop in column 4", exact: true })
    .click();
  await expect(page.locator(".classic-save-note")).toBeVisible();
  const before = await page
    .locator("[data-disc]")
    .evaluateAll((cells) => cells.map((c) => c.getAttribute("data-disc")));
  await page
    .getByRole("link", { name: "Back to the arcade", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Continue playing" })
    .locator('a[href="#/play/fourfold"]')
    .click();
  await expect(page.locator("[data-disc]")).toHaveCount(before.length);
  expect(
    await page
      .locator("[data-disc]")
      .evaluateAll((cells) => cells.map((c) => c.getAttribute("data-disc"))),
  ).toEqual(before);
  await page.getByRole("button", { name: "Take back", exact: false }).click();
  await expect(page.locator('[data-disc="1"],[data-disc="2"]')).toHaveCount(1);
});
