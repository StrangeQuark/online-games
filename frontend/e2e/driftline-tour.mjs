// Optional long browser drive. Run after starting the packaged site: node e2e/driftline-tour.mjs
// Inputs go through the normal controller interface; this never changes vehicle/world state.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() => {
    const pad = {
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    window.tourPad = pad;
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad] });
    localStorage.setItem("afterhours:driftline-city-traffic", "off");
  });
  await page.goto(
    process.env.TOUR_URL || "http://localhost:8080/#/play/driftline",
  );
  await page
    .getByRole("button", { name: "Hit the road", exact: false })
    .click();
  await page.evaluate(() => {
    const route = [
      [-315, 325],
      [-155, 325],
      [-155, 165],
      [5, 165],
      [5, 5],
      [325, 5],
      [325, -315],
      [635, -315],
      [635, 480],
    ];
    let waypoint = 0,
      last = performance.now(),
      frames = 0,
      total = 0;
    window.tour = { waypoint: 0, done: false, averageFrame: 0 };
    const tick = () => {
      const c = document.querySelector(".city-stage canvas"),
        g = c.dataset,
        pad = window.tourPad;
      if (g.phase !== "racing") {
        requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      total += now - last;
      last = now;
      frames++;
      if (waypoint >= route.length) {
        pad.axes[0] = 0;
        pad.buttons[7].value = 0;
        pad.buttons[0].pressed = true;
        window.tour.done = true;
        window.tour.averageFrame = total / frames;
        return;
      }
      const [x, z] = route[waypoint],
        dx = x - Number(g.x),
        dz = z - Number(g.z),
        d = Math.hypot(dx, dz);
      if (d < 7) {
        waypoint++;
        window.tour.waypoint = waypoint;
        requestAnimationFrame(tick);
        return;
      }
      const nearX =
          Math.abs(dx) > Math.abs(dz)
            ? Number(g.x) + Math.sign(dx) * Math.min(Math.abs(dx), 22)
            : x,
        nearZ =
          Math.abs(dz) >= Math.abs(dx)
            ? Number(g.z) + Math.sign(dz) * Math.min(Math.abs(dz), 22)
            : z;
      const desired = Math.atan2(nearX - Number(g.x), -(nearZ - Number(g.z))),
        error = Math.atan2(
          Math.sin(desired - Number(g.heading)),
          Math.cos(desired - Number(g.heading)),
        ),
        speed = Math.abs(error) > 0.3 || d < 24 ? 5 : 15;
      const steer = Math.max(-1, Math.min(1, error * 2.4));
      pad.axes[0] =
        Math.abs(steer) > 0.001
          ? Math.sign(steer) * (0.12 + Math.abs(steer) * 0.88)
          : 0;
      pad.buttons[7].value = Number(g.speed) < speed ? 0.75 : 0;
      pad.buttons[6].value = Number(g.speed) > speed + 0.5 ? 0.5 : 0;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  let lastWaypoint = -1;
  for (let i = 0; i < 480; i++) {
    const tour = await page.evaluate(() => window.tour);
    if (i % 20 === 0)
      console.log(
        "PROGRESS",
        JSON.stringify(
          await page
            .locator(".city-stage canvas")
            .evaluate((c) => ({ ...c.dataset })),
        ),
      );
    if (tour.waypoint !== lastWaypoint) {
      console.log("waypoint", tour.waypoint);
      lastWaypoint = tour.waypoint;
      if ([4, 7, 9].includes(tour.waypoint))
        await page.locator(".city-stage").screenshot({
          path: `/tmp/afterhours-playtest/driftline-city-tour-${tour.waypoint}.png`,
        });
    }
    if (tour.done) {
      console.log("TOUR", JSON.stringify(tour));
      break;
    }
    await page.waitForTimeout(1000);
  }
  console.log(
    "STATE",
    JSON.stringify(
      await page
        .locator(".city-stage canvas")
        .evaluate((c) => ({ ...c.dataset })),
    ),
  );
  console.log("ERRORS", JSON.stringify(errors));
  if (!(await page.evaluate(() => window.tour.done)))
    throw new Error("City tour did not finish");
  if (errors.length) throw new Error("Browser errors");
} finally {
  await browser.close();
}
