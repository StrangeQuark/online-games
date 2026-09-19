import { cleanupAccounts } from "./cleanup";
import { expect, test, type Page } from "@playwright/test";

const createdUsers: string[] = [];
type ActorSnapshot = {
  id: string;
  x: number;
  y: number;
  z: number;
  flash: number;
  kills: number;
  hp: number;
};
type Snapshot = {
  game: string;
  match?: { actors: ActorSnapshot[] };
  expedition?: { structures: { id: number; kind: string; level: number }[] };
};

function trackState(page: Page) {
  const data: { snapshot: Snapshot | null; playerId: string; fired: boolean } =
    { snapshot: null, playerId: "", fired: false };
  page.on("websocket", (socket) => {
    socket.on("framesent", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "state") data.snapshot = message.state;
      if (message.type === "action" && message.action?.fire) data.fired = true;
    });
    socket.on("framereceived", ({ payload }) => {
      const message = JSON.parse(String(payload));
      if (message.type === "joined") data.playerId = message.playerId;
      if (message.type === "state") data.snapshot = message.state;
    });
  });
  return data;
}
async function createRoom(page: Page) {
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.locator(".room-connected")).toContainText("You’re hosting");
  return (await page.locator(".room-connected strong").innerText()).replace(
    "ROOM ",
    "",
  );
}
test.afterAll(() => cleanupAccounts(createdUsers));

test("Rift relays guest movement and firing to the authoritative arena", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const hostState = trackState(host),
    guestState = trackState(guest);
  const errors: string[] = [];
  for (const page of [host, guest])
    page.on("pageerror", (error) => errors.push(String(error)));
  try {
    await host.goto("/#/play/rift");
    const room = await createRoom(host);
    await host.getByRole("button", { name: "Enter the arena" }).click();
    await guest.goto(`/#/play/rift?room=${room}`);
    await expect(guest.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await guest.getByRole("button", { name: "Enter the arena" }).click();
    await expect.poll(() => hostState.snapshot?.match?.actors.length).toBe(5);
    const before = {
      ...hostState.snapshot!.match!.actors.find(
        (actor) => actor.id === guestState.playerId,
      )!,
    };
    await guest.keyboard.down("KeyW");
    await guest.keyboard.down("KeyF");
    await expect
      .poll(() => {
        const actor = hostState.snapshot?.match?.actors.find(
          (actor) => actor.id === guestState.playerId,
        );
        return actor ? Math.hypot(actor.x - before.x, actor.z - before.z) : 0;
      })
      .toBeGreaterThan(0.6);
    await guest.keyboard.up("KeyW");
    await guest.keyboard.up("KeyF");
    expect(guestState.fired).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test("original soundtracks start by gesture, toggle, and release audio on navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    (
      window as unknown as { testAudioContexts: AudioContext[] }
    ).testAudioContexts = contexts;
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
  });
  const states = () =>
    page.evaluate(() =>
      (
        window as unknown as { testAudioContexts: AudioContext[] }
      ).testAudioContexts.map((context) => context.state),
    );
  await page.goto("/#/play/starfall");
  expect(await states()).toEqual([]);
  await page.getByRole("button", { name: "♫ Sound off" }).click();
  await expect(page.getByRole("button", { name: "♫ Sound on" })).toBeVisible();
  expect(await states()).toEqual(["running"]);
  await page.getByRole("button", { name: "♫ Sound on" }).click();
  await expect(page.getByRole("button", { name: "♫ Sound off" })).toBeVisible();
  await page.getByRole("button", { name: "♫ Sound off" }).click();
  expect(await states()).toEqual(["running"]);
  await page.getByRole("link", { name: "Back to the arcade" }).click();
  await expect.poll(states).toEqual(["closed"]);
  await page.locator('a[href="#/play/rift"]').first().click();
  await page.getByRole("button", { name: "♫ Sound off" }).click();
  expect(await states()).toEqual(["closed", "running"]);
  await page.getByRole("link", { name: "Back to the arcade" }).click();
  await expect.poll(states).toEqual(["closed", "closed"]);
});

test("both custom game introductions fit on a small touch screen", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    for (const [game, start] of [
      ["starfall", "Begin training"],
      ["rift", "Enter the arena"],
    ]) {
      await page.goto(`/#/play/${game}`);
      await expect(page.getByRole("button", { name: start })).toBeVisible();
      const stage = await page.locator(".custom-stage").boundingBox();
      const panel = await page
        .locator(
          game === "starfall" ? ".sf-menu-inner" : ".custom-overlay-panel",
        )
        .boundingBox();
      expect(panel!.y).toBeGreaterThanOrEqual(stage!.y);
      expect(panel!.y + panel!.height).toBeLessThanOrEqual(
        stage!.y + stage!.height,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("button", { name: start }).click();
      await expect(page.locator(".custom-overlay")).not.toBeVisible();
    }
    await expect(page.locator(".rift-touch-controls")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("an actual completed Rift match saves once and a late arrival receives no score", async ({
  page,
  browser,
  baseURL,
}) => {
  // The browser clock executes every animation frame for the full match. No game
  // state, score, outcome, network packet, or rendering method is mocked.
  // CPU WebGL still renders every frame of the complete round.
  test.setTimeout(480_000);
  const username = `RiftE2E_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const password = "Rift-test-password-42";
  const enrollment = await page.request.post("/api/auth/enroll", {
    data: { username, password, confirmPassword: password },
  });
  expect(enrollment.ok()).toBe(true);
  createdUsers.push(username);
  await page.clock.install();
  await page.goto("/#/play/rift");
  await expect(page.locator(".profile-link")).toContainText(username);
  const room = await createRoom(page);
  await page.getByRole("button", { name: "Enter the arena" }).click();
  await page.keyboard.down("KeyF");
  await page.clock.runFor(2000);
  await page.keyboard.up("KeyF");
  await page.clock.runFor(120_000);
  await expect(page.locator(".custom-overlay")).toContainText("Match complete");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Round saved to your player page." }),
  ).toBeVisible();
  const displayed = await page.locator(".custom-overlay h3").innerText();
  const score = Number(displayed.replace(/[^0-9]/g, ""));
  const lateContext = await browser.newContext({ baseURL });
  try {
    const lateGuest = await lateContext.newPage();
    await lateGuest.goto(`/#/play/rift?room=${room}`);
    await expect(lateGuest.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await lateGuest.getByRole("button", { name: "Enter the arena" }).click();
    await expect(lateGuest.locator(".custom-overlay")).toContainText(
      "Match complete",
    );
    await expect(lateGuest.locator(".custom-overlay h3")).toHaveText(
      "0 points",
    );
    await expect(lateGuest.locator(".score-notice")).not.toBeVisible();
  } finally {
    await lateContext.close();
  }
  await page.getByRole("link", { name: "Your hiscores & history" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Rift");
  await expect(
    page.locator('.personal-bests a[href="#/play/rift"]'),
  ).toContainText(score.toLocaleString());
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
