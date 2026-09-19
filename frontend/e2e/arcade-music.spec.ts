import { test, expect } from "@playwright/test";
test("original background music starts by gesture, mutes independently, and releases every audio context", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const w = window as typeof window & {
      musicContexts: AudioContext[];
      musicNotes: number;
    };
    w.musicContexts = [];
    w.musicNotes = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        w.musicContexts.push(this);
        const original = this.createOscillator.bind(this);
        this.createOscillator = () => {
          w.musicNotes++;
          return original();
        };
      }
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const id of [
    "neonbreak",
    "lumen",
    "petal",
    "driftline",
    "pocketputt",
    "wispwood",
    "parcel",
    "keepsake",
    "mosaic",
  ]) {
    await page.goto(`/#/play/${id}`);
    await expect(
      page.getByRole("button", { name: "Play music", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as any).musicContexts.filter(
            (c: AudioContext) => c.state !== "closed",
          ).length,
      ),
    ).toBe(0);
    await page.getByRole("button", { name: "Play music", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause music", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as any).musicContexts.some(
            (c: AudioContext) => c.state === "running",
          ),
        ),
      )
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => (window as any).musicNotes))
      .toBeGreaterThan(3);
    await page
      .getByRole("button", { name: "Enable game sounds", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pause music", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Mute game sounds", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Play music", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page
      .getByRole("link", { name: "Back to the arcade", exact: true })
      .click();
    await expect(page.locator(".play-page")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as any).musicContexts.every(
            (c: AudioContext) => c.state === "closed",
          ),
        ),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});
