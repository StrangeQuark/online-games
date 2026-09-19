import { describe, it, expect } from "vitest";
import {
  newDrive,
  startDrive,
  updateDrive,
  pauseDrive,
  curveAt,
  COURSES,
  ghostAt,
} from "./engine";
const idle = { steer: 0, brake: false, boost: false, drift: false };
describe("Driftline driving", () => {
  it("starts deliberately and freezes completely on pause", () => {
    const g = newDrive();
    updateDrive(g, idle, 1 / 60);
    expect(g.z).toBe(0);
    startDrive(g);
    for (let i = 0; i < 180; i++) updateDrive(g, idle, 1 / 60);
    expect(g.speed).toBeGreaterThan(5000);
    pauseDrive(g);
    const z = g.z,
      time = g.remaining;
    updateDrive(g, idle, 0.05);
    expect(g.z).toBe(z);
    expect(g.remaining).toBe(time);
    pauseDrive(g);
    updateDrive(g, idle, 0.05);
    expect(g.z).toBeGreaterThan(z);
  });
  it("all routes can be completed by steering around real traffic with a finite boost supply", () => {
    for (const course of COURSES) {
      const g = newDrive(course.id);
      startDrive(g);
      for (let i = 0; i < 15000 && g.phase === "racing"; i++) {
        const cars = g.traffic.filter(
          (c) => c.z > g.z - 450 && c.z < g.z + 6500,
        );
        const lanes = [-0.68, -0.32, 0.32, 0.68];
        const target = lanes.sort(
          (a, b) =>
            Math.min(...cars.map((c) => Math.abs(b - c.x)), 10) -
              Math.min(...cars.map((c) => Math.abs(a - c.x)), 10) ||
            Math.abs(a - g.x) - Math.abs(b - g.x),
        )[0];
        const steer = Math.max(
          -1,
          Math.min(
            1,
            (target - g.x) * 2 +
              (curveAt(g.z, course) * Math.pow(g.speed / 7000, 2) * 0.52) /
                (0.45 + Math.min(g.speed / 7000, 1.2) * 1.65),
          ),
        );
        updateDrive(
          g,
          {
            ...idle,
            steer,
            boost: g.boost > 25 && cars.every((c) => Math.abs(c.x - g.x) > 0.3),
          },
          1 / 60,
        );
      }
      expect(g.phase, course.id).toBe("finished");
      expect(g.checkpoint).toBe(2);
      expect(g.score).toBeGreaterThan(4000);
      expect(g.trace.length).toBeGreaterThan(100);
    }
  });
  it("collisions slow the car and cannot repeatedly damage it in the same instant", () => {
    const g = newDrive();
    startDrive(g);
    g.speed = 6000;
    g.traffic = [
      { id: 0, z: 150, x: 0, speed: 2000, color: "#fff", passed: false },
    ];
    updateDrive(g, idle, 1 / 60);
    expect(g.collisions).toBe(1);
    expect(g.speed).toBeLessThan(3000);
    updateDrive(g, idle, 1 / 60);
    expect(g.collisions).toBe(1);
  });
  it("off-road travel loses speed and braking can stop the car", () => {
    const g = newDrive();
    startDrive(g);
    g.x = 1.5;
    g.speed = 7000;
    for (let i = 0; i < 100; i++) updateDrive(g, idle, 1 / 60);
    expect(g.speed).toBeLessThan(4000);
    for (let i = 0; i < 100; i++)
      updateDrive(g, { ...idle, brake: true }, 1 / 60);
    expect(g.speed).toBe(0);
  });
  it("interpolates a personal ghost without affecting game physics", () => {
    expect(
      ghostAt(
        [
          { t: 0, z: 0, x: 0 },
          { t: 2, z: 100, x: 1 },
        ],
        1,
      ),
    ).toEqual({ t: 1, z: 50, x: 0.5 });
    expect(ghostAt([], 2)).toBeNull();
  });
});

it("scenic drives have lighter traffic, no time limit, and leave racing ghosts untouched", async () => {
  const { recordDrive } = await import("./records");
  const g = newDrive("coast", "scenic");
  expect(g.traffic.length).toBeLessThan(newDrive().traffic.length);
  startDrive(g);
  for (let i = 0; i < 60 * 90; i++)
    updateDrive(g, { ...idle, brake: true }, 1 / 60);
  expect(g.phase).toBe("racing");
  expect(g.remaining).toBe(COURSES[0].time);
  expect(g.z).toBe(0);
  for (let i = 0; i < 60 * 240 && g.phase === "racing"; i++) {
    const steer = Math.max(
      -1,
      Math.min(1, -g.x * 3 + curveAt(g.z, COURSES[0]) * 0.25),
    );
    updateDrive(g, { ...idle, steer }, 1 / 60);
  }
  expect(g.phase).toBe("finished");
  expect(g.trace).toEqual([]);
  expect(recordDrive({}, g)).toEqual({});
});
