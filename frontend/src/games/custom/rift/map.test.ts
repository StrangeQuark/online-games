import { describe, expect, it } from "vitest";
import {
  MAPS,
  contains,
  floorAt,
  getMap,
  railParts,
  rampHeight,
  type ArenaMap,
} from "./map";
import { actor, BODY, moveActor, neutralInput } from "./engine";

function clear(map: ArenaMap, x: number, y: number, z: number) {
  return (
    !map.solids.some((s) => {
      if (y >= s.top - 0.025 || y + BODY.height <= s.bottom + 0.025)
        return false;
      const dx = Math.max(Math.abs(x - s.x) - s.w / 2, 0),
        dz = Math.max(Math.abs(z - s.z) - s.d / 2, 0);
      return dx * dx + dz * dz < BODY.radius * BODY.radius;
    }) &&
    !map.ramps.some(
      (r) =>
        contains(x, z, r, BODY.radius * 0.5) &&
        y + BODY.step < rampHeight(r, x, z),
    )
  );
}

describe("Rift arena integrity", () => {
  it("keeps four distinct authored arenas and a safe default", () => {
    expect(MAPS.map((m) => m.id)).toEqual([
      "foundry",
      "aqueduct",
      "citadel",
      "orbital",
    ]);
    expect(getMap("invalid")).toBe(MAPS[0]);
    expect(MAPS[0].width).toBeGreaterThan(42);
    expect(MAPS[0].depth).toBeGreaterThan(38);
    expect(new Set(MAPS.map((m) => JSON.stringify(m.ramps))).size).toBe(4);
  });
  for (const map of MAPS) {
    it(`${map.id}: every spawn and item has support and standing clearance`, () => {
      for (const p of [...map.spawns, ...map.pickups]) {
        expect(
          floorAt(p.x, p.z, p.y + 0.01, map),
          JSON.stringify(p),
        ).toBeCloseTo(p.y);
        expect(clear(map, p.x, p.y, p.z), JSON.stringify(p)).toBe(true);
        expect(Math.abs(p.x)).toBeLessThan(map.width / 2 - 0.5 - BODY.radius);
        expect(Math.abs(p.z)).toBeLessThan(map.depth / 2 - 0.5 - BODY.radius);
      }
      for (const kind of [
        "shotgun",
        "rocket",
        "plasma",
        "rail",
        "grenade",
        "speed",
        "invisibility",
        "jetpack",
        "armor",
        "health",
        "ammo",
      ])
        expect(
          map.pickups.some((p) => p.kind === kind),
          kind,
        ).toBe(true);
    });
    it(`${map.id}: all navigation points form a connected walkable graph`, () => {
      const visited = new Set([0]),
        pending = [0];
      while (pending.length) {
        const i = pending.pop()!;
        for (const [a, b] of map.navEdges) {
          const next = a === i ? b : b === i ? a : -1;
          if (next >= 0 && !visited.has(next)) {
            visited.add(next);
            pending.push(next);
          }
        }
      }
      const disconnected = map.nav.filter((_, i) => !visited.has(i));
      expect(
        disconnected.map((p) => [p.x, p.y, p.z]),
        JSON.stringify(disconnected),
      ).toEqual([]);
      for (const p of map.nav)
        expect(clear(map, p.x, p.y, p.z), JSON.stringify(p)).toBe(true);
    });
    it(`${map.id}: physical movement can follow every navigation edge both ways`, () => {
      for (const [a, b] of map.navEdges)
        for (const [from, to] of [
          [map.nav[a], map.nav[b]],
          [map.nav[b], map.nav[a]],
        ]) {
          const p = actor("walker", "Walker", 0, false, map.id);
          Object.assign(p, from, {
            yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)),
            protected: 0,
          });
          const input = { ...neutralInput(p), forward: 1 };
          const duration =
            Math.hypot(to.x - from.x, to.z - from.z) / BODY.speed;
          const steps = Math.ceil(duration * 120);
          for (let i = 0; i < steps; i++)
            moveActor(p, input, duration / steps, map);
          for (let i = 0; i < 60; i++)
            moveActor(p, { ...input, forward: 0 }, 1 / 120, map);
          expect(
            Math.hypot(p.x - to.x, p.y - to.y, p.z - to.z),
            `${map.id} ${JSON.stringify(from)} -> ${JSON.stringify(to)} ended ${p.x},${p.y},${p.z}`,
          ).toBeLessThan(0.38);
        }
    });
  }
  it("supports both ramp axes, uphill directions and elevated stair bases", () => {
    const east = {
      x: 0,
      z: 0,
      w: 10,
      d: 4,
      bottom: 3,
      top: 6,
      axis: "x" as const,
      direction: 1 as const,
    };
    expect(rampHeight(east, -5, 0)).toBe(3);
    expect(rampHeight(east, 5, 0)).toBe(6);
    expect(rampHeight({ ...east, direction: -1 }, -5, 0)).toBe(6);
    expect(rampHeight({ x: 0, z: 0, w: 4, d: 10, top: 5 }, -5)).toBe(5);
  });
  it("keeps rail gaps open in both long-axis orientations", () => {
    for (const [w, d] of [
      [6, 0.18],
      [0.18, 6],
    ]) {
      const parts = railParts({
        x: 0,
        z: 0,
        w,
        d,
        bottom: 4,
        top: 4.75,
        kind: "rail",
      });
      expect(parts[0].w).toBe(w > d ? 6 : 0.13);
      expect(parts[0].d).toBe(w > d ? 0.13 : 6);
      expect(parts.filter((p) => p.w === 0.08 && p.d === 0.08)).toHaveLength(5);
    }
  });
});
