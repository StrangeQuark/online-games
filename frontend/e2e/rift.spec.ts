import { expect, test, type Page } from "@playwright/test";
test.setTimeout(120_000);

async function freezeClock(page: Page) {
  await page.clock.install();
}
async function enter(page: Page) {
  const button = page.getByRole("button", { name: "Enter the arena" });
  await expect(button).toBeVisible();
  // Pause after React's lazy module has loaded, before the round starts.
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 1000));
  await button.click();
}

async function value(page: Page, key: string) {
  return Number(
    await page.locator(".rift-stage canvas").getAttribute(`data-${key}`),
  );
}
async function advance(page: Page, ms: number) {
  await page.clock.runFor(ms);
}
test("Rift renders a 3D arena with jumping, free vertical aim and collectible weapons", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await freezeClock(page);
  await page.goto("/#/play/rift");
  await enter(page);
  await advance(page, 100);
  await page.keyboard.down("Space");
  await advance(page, 300);
  expect(await value(page, "y")).toBeGreaterThan(1);
  await page.keyboard.up("Space");
  await advance(page, 600);
  expect(await value(page, "y")).toBe(0);
  await expect(page.locator("canvas")).toHaveAttribute("data-grounded", "true");
  await page.keyboard.down("ArrowUp");
  await advance(page, 350);
  await page.keyboard.up("ArrowUp");
  expect(await value(page, "pitch")).toBeGreaterThan(0.4);
  await page.keyboard.down("ArrowDown");
  await advance(page, 350);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("KeyW");
  await advance(page, 580);
  await page.keyboard.up("KeyW");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-weapon",
    "shotgun",
  );
  await expect(page.locator(".rift-notice")).toContainText(
    "SCATTERGUN ACQUIRED",
  );
  await page.keyboard.down("KeyF");
  await advance(page, 500);
  await page.keyboard.up("KeyF");
  expect(await value(page, "shots")).toBeGreaterThan(0);
  await page.keyboard.press("KeyR");
  await advance(page, 100);
  await expect(page.locator(".rift-reload")).toContainText("RELOADING");
  await advance(page, 1900);
  await expect(page.locator(".rift-reload")).not.toBeVisible();
  await page.screenshot({
    path: "test-results/rift-foundry-floor.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("Rift climbs a side ramp, collects upper-floor rockets, and drops back down", async ({
  page,
}) => {
  await freezeClock(page);
  await page.goto("/#/play/rift");
  await enter(page);
  // Start in the south court, take the west ramp, then the upper rocket cache.
  await page.keyboard.down("KeyS");
  await advance(page, 500);
  await page.keyboard.up("KeyS");
  await page.keyboard.down("KeyA");
  await advance(page, 970);
  await page.keyboard.up("KeyA");
  await page.keyboard.down("KeyW");
  await advance(page, 3500);
  await page.keyboard.up("KeyW");
  expect(await value(page, "y")).toBeCloseTo(4.5, 1);
  await expect(page.locator("canvas")).toHaveAttribute("data-weapon", "rocket");
  await expect(page.locator(".rift-location")).toContainText("UPPER GALLERIES");
  await page.keyboard.down("ArrowRight");
  await advance(page, 500);
  await page.keyboard.up("ArrowRight");
  await page.screenshot({
    path: "test-results/rift-upper-gallery.png",
    fullPage: true,
  });
  await page.keyboard.down("ArrowLeft");
  await advance(page, 500);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("KeyD");
  await advance(page, 950);
  await page.keyboard.up("KeyD");
  await advance(page, 1000);
  expect(await value(page, "y")).toBeLessThan(0.1);
});

test("Rift central stairs lead to a real armor pickup", async ({ page }) => {
  await freezeClock(page);
  await page.goto("/#/play/rift");
  // Isolate the stair and pickup route from bot competition for this armor.
  await page.getByRole("button", { name: "Sentinels on", exact: true }).click();
  await enter(page);
  await page.keyboard.down("KeyS");
  await advance(page, 800);
  await page.keyboard.up("KeyS");
  await page.keyboard.down("KeyD");
  await advance(page, 1780);
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyW");
  await advance(page, 2650);
  await page.keyboard.up("KeyW");
  // The pickup is collected in the last few simulation frames; let the 10 Hz HUD refresh.
  await advance(page, 200);
  expect(await value(page, "y")).toBeCloseTo(4.5, 1);
  await expect(page.locator(".rift-notice")).toContainText("+60 ARMOR");
  expect(
    Number(
      await page.locator(".rift-vitals meter").nth(1).getAttribute("value"),
    ),
  ).toBeGreaterThan(0);
});

test("Rift mouse capture looks both ways, releases with Escape, and enters fullscreen", async ({
  page,
}) => {
  await freezeClock(page);
  await page.goto("/#/play/rift");
  await enter(page);
  const canvas = page.locator(".rift-stage canvas"),
    bounds = (await canvas.boundingBox())!;
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe("CANVAS");
  const before = await value(page, "pitch");
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 50,
    bounds.y + bounds.height / 2 - 45,
    { steps: 5 },
  );
  await advance(page, 100);
  expect(Math.abs((await value(page, "pitch")) - before)).toBeGreaterThan(0.04);
  expect(Math.abs(await value(page, "yaw"))).toBeGreaterThan(0.04);
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement === null))
    .toBe(true);
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.classList.contains("rift-stage"),
      ),
    )
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
});

test("Rift touch movement, jump, look pad and firing work on a small screen", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    const touch = await context.newCDPSession(page);
    const press = async (locator: import("@playwright/test").Locator) => {
      await locator.scrollIntoViewIfNeeded();
      const box = (await locator.boundingBox())!;
      const point = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        id: 1,
      };
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      return point;
    };
    const release = () =>
      touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    await freezeClock(page);
    await page.goto("/#/play/rift");
    await enter(page);
    await expect(page.locator(".rift-touch-controls")).toBeVisible();
    await press(page.getByRole("button", { name: "JUMP", exact: true }));
    await advance(page, 250);
    expect(await value(page, "y")).toBeGreaterThan(0.9);
    await release();
    await advance(page, 600);
    expect(await value(page, "y")).toBe(0);
    const point = await press(
      page.getByRole("application", { name: "Drag to look around" }),
    );
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...point, x: point.x + 35, y: point.y - 35 }],
    });
    await release();
    await advance(page, 100);
    expect(await value(page, "pitch")).toBeGreaterThan(0.25);
    expect(await value(page, "yaw")).toBeLessThan(-0.2);
    await press(page.getByRole("button", { name: "FIRE", exact: true }));
    await advance(page, 300);
    await release();
    expect(await value(page, "shots")).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/rift-mobile.png",
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("Rift guests collect shared ammo and relay real jumps, vertical aim and firing", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL }),
    guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  type Remote = {
    id: string;
    x: number;
    y: number;
    z: number;
    pitch: number;
    grounded: boolean;
    shots: number;
    weapon: string;
    inventory: Record<string, { reserve: number }>;
  };
  let guestId = "",
    actors: Remote[] = [];
  const errors: string[] = [];
  for (const page of [host, guest])
    page.on("pageerror", (e) => errors.push(String(e)));
  host.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      const packet = JSON.parse(String(payload));
      if (packet.type === "state" && packet.state?.game === "rift")
        actors = packet.state.match.actors;
    }),
  );
  guest.on("websocket", (socket) =>
    socket.on("framereceived", ({ payload }) => {
      const packet = JSON.parse(String(payload));
      if (packet.type === "joined") guestId = packet.playerId;
    }),
  );
  try {
    await host.goto("/#/play/rift");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.locator(".room-connected")).toContainText(
      "You’re hosting",
    );
    const room = (
      await host.locator(".room-connected strong").innerText()
    ).replace("ROOM ", "");
    await guest.goto(`/#/play/rift?room=${room}`);
    await expect(guest.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await guest.getByRole("button", { name: "Enter the arena" }).click();
    await expect.poll(() => actors.some((a) => a.id === guestId)).toBe(true);
    const own = () => actors.find((a) => a.id === guestId)!;
    // Wait for friends before starting: the untouched spawn is beside the upper ammo pad.
    expect(own().x).toBeCloseTo(0);
    expect(own().y).toBeCloseTo(4.5);
    const reserve = own().inventory.carbine.reserve;
    await host.getByRole("button", { name: "Enter the arena" }).click();
    await guest.keyboard.down("KeyW");
    await expect
      .poll(() => own().inventory.carbine.reserve)
      .toBeGreaterThan(reserve);
    await guest.keyboard.up("KeyW");

    const initialY = own().y;
    await guest.keyboard.down("Space");
    await expect
      .poll(() => own().y, { intervals: [30, 50, 100] })
      .toBeGreaterThan(initialY + 0.7);
    await guest.keyboard.up("Space");
    await expect.poll(() => own().grounded).toBe(true);
    expect(own().y).toBeCloseTo(initialY, 1);
    await guest.keyboard.down("ArrowUp");
    await expect.poll(() => own().pitch).toBeGreaterThan(0.2);
    await guest.keyboard.up("ArrowUp");
    const shots = own().shots;
    await guest.keyboard.down("KeyF");
    await expect.poll(() => own().shots).toBeGreaterThan(shots);
    await guest.keyboard.up("KeyF");
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
