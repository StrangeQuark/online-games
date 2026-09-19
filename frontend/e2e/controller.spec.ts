import { test, expect } from "@playwright/test";
test("standard gamepad inputs steer, jump, accelerate and pause the three action games", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    (window as any).testPad = pad;
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad] });
  });
  for (const id of ["neonbreak", "wispwood", "driftline"]) {
    await page.goto(`/#/play/${id}`);
    await page.evaluate(() => {
      (window as any).testPad.axes.fill(0);
      for (const b of (window as any).testPad.buttons) {
        b.pressed = false;
        b.value = 0;
      }
    });
    await page.waitForTimeout(50);
    await page
      .getByRole("button", {
        name:
          id === "neonbreak"
            ? "Let it glow"
            : id === "wispwood"
              ? "Into the woods"
              : "Hit the road",
        exact: false,
      })
      .click();
    const c = page.locator("canvas");
    await page.evaluate(() => {
      (window as any).testPad.axes[0] = 1;
      if (location.hash.includes("wispwood"))
        (window as any).testPad.buttons[0].pressed = true;
      if (location.hash.includes("driftline")) {
        (window as any).testPad.buttons[7].pressed = true;
        (window as any).testPad.buttons[7].value = 1;
      }
    });
    if (id === "neonbreak")
      await expect
        .poll(async () => Number(await c.getAttribute("data-paddle")))
        .toBeGreaterThan(500);
    else if (id === "wispwood") {
      await expect
        .poll(async () => Number(await c.getAttribute("data-x")))
        .toBeGreaterThan(120);
      expect(Number(await c.getAttribute("data-y"))).toBeLessThan(540);
    } else
      await expect
        .poll(async () => Number(await c.getAttribute("data-x")))
        .toBeGreaterThan(-314.8);
    await page.evaluate(() => {
      (window as any).testPad.axes[0] = 0;
      (window as any).testPad.buttons[0].pressed = false;
      (window as any).testPad.buttons[9].pressed = true;
    });
    await expect(c).toHaveAttribute("data-phase", "paused");
    await page.evaluate(() => {
      (window as any).testPad.buttons[9].pressed = false;
    });
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      (window as any).testPad.buttons[9].pressed = true;
    });
    await expect(c).toHaveAttribute(
      "data-phase",
      id === "driftline" ? "racing" : "playing",
    );
  }
});
