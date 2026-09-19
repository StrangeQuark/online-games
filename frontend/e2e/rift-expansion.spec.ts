import { expect, test, type Page } from "@playwright/test";

test.setTimeout(150_000);
const arenas = [
  ["foundry", "Ion Foundry"],
  ["aqueduct", "Mosswater Aqueduct"],
  ["citadel", "Ember Citadel"],
  ["orbital", "Orbital Array"],
] as const;
const canvas = (page: Page) => page.locator(".rift-stage canvas");
const value = async (page: Page, key: string) =>
  Number(await canvas(page).getAttribute(`data-${key}`));
async function setup(page: Page, name: string) {
  await page.clock.install();
  await page.goto("/#/play/rift");
  await expect(
    page.getByRole("button", { name: "Enter the arena" }),
  ).toBeVisible();
  await page.clock.pauseAt(
    new Date((await page.evaluate(() => Date.now())) + 1000),
  );
  await page
    .getByRole("button", { name: `Select ${name}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `Select ${name}`, exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sentinels on", exact: true }).click();
  await page.getByRole("button", { name: "Enter the arena" }).click();
  await page.clock.runFor(100);
}
async function hold(page: Page, keys: string[], milliseconds: number) {
  for (const key of keys) await page.keyboard.down(key);
  await page.clock.runFor(milliseconds);
  for (const key of keys) await page.keyboard.up(key);
}

for (const [id, name] of arenas) {
  test(`${name} loads its own 3D world, has six weapon slots, and supports sprinting`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await setup(page, name);
    await expect(canvas(page)).toHaveAttribute("data-map", id);
    await expect(page.locator(".rift-weapon-slot")).toHaveCount(6);
    await expect(
      page.getByRole("button", { name: `Select ${name}`, exact: true }),
    ).toHaveCount(0);
    const x = await value(page, "x"),
      z = await value(page, "z");
    await hold(page, ["KeyW", "Shift"], 600);
    expect(
      Math.hypot((await value(page, "x")) - x, (await value(page, "z")) - z),
    ).toBeGreaterThan(1.5);
    expect(await value(page, "stamina")).toBeLessThan(95);
    const stamina = await value(page, "stamina");
    await page.clock.runFor(500);
    expect(await value(page, "stamina")).toBeGreaterThan(stamina);
    await expect(
      page.getByRole("meter", { name: "Sprint stamina" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/rift-${id}-expanded.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("the host changes arenas between rounds and the guest receives the new map and sprint state", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const errors: string[] = [];
  let guestId = "",
    latestMap = "",
    remoteStamina = 100,
    remoteSprint = false;
  for (const page of [host, guest])
    page.on("pageerror", (error) => errors.push(error.message));
  host.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      const packet = JSON.parse(String(payload));
      if (packet.type !== "state" || packet.state?.game !== "rift") return;
      latestMap = packet.state.match.mapId;
      const actor = packet.state.match.actors.find(
        (a: { id: string }) => a.id === guestId,
      );
      if (actor) {
        remoteStamina = actor.stamina;
        remoteSprint = actor.sprinting;
      }
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
      .getByRole("button", { name: "Select Mosswater Aqueduct", exact: true })
      .click();
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
    await expect(canvas(guest)).toHaveAttribute("data-map", "aqueduct");
    await expect(
      guest.getByRole("button", { name: "Select Orbital Array", exact: true }),
    ).toBeDisabled();
    await guest.getByRole("button", { name: "Enter the arena" }).click();
    await expect(guest.locator(".rift-waiting")).toBeVisible();
    await host.getByRole("button", { name: "Enter the arena" }).click();
    await expect(guest.locator(".rift-waiting")).not.toBeVisible();
    await guest.keyboard.down("KeyW");
    await guest.keyboard.down("Shift");
    await expect.poll(() => remoteStamina).toBeLessThan(95);
    expect(remoteSprint).toBe(true);
    await guest.keyboard.up("Shift");
    await guest.keyboard.up("KeyW");
    const previousRound = await canvas(guest).getAttribute("data-round");
    await host.getByRole("button", { name: "New match", exact: true }).click();
    await host
      .getByRole("button", { name: "Select Orbital Array", exact: true })
      .click();
    await expect(canvas(guest)).toHaveAttribute("data-map", "orbital");
    await expect.poll(() => latestMap).toBe("orbital");
    await expect(canvas(guest)).not.toHaveAttribute(
      "data-round",
      previousRound!,
    );
    await expect(guest.locator(".rift-waiting")).toBeVisible();
    await expect.poll(() => remoteStamina).toBe(100);
    await host.getByRole("button", { name: "Enter the arena" }).click();
    await expect(guest.locator(".rift-waiting")).not.toBeVisible();
    await guest.keyboard.down("Space");
    await expect
      .poll(() => value(guest, "y"), { intervals: [30, 50, 100] })
      .toBeGreaterThan(0.5);
    await guest.keyboard.up("Space");
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

// Navigate authored routes with ordinary keyboard input, correcting only from the
// same read-only position telemetry used by the HUD. No game-state injection.
async function walkTo(page: Page, x: number, z: number) {
  for (const [axis, target, positive, negative] of [
    ["x", x, "KeyD", "KeyA"],
    ["z", z, "KeyS", "KeyW"],
  ] as const) {
    for (let tries = 0; tries < 50; tries++) {
      const before = await value(page, axis),
        delta = target - before;
      if (Math.abs(delta) < 0.18) break;
      const speed = 6.2 * ((await value(page, "speed")) > 0 ? 1.35 : 1);
      await hold(
        page,
        [delta > 0 ? positive : negative],
        Math.min(400, Math.max(20, (Math.abs(delta) / speed) * 1000)),
      );
      if (tries > 1 && Math.abs((await value(page, axis)) - before) < 0.01)
        throw new Error(
          `Blocked walking ${axis}=${target} at ${before}, height ${await value(page, "y")}`,
        );
      if (tries === 49) throw new Error(`Did not reach ${axis}=${target}`);
    }
  }
  await page.clock.runFor(100);
}

test("Citadel pickups power sprint, plasma, jet flight, rail fire and a temporary cloak", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page, "Ember Citadel");
  await walkTo(page, -25, 28);
  await walkTo(page, 0, 28);
  expect(await value(page, "speed")).toBeGreaterThan(16);
  await expect(page.locator(".perk-speed")).toContainText("OVERDRIVE");
  await walkTo(page, 0, 0);
  await expect(canvas(page)).toHaveAttribute("data-weapon", "plasma");
  expect(await value(page, "y")).toBeCloseTo(3, 1);
  const plasmaShots = await value(page, "shots");
  await hold(page, ["KeyF"], 300);
  expect(await value(page, "shots")).toBeGreaterThan(plasmaShots + 1);
  await page.keyboard.press("KeyR");
  await page.clock.runFor(100);
  await expect(page.locator(".rift-reload")).toBeVisible();
  await page.clock.runFor(1800);
  await expect(page.locator(".rift-reload")).not.toBeVisible();
  await walkTo(page, 0, -6);
  expect(await value(page, "jetpack")).toBeGreaterThan(20);
  await hold(page, ["Space"], 900);
  expect(await value(page, "y")).toBeGreaterThan(5.5);
  expect(await value(page, "fuel")).toBeLessThan(85);
  await expect(canvas(page)).toHaveAttribute("data-thrusting", "true");
  await page.screenshot({
    path: "test-results/rift-jetpack.png",
    fullPage: true,
  });
  await page.clock.runFor(1500);
  await walkTo(page, 0, -23);
  expect(await value(page, "y")).toBeCloseTo(6, 1);
  await expect(canvas(page)).toHaveAttribute("data-weapon", "rail");
  await page.keyboard.press("Digit4");
  await page.clock.runFor(100);
  await expect(canvas(page)).toHaveAttribute("data-weapon", "plasma");
  await page.keyboard.press("Digit5");
  await page.clock.runFor(100);
  await expect(canvas(page)).toHaveAttribute("data-weapon", "rail");
  const railShots = await value(page, "shots");
  await hold(page, ["KeyF"], 300);
  expect(await value(page, "shots")).toBe(railShots + 1);
  await page.screenshot({ path: "test-results/rift-rail.png", fullPage: true });
  await walkTo(page, 0, -28);
  await page.clock.runFor(1000);
  await walkTo(page, 0, -25);
  expect(await value(page, "y")).toBe(0);
  expect(await value(page, "invisibility")).toBeGreaterThan(14);
  await expect(page.locator(".perk-invisibility")).toContainText("CLOAKED");
  await hold(page, ["KeyF"], 100);
  expect(await value(page, "revealed")).toBeGreaterThan(0);
  await page.clock.runFor(2400);
  await expect(page.locator(".perk-invisibility")).toContainText("CLOAKED");
  await page.clock.runFor(13000);
  expect(await value(page, "invisibility")).toBe(0);
  await expect(page.locator(".perk-invisibility")).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("the expanded Foundry has a collectible grenade launcher with firing and reload controls", async ({
  page,
}) => {
  await setup(page, "Ion Foundry");
  await walkTo(page, -11, 23.5);
  await walkTo(page, 0, 23.5);
  await walkTo(page, 0, 22);
  await expect(canvas(page)).toHaveAttribute("data-weapon", "grenade");
  await expect(page.locator(".rift-notice")).toContainText(
    "BREACH LAUNCHER ACQUIRED",
  );
  const shots = await value(page, "shots");
  await hold(page, ["KeyF"], 100);
  expect(await value(page, "shots")).toBe(shots + 1);
  await page.keyboard.press("KeyR");
  // Allow a complete HUD refresh interval after the queued key press.
  await page.clock.runFor(200);
  await expect(page.locator(".rift-reload")).toBeVisible();
  await page.screenshot({
    path: "test-results/rift-grenade-reload.png",
    fullPage: true,
  });
  await page.clock.runFor(2300);
  await expect(page.locator(".rift-reload")).not.toBeVisible();
  await expect(page.locator(".rift-ammo strong")).toContainText("5");
});
