import { test, expect } from "@playwright/test";
test.setTimeout(90000);

test("the 3D city supports acceleration, turning, braking, reverse, cameras, and pause", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/driftline");
  await page
    .getByRole("button", { name: "Hit the road", exact: false })
    .click();
  const canvas = page.locator(".city-stage canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl");
  await expect(canvas).toHaveAttribute("data-speed", "0.000");
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-speed")))
    .toBeGreaterThan(7);
  await page.keyboard.up("w");
  const before = Number(await canvas.getAttribute("data-x"));
  await page.keyboard.down("d");
  await page.waitForTimeout(350);
  await page.keyboard.up("d");
  expect(Number(await canvas.getAttribute("data-x"))).toBeGreaterThan(before);
  expect(Number(await canvas.getAttribute("data-heading"))).toBeGreaterThan(
    0.05,
  );
  await page.keyboard.down("s");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-speed")))
    .toBeLessThan(-1);
  await page.keyboard.up("s");
  await page.keyboard.press("c");
  await expect(canvas).toHaveAttribute("data-camera", "hood");
  await page.keyboard.press("c");
  await expect(canvas).toHaveAttribute("data-camera", "orbit");
  await page.keyboard.press("p");
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  const z = await canvas.getAttribute("data-z");
  await page.waitForTimeout(350);
  await expect(canvas).toHaveAttribute("data-z", z!);
  await expect(
    page.getByRole("heading", { name: "The city can wait." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the drive", exact: false })
    .click();
  await page.keyboard.press("r");
  await expect(canvas).toHaveAttribute("data-speed", "0.000");
  expect(errors).toEqual([]);
});

test("map routes, preferences, stable scenery, and the saved travel journal work", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/play/driftline");
  await page.getByLabel("Car color").selectOption("coral");
  await page.getByLabel("City traffic", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Hit the road", exact: false })
    .click();
  const canvas = page.locator(".city-stage canvas");
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-distance")), {
      timeout: 25000,
    })
    .toBeGreaterThan(110);
  await page.keyboard.up("w");
  await page.keyboard.press("m");
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  await expect(
    page.getByRole("heading", { name: "Explore Bellwether" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Marina Promenade.*away/ }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Explore Bellwether city map" }),
  ).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  await page.getByRole("button", { name: "City map", exact: true }).click();

  await page
    .getByRole("button", { name: "Back to the drive", exact: false })
    .click();
  await expect(page.locator(".city-minimap")).toContainText("Marina Promenade");
  await page.getByLabel("Time of day").selectOption("blue");
  await canvas.focus();
  await page.keyboard.press("p");
  await page.waitForTimeout(1500);
  const a = await canvas.screenshot();
  await page.waitForTimeout(500);
  const b = await canvas.screenshot();
  expect(a.equals(b), "Paused scenery stays identical across frames").toBe(
    true,
  );
  await page
    .getByRole("button", { name: "Finish drive", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Hit the road", exact: false }),
  ).toBeVisible();
  await expect(page.locator(".score-notice")).toContainText(/saved/i);
  const journal = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("afterhours:driftline-city-v1") || "{}"),
  );
  expect(journal.distance).toBeGreaterThan(110);
  await page.reload();
  await expect(page.getByLabel("Car color")).toHaveValue("coral");
  await expect(page.getByLabel("Time of day")).toHaveValue("blue");
  await expect(
    page.getByLabel("City traffic", { exact: true }),
  ).not.toBeChecked();
  expect(errors).toEqual([]);
});

test("mobile pedals support simultaneous throttle and steering, and release on cancel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/play/driftline");
  await page
    .getByRole("button", { name: "Hit the road", exact: false })
    .click();
  const canvas = page.locator(".city-stage canvas"),
    cdp = await page.context().newCDPSession(page);
  const gas = (await page
      .getByRole("button", { name: "Accelerate", exact: true })
      .boundingBox())!,
    right = (await page
      .getByRole("button", { name: "Right", exact: true })
      .boundingBox())!;
  const point = (r: typeof gas, id: number) => ({
    x: r.x + r.width / 2,
    y: r.y + r.height / 2,
    id,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(gas, 1), point(right, 2)],
  });
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-speed")))
    .toBeGreaterThan(3);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  expect(Number(await canvas.getAttribute("data-heading"))).toBeGreaterThan(
    0.02,
  );
  await page.getByRole("button", { name: "Pause drive", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-phase", "paused");
  await page.screenshot({
    path: "/tmp/afterhours-playtest/driftline-city-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Back to the drive", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Open city map", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back to the drive", exact: false }),
  ).toBeVisible();
  await cdp.detach();
});

test("renderer can unmount and remount and all three lighting presets render", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const light of ["golden", "day", "blue"]) {
    await page.goto("/#/play/driftline");
    await page.getByLabel("Time of day").selectOption(light);
    await page
      .getByRole("button", { name: "Hit the road", exact: false })
      .click();
    await expect(page.locator(".city-stage canvas")).toHaveAttribute(
      "data-renderer",
      "webgl",
    );
    await page.waitForTimeout(400);
    await page.locator(".city-stage").screenshot({
      path: `/tmp/afterhours-playtest/driftline-city-${light}.png`,
    });
    await page.goto("/#/play/fourfold");
    await expect(page.locator(".driftline-game")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
