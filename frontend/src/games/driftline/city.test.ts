import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  LANDMARKS,
  makeBuildings,
  newCityDrive,
  updateCity,
  recoverCar,
  routeTo,
  onRoad,
  signalGreen,
  trafficPose,
  TREES,
  controllerSteering,
  type DriveInput,
} from "./city";
const idle: DriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };
function drive(
  seconds: number,
  input: Partial<DriveInput>,
  g = newCityDrive(),
  fps = 60,
) {
  g.phase = "racing";
  for (let i = 0; i < seconds * fps; i++)
    updateCity(g, { ...idle, ...input }, 1 / fps, false);
  return g;
}
describe("Bellwether city driving", () => {
  it("stays parked until the driver accelerates", () => {
    const g = drive(10, {});
    expect(g.speed).toBe(0);
    expect(g.z).toBe(410);
    expect(g.distance).toBe(0);
  });
  it("accelerates, brakes, reverses, and reverses the steering direction", () => {
    const g = drive(3, { throttle: 1 });
    expect(g.speed).toBeGreaterThan(10);
    expect(g.z).toBeLessThan(390);
    drive(6, { brake: 1 }, g);
    expect(g.speed).toBeLessThan(-3);
    const yaw = g.heading;
    drive(0.3, { brake: 1, steer: 1 }, g);
    expect(g.heading).toBeLessThan(yaw);
  });
  it("turns freely in world space rather than staying on a track", () => {
    const g = drive(1, { throttle: 1 });
    drive(1, { throttle: 1, steer: 1 }, g);
    expect(g.heading).toBeGreaterThan(0.3);
    expect(g.x).toBeGreaterThan(-314);
  });
  it("stops with the handbrake instead of reversing", () => {
    const g = drive(3, { throttle: 1 });
    drive(4, { handbrake: true }, g);
    expect(Math.abs(g.speed)).toBeLessThan(0.05);
  });
  it("freezes physics, traffic and the odometer while paused", () => {
    const g = drive(2, { throttle: 1 });
    g.phase = "paused";
    const before = structuredClone(g);
    updateCity(g, { ...idle, throttle: 1 }, 0.1);
    expect(g).toEqual(before);
  });
  it("does not tunnel through a building even at top speed and a late frame", () => {
    const b = BUILDINGS[0],
      g = newCityDrive();
    Object.assign(g, {
      phase: "racing",
      x: b.x,
      z: b.z + b.d / 2 + 2,
      heading: 0,
      speed: 48,
    });
    updateCity(g, { ...idle, throttle: 1 }, 0.5, false);
    expect(g.z).toBeGreaterThan(b.z + b.d / 2 + 1.6);
    expect(g.collisions).toBe(1);
  });
  it("keeps the car inside the city and allows recovery", () => {
    const g = newCityDrive();
    Object.assign(g, {
      phase: "racing",
      x: 710,
      z: 0,
      heading: Math.PI / 2,
      speed: 40,
    });
    for (let i = 0; i < 10; i++)
      updateCity(g, { ...idle, throttle: 1 }, 0.1, false);
    expect(g.x).toBeLessThanOrEqual(718);
    recoverCar(g);
    expect(onRoad(g.x, g.z)).toBe(true);
    expect(g.speed).toBe(0);
  });
  it("discovers a landmark once, without requiring a race", () => {
    const g = newCityDrive();
    Object.assign(g, { phase: "racing", x: 640, z: 480 });
    updateCity(g, idle, 0.02, false);
    updateCity(g, idle, 0.02, false);
    expect(g.visited).toEqual(["harbor"]);
    expect(g.message).toContain("Marina Promenade");
  });
  it("is stable across normal frame rates", () => {
    const a = drive(4, { throttle: 1 }, newCityDrive(), 30),
      b = drive(4, { throttle: 1 }, newCityDrive(), 120);
    expect(a.speed).toBeCloseTo(b.speed, 5);
    expect(a.distance).toBeCloseTo(b.distance, 5);
  });
  it("generates permanent non-overlapping buildings clear of every street", () => {
    expect(makeBuildings()).toEqual(BUILDINGS);
    expect(BUILDINGS.length).toBe(248);
    for (const b of BUILDINGS) {
      expect(onRoad(b.x - b.w / 2, b.z - b.d / 2)).toBe(false);
      expect(onRoad(b.x + b.w / 2, b.z + b.d / 2)).toBe(false);
    }
  });
  it("traffic moves, stops at signals, and is disabled by the empty-city option", () => {
    const g = newCityDrive();
    g.phase = "racing";
    const p = g.traffic.map((c) => c.progress);
    updateCity(g, idle, 0.1, false);
    expect(g.traffic.map((c) => c.progress)).toEqual(p);
    updateCity(g, idle, 0.1, true);
    expect(g.traffic.some((c, i) => c.progress > p[i])).toBe(true);
    expect(signalGreen(0, true)).toBe(true);
    expect(signalGreen(14, true)).toBe(false);
  });
  it("suggested routes stay on the street network for all destinations", () => {
    for (const start of [
      { x: -635, z: 410 },
      { x: 315, z: -200 },
      { x: 234, z: 165 },
    ])
      for (const target of LANDMARKS) {
        const route = routeTo(start, target);
        expect(route.at(-1)).toEqual(target);
        for (let i = 1; i < route.length; i++)
          for (let j = 0; j <= 20; j++) {
            const f = j / 20,
              x = route[i - 1].x + (route[i].x - route[i - 1].x) * f,
              z = route[i - 1].z + (route[i].z - route[i - 1].z) * f;
            expect(onRoad(x, z), `${target.id}: ${x},${z}`).toBe(true);
          }
      }
  });
  it("traffic follows smooth corners without teleporting across junctions", () => {
    for (let route = 0; route < 4; route++)
      for (let progress = 0; progress < 5100; progress += 2) {
        const a = trafficPose(route, progress),
          b = trafficPose(route, progress + 0.1);
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThanOrEqual(0.101);
        expect(onRoad(a.x, a.z)).toBe(true);
      }
  });
  it("tree trunks stop the car instead of allowing it to pass through", () => {
    const tree = TREES[0],
      g = newCityDrive();
    Object.assign(g, { phase: "racing", x: tree.x, z: tree.z + 3, speed: 12 });
    updateCity(g, { ...idle, throttle: 1 }, 0.1, false);
    updateCity(g, { ...idle, throttle: 1 }, 0.1, false);
    expect(g.collisions).toBe(1);
    expect(g.z).toBeGreaterThan(tree.z + 1.7);
  });
  it("can legally drive across multiple neighborhoods and discover the park, downtown and waterfront", () => {
    const g = newCityDrive();
    g.phase = "racing";
    const route = [
      { x: -315, z: 325 },
      { x: -155, z: 325 },
      { x: -155, z: 165 },
      { x: 5, z: 165 },
      { x: 5, z: 5 },
      { x: 325, z: 5 },
      { x: 325, z: -315 },
      { x: 635, z: -315 },
      { x: 635, z: 480 },
    ];
    let waypoint = 0;
    for (let tick = 0; tick < 60 * 360 && waypoint < route.length; tick++) {
      const target = route[waypoint],
        dx = target.x - g.x,
        dz = target.z - g.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 7) {
        waypoint++;
        continue;
      }
      const desired = Math.atan2(dx, -dz);
      const error = Math.atan2(
        Math.sin(desired - g.heading),
        Math.cos(desired - g.heading),
      );
      const speed = Math.abs(error) > 0.3 || distance < 24 ? 5 : 15;
      updateCity(
        g,
        {
          throttle: g.speed < speed ? 0.75 : 0,
          brake: g.speed > speed + 0.5 ? 0.5 : 0,
          steer: Math.max(-1, Math.min(1, error * 2.4)),
          handbrake: false,
        },
        1 / 60,
        false,
      );
    }
    expect(waypoint).toBe(route.length);
    expect(g.distance).toBeGreaterThan(1800);
    expect(g.visited).toEqual(
      expect.arrayContaining(["park", "downtown", "harbor"]),
    );
    expect(g.collisions).toBe(0);
  });
  it("removes controller drift while preserving fine steering outside the dead zone", () => {
    expect(controllerSteering(0.1)).toBe(0);
    expect(controllerSteering(-0.12)).toBe(0);
    expect(controllerSteering(0.13)).toBeGreaterThan(0);
    expect(controllerSteering(0.13)).toBeLessThan(0.02);
    expect(controllerSteering(-1)).toBe(-1);
    expect(controllerSteering(1)).toBe(1);
    expect(controllerSteering(NaN)).toBe(0);
  });
  it("holds still with the handbrake and gives braking priority when both pedals are held", () => {
    const handbrake = drive(3, { throttle: 1 });
    drive(5, { throttle: 1, handbrake: true }, handbrake);
    expect(handbrake.speed).toBe(0);
    const both = drive(3, { throttle: 1 });
    drive(5, { throttle: 1, brake: 1 }, both);
    expect(both.speed).toBe(0);
    const z = both.z;
    drive(1, { throttle: 1, brake: 1 }, both);
    expect(both.z).toBe(z);
  });
});
