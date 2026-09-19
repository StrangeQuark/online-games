import { expect, test, type Page } from "@playwright/test";
import type { Match, PerkId } from "../src/games/custom/rift/engine";

const canvas = (page: Page) => page.locator(".rift-stage canvas");
const value = async (page: Page, key: string) =>
  Number(await canvas(page).getAttribute(`data-${key}`));

function receivedArena(page: Page) {
  const observed: { playerId: string; match: Match | null } = {
    playerId: "",
    match: null,
  };
  // Observe the actual server relay. No engine state, socket messages, or
  // inventory is injected by this test.
  page.on("websocket", (socket) => {
    socket.on("framereceived", ({ payload }) => {
      const packet = JSON.parse(String(payload));
      if (packet.type === "joined") observed.playerId = packet.playerId;
      if (packet.type === "state" && packet.state?.game === "rift")
        observed.match = packet.state.match;
    });
  });
  return observed;
}

async function hold(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key);
  await page.clock.runFor(milliseconds);
  await page.keyboard.up(key);
}

// Citadel's human spawn faces north. Follow actual floor, ramp and stair
// routes using only ordinary keyboard input and read-only position telemetry.
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
        delta > 0 ? positive : negative,
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

test("real peers share Citadel weapon pickups, jet fuel, cloak reveal and perk respawns", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(480_000);
  const hostContext = await browser.newContext({ baseURL }),
    guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const hostState = receivedArena(host),
    guestState = receivedArena(guest),
    errors: string[] = [];
  for (const page of [host, guest])
    page.on("pageerror", (error) => errors.push(error.message));
  const remoteHost = () =>
    guestState.match?.actors.find((actor) => actor.id === hostState.playerId);
  const remotePickup = (kind: PerkId | "plasma" | "rail") =>
    guestState.match?.pickups.find((pickup) => pickup.kind === kind);
  try {
    await host.clock.install();
    await host.goto("/#/play/rift");
    await expect(
      host.getByRole("button", { name: "Enter the arena" }),
    ).toBeVisible();
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.locator(".room-connected")).toContainText(
      "You’re hosting",
    );
    await host
      .getByRole("button", { name: "Select Ember Citadel", exact: true })
      .click();
    await host
      .getByRole("button", { name: "Sentinels on", exact: true })
      .click();
    const room = (
      await host.locator(".room-connected strong").innerText()
    ).replace("ROOM ", "");
    await guest.goto(`/#/play/rift?room=${room}`);
    await expect(guest.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await expect(canvas(guest)).toHaveAttribute("data-map", "citadel");
    await expect.poll(() => guestState.match?.actors.length).toBe(2);
    expect(guestState.match?.actors.every((actor) => !actor.bot)).toBe(true);
    await guest.getByRole("button", { name: "Enter the arena" }).click();
    await host.clock.pauseAt(
      new Date((await host.evaluate(() => Date.now())) + 1000),
    );
    await host.getByRole("button", { name: "Enter the arena" }).click();
    await host.clock.runFor(150);
    await expect(guest.locator(".rift-waiting")).not.toBeVisible();
    const round = await canvas(host).getAttribute("data-round");

    await walkTo(host, -25, 28);
    await walkTo(host, 0, 28);
    expect(await value(host, "speed")).toBeGreaterThan(16);
    await expect.poll(() => remoteHost()?.perks.speed ?? 0).toBeGreaterThan(16);
    await expect
      .poll(() => remotePickup("speed")?.remaining ?? 0)
      .toBeGreaterThan(30);

    await walkTo(host, 0, 0);
    await expect(canvas(host)).toHaveAttribute("data-weapon", "plasma");
    await expect.poll(() => remoteHost()?.inventory.plasma.owned).toBe(true);
    await expect.poll(() => remoteHost()?.weapon).toBe("plasma");
    await expect
      .poll(() => remotePickup("plasma")?.remaining ?? 0)
      .toBeGreaterThan(10);
    const fullClip = remoteHost()!.inventory.plasma.clip;
    await hold(host, "KeyF", 300);
    await host.clock.runFor(100);
    await expect
      .poll(() => remoteHost()?.inventory.plasma.clip ?? fullClip)
      .toBeLessThan(fullClip);
    await host.keyboard.press("KeyR");
    await host.clock.runFor(100);
    await expect.poll(() => remoteHost()?.reloading ?? 0).toBeGreaterThan(0);
    await host.clock.runFor(1800);
    await expect.poll(() => remoteHost()?.inventory.plasma.clip).toBe(fullClip);

    await walkTo(host, 0, -6);
    await expect
      .poll(() => remoteHost()?.perks.jetpack ?? 0)
      .toBeGreaterThan(20);
    await expect
      .poll(() => remotePickup("jetpack")?.remaining ?? 0)
      .toBeGreaterThan(38);
    await hold(host, "Space", 900);
    expect(await value(host, "y")).toBeGreaterThan(5.5);
    await expect.poll(() => remoteHost()?.thrusting).toBe(true);
    await expect.poll(() => remoteHost()?.jetFuel ?? 100).toBeLessThan(85);
    await expect.poll(() => remoteHost()?.y ?? 0).toBeGreaterThan(5.5);
    await host.clock.runFor(1800);
    await expect.poll(() => remoteHost()?.thrusting).toBe(false);
    await expect.poll(() => remoteHost()?.grounded).toBe(true);

    await walkTo(host, 0, -23);
    await expect(canvas(host)).toHaveAttribute("data-weapon", "rail");
    await expect.poll(() => remoteHost()?.inventory.rail.owned).toBe(true);
    await expect.poll(() => remoteHost()?.y).toBeCloseTo(6, 1);
    await expect
      .poll(() => remotePickup("rail")?.remaining ?? 0)
      .toBeGreaterThan(10);
    await walkTo(host, 0, -28);
    await host.clock.runFor(1000);
    await walkTo(host, 0, -25);
    expect(await value(host, "y")).toBe(0);
    await expect
      .poll(() => remoteHost()?.perks.invisibility ?? 0)
      .toBeGreaterThan(14);
    await expect
      .poll(() => remotePickup("invisibility")?.remaining ?? 0)
      .toBeGreaterThan(36);
    await expect.poll(() => remoteHost()?.revealed).toBe(0);
    await hold(host, "KeyF", 100);
    await host.clock.runFor(100);
    await expect.poll(() => remoteHost()?.revealed ?? 0).toBeGreaterThan(1);
    await host.clock.runFor(2400);
    await expect.poll(() => remoteHost()?.revealed).toBe(0);
    expect(remoteHost()!.perks.invisibility).toBeGreaterThan(0);
    await host.clock.runFor(13000);
    await expect.poll(() => remoteHost()?.perks.invisibility).toBe(0);

    // The consumed world pickup becomes available again for either player.
    const respawnIn = remotePickup("speed")!.remaining;
    await host.clock.runFor(Math.ceil(respawnIn * 1000) + 200);
    await expect.poll(() => remotePickup("speed")?.remaining).toBe(0);
    await expect.poll(() => remoteHost()?.perks.speed).toBe(0);
    expect(guestState.match?.tag).toBe(round);
    expect(guestState.match?.ended).toBe(false);
    expect(
      guestState.match?.actors.find((actor) => actor.id === guestState.playerId)
        ?.perks,
    ).toEqual({ speed: 0, invisibility: 0, jetpack: 0 });
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
