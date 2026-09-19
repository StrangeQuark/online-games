import { expect, test, type Page } from "@playwright/test";
import type { Expedition } from "../src/games/custom/starfall/engine";
import { cleanupAccounts } from "./cleanup";
import missionOne from "./fixtures/starfall-mission-one.json" with { type: "json" };
import {
  BUILDABLE,
  STRUCTURES,
  type StructureKind,
} from "../src/games/custom/starfall/catalog";
const createdUsers: string[] = [];
test.afterAll(() => cleanupAccounts(createdUsers));

function trackState(page: Page) {
  const tracked = { game: null as Expedition | null };
  page.on("websocket", (socket) => {
    const read = ({ payload }: { payload: string | Buffer }) => {
      const packet = JSON.parse(String(payload));
      if (packet.type === "state" && packet.state?.game === "starfall")
        tracked.game = packet.state.expedition;
    };
    socket.on("framesent", read);
    socket.on("framereceived", read);
  });
  return tracked;
}
async function createRoom(page: Page) {
  await page.getByRole("button", { name: "Create room", exact: true }).click();
  await expect(page.locator(".room-connected")).toContainText("You’re hosting");
  return (await page.locator(".room-connected strong").innerText()).replace(
    "ROOM ",
    "",
  );
}
async function sector(page: Page, x: number, y: number) {
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.click(
    box.x + box.width / 2 + (x - 900) * 0.85,
    box.y + box.height / 2 + (y - 600) * 0.85,
  );
}
async function build(page: Page, index: number, x: number, y: number) {
  await page.locator(".sf-build-bar button").nth(index).click();
  await sector(page, x, y);
}

test("training teaches live construction, queued orders, upgrades, and completes through real controls", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const state = trackState(page);
  await page.clock.install();
  await page.goto("/#/play/starfall");
  await createRoom(page);
  await page.getByRole("button", { name: "Begin training" }).click();
  await page.getByRole("button", { name: "Ⅱ Pause" }).click();
  await sector(page, 848, 610);
  await expect(page.locator(".sf-selected-title")).toContainText(
    "Mineral miner",
  );
  await build(page, 1, 939, 545);
  await page.clock.runFor(1000);
  expect(state.game?.structures.at(-1)?.progress).toBe(0);
  expect(state.game?.paused).toBe(true);
  await build(page, 2, 993, 574);
  await page.getByRole("button", { name: "▶ Resume" }).click();
  await page.clock.runFor(10_000);
  await expect(page.locator(".sf-objective")).toContainText("Upgrade a miner");
  await sector(page, 848, 610);
  await page.keyboard.press("u");
  await page.clock.runFor(5000);
  await expect(page.locator(".sf-selected-title")).toContainText("LEVEL 2");
  await build(page, 5, 843, 544);
  await page.clock.runFor(40_000);
  await expect(page.locator(".custom-overlay")).toContainText(
    "Ready for the belt",
  );
  expect(state.game?.won).toBe(true);
  expect(state.game?.mined).toBeGreaterThanOrEqual(120);
  await page.getByRole("button", { name: "First mission" }).click();
  await expect(page.locator(".sf-objective")).toContainText("1,700 minerals");
  await expect.poll(() => state.game?.structures.length).toBe(1);
  expect(errors).toEqual([]);
});

test("a late-join commander builds, upgrades, and recycles in the host's live power network", async ({
  browser,
  baseURL,
}) => {
  const hc = await browser.newContext({ baseURL }),
    gc = await browser.newContext({ baseURL });
  const host = await hc.newPage(),
    guest = await gc.newPage();
  const tracked = trackState(host);
  const errors: string[] = [];
  for (const p of [host, guest])
    p.on("pageerror", (e) => errors.push(String(e)));
  try {
    await host.goto("/#/play/starfall");
    const room = await createRoom(host);
    await host.getByRole("button", { name: "Begin training" }).click();
    await guest.goto(`/#/play/starfall?room=${room}`);
    await expect(guest.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await expect(guest.getByRole("button", { name: "Ⅱ Pause" })).toBeDisabled();
    await build(guest, 2, 990, 590);
    await expect(host.locator(".sf-message")).toContainText(
      "Solar station construction queued",
    );
    await expect(guest.locator(".sf-message")).toContainText(
      "Solar station construction queued",
    );
    await expect.poll(() => tracked.game?.structures.at(-1)?.progress).toBe(1);
    await sector(guest, 990, 590);
    await guest.getByRole("button", { name: "Level 2 · 200 minerals" }).click();
    await expect.poll(() => tracked.game?.structures.at(-1)?.level).toBe(2);
    await expect(guest.locator(".sf-selected-title")).toContainText("LEVEL 2");
    await guest.getByRole("button", { name: /^Recycle/ }).click();
    await expect.poll(() => tracked.game?.structures.length).toBe(2);
    await expect(guest.locator(".sf-message")).toContainText(
      "Recycled 1 station",
    );
    expect(errors).toEqual([]);
  } finally {
    await hc.close();
    await gc.close();
  }
});

test("camera, minimap, branch upgrades, sandbox fleets, and persistent settings are usable", async ({
  page,
}) => {
  const state = trackState(page);
  await page.goto("/#/play/starfall");
  await createRoom(page);
  await page.getByRole("button", { name: /Sandbox An open workshop/ }).click();
  await page.getByRole("button", { name: "Launch expedition" }).click();
  await build(page, 5, 843, 544);
  await sector(page, 843, 544);
  await page.keyboard.press("t");
  await expect(page.locator(".sf-selected-title")).toContainText(
    "Tactical heavy-energy laser",
  );
  await page.getByRole("button", { name: "Level 2 · 800 minerals" }).click();
  await expect(page.locator(".sf-selected-title")).toContainText("LEVEL 2");
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  await canvas.focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page
    .getByRole("button", { name: "Center view on starting solar station" })
    .click();
  await sector(page, 843, 544);
  await expect(page.locator(".sf-selected-title")).toContainText(
    "Tactical heavy-energy laser",
  );
  await page.getByRole("button", { name: "Fleet 2", exact: true }).click();
  await expect.poll(() => state.game?.incoming.length).toBeGreaterThan(0);
  await expect(page.locator(".sf-warning")).toContainText("Red fighters");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Energy links", { exact: true }).uncheck();
  await page.getByLabel("Distinct enemy markings", { exact: true }).check();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByLabel("Energy links", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Distinct enemy markings", { exact: true }),
  ).toBeChecked();
});

test("a full funded campaign harvest saves once, charts the economy, and excludes late arrivals", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const username = `StarE2E_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const password = "Starfall-test-password-42";
  expect(
    (
      await page.request.post("/api/auth/enroll", {
        data: { username, password, confirmPassword: password },
      })
    ).ok(),
  ).toBe(true);
  createdUsers.push(username);
  const state = trackState(page);
  await page.clock.install({ time: new Date("2026-09-06T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-09-06T12:00:01Z"));
  await page.goto("/#/play/starfall");
  const room = await createRoom(page);
  await page.getByRole("button", { name: /Missions Nine operations/ }).click();
  await page.getByRole("button", { name: "Launch expedition" }).click();
  let elapsed = 0;
  const advance = async (seconds: number) => {
    await page.clock.runFor(Math.ceil(seconds * 1000));
    elapsed += seconds;
  };
  await advance(0.2);
  await expect.poll(() => state.game?.started).toBe(true);
  // Zoom with the actual wheel control so the whole seeded field can be operated.
  await page.locator("canvas").scrollIntoViewIfNeeded();
  let box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const wheelDelta = 290;
  await page.mouse.wheel(0, wheelDelta);
  await advance(0.2);
  const zoom = 0.85 * Math.exp(-wheelDelta * 0.0015);
  const click = async (x: number, y: number) => {
    await page.locator("canvas").scrollIntoViewIfNeeded();
    box = (await page.locator("canvas").boundingBox())!;
    await page.mouse.click(
      box.x + box.width / 2 + (x - 900) * zoom,
      box.y + box.height / 2 + (y - 600) * zoom,
    );
  };
  for (const action of missionOne) {
    if (state.game?.ended) break;
    if (action.time + 0.5 > elapsed) await advance(action.time + 0.5 - elapsed);
    const kind = action.kind as StructureKind;
    if (action.type === "build") {
      for (
        let attempts = 0;
        attempts < 80 &&
        !state.game?.ended &&
        (state.game?.ore ?? 0) < STRUCTURES[kind].cost;
        attempts++
      ) {
        const depleted = state.game?.structures.find(
          (n) => n.kind === "miner" && n.depleted,
        );
        if (depleted) {
          await page.keyboard.press("Escape");
          await click(depleted.x, depleted.y);
          await page.getByRole("button", { name: /^Recycle/ }).click();
          await advance(0.2);
        } else await advance(2);
      }
      if (state.game?.ended) break;
      if (kind !== "solar") {
        for (
          let attempts = 0;
          attempts < 80 &&
          !state.game?.structures.some(
            (n) =>
              n.connected &&
              n.progress === 1 &&
              Math.hypot(n.x - action.x, n.y - action.y) <= 110,
          );
          attempts++
        )
          await advance(0.25);
      }
      expect(
        state.game?.ore,
        `fund ${kind} at ${action.time}s`,
      ).toBeGreaterThanOrEqual(STRUCTURES[kind].cost);
      await page
        .locator(".sf-build-bar button")
        .nth(BUILDABLE.indexOf(kind))
        .click();
      await click(action.x, action.y);
      await advance(0.15);
      await expect
        .poll(() =>
          state.game?.structures.some(
            (n) =>
              n.kind === kind && Math.hypot(n.x - action.x, n.y - action.y) < 4,
          ),
        )
        .toBe(true);
    } else {
      const current = state.game?.structures.find(
        (n) => Math.hypot(n.x - action.x, n.y - action.y) < 4,
      );
      if (!current) continue; // Recycling all exhausted miners can remove a later planned selection.
      if (action.type === "upgrade" && current.depleted) continue;
      await click(action.x, action.y);
      if (action.type === "upgrade") {
        const upgrade = page.locator(".sf-station-actions .primary").first();
        for (
          let attempts = 0;
          attempts < 4 && !state.game?.ended && !(await upgrade.isEnabled());
          attempts++
        )
          await advance(1);
        if (state.game?.ended) break;
        if (await upgrade.isEnabled()) await upgrade.click();
      } else await page.getByRole("button", { name: /^Recycle/ }).click();
      await advance(0.15);
    }
  }
  for (let i = 0; i < 12 && !state.game?.ended; i++) await advance(5);
  await expect(page.locator(".custom-overlay")).toContainText(
    "Operation complete",
  );
  expect(state.game?.mined).toBeGreaterThanOrEqual(1700);
  expect(state.game?.history.length).toBeGreaterThan(20);
  await expect(
    page.getByRole("img", { name: "Energy reserve throughout the expedition" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Round saved to your player page." }),
  ).toBeVisible();
  const expectedScore = Number(
    (await page.locator(".custom-overlay h3").innerText()).replace(
      /[^0-9]/g,
      "",
    ),
  );
  const lateContext = await browser.newContext({ baseURL });
  try {
    const late = await lateContext.newPage();
    await late.goto(`/#/play/starfall?room=${room}`);
    await expect(late.locator(".room-connected")).toContainText(
      "You’re connected",
    );
    await expect(late.locator(".custom-overlay h3")).toHaveText("0 points");
    await expect(late.locator(".score-notice")).not.toBeVisible();
  } finally {
    await lateContext.close();
  }
  await page.getByRole("link", { name: "Your hiscores & history" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("mission 1");
  await expect(
    page.locator(".personal-bests a").filter({ hasText: "Starfall" }),
  ).toContainText(expectedScore.toLocaleString());
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("touch commanders can zoom, select, build, and reach every blueprint without overflow", async ({
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
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto("/#/play/starfall");
    await page.getByRole("button", { name: "Begin training" }).tap();
    await page.getByRole("button", { name: "Ⅱ Pause" }).tap();
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: "Zoom in", exact: true }).tap();
    const zoom = 0.85 * 1.25 ** 3;
    const canvas = page.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await canvas.tap({
      position: { x: box.width / 2 - 52 * zoom, y: box.height / 2 + 10 * zoom },
    });
    await expect(page.locator(".sf-selected-title")).toContainText(
      "Mineral miner",
    );
    await page.locator(".sf-build-bar button").nth(1).tap();
    await canvas.scrollIntoViewIfNeeded();
    await canvas.tap({
      position: { x: box.width / 2 + 39 * zoom, y: box.height / 2 - 55 * zoom },
    });
    await expect(page.locator(".sf-message")).toContainText(
      "Mineral miner construction queued",
    );
    await page.locator(".sf-build-bar button").last().tap();
    await expect(page.locator(".sf-build-bar button").last()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
