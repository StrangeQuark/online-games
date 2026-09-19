import { describe, expect, it } from "vitest";
import {
  advanceExpedition,
  expeditionScore,
  ENEMIES,
  MINING_GOAL,
  MISSIONS,
  MODES,
  makeStructure,
  newExpedition,
  objectiveProgress,
  objectiveTarget,
  performAction,
  placementError,
  salvageValue,
  snapshot,
  spawnEnemy,
  stats,
  updateConnections,
  upgradeOptions,
  type EnemyKind,
  type Expedition,
  type Structure,
  type StructureKind,
} from "./engine";
const command = (g: Expedition, action: Record<string, unknown>) =>
  performAction(g, { tag: g.tag, ...action });
function run(g: Expedition, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 10); i++) advanceExpedition(g, 0.1);
}
function laboratory(
  nodes: Structure[] = [makeStructure(1, "solar", 700, 600)],
) {
  const g = newExpedition("speed");
  g.structures = nodes;
  g.asteroids = [];
  g.started = true;
  updateConnections(g);
  return g;
}
function hostile(g: Expedition, kind: EnemyKind, x: number, y: number) {
  const e = spawnEnemy(g, kind, x, y);
  e.cooldown = 1000;
  return e;
}
function site(
  g: Expedition,
  kind: StructureKind,
  around: { x: number; y: number },
) {
  for (let radius = 0; radius <= 100; radius += 12)
    for (let i = 0; i < 24; i++) {
      const p = {
        x: around.x + Math.cos((i * Math.PI) / 12) * radius,
        y: around.y + Math.sin((i * Math.PI) / 12) * radius,
      };
      if (!placementError(g, kind, p.x, p.y)) return p;
    }
  return null;
}
function build(
  g: Expedition,
  kind: StructureKind,
  around = { x: 900, y: 600 },
) {
  const p = site(g, kind, around);
  if (!p) return null;
  const before = g.structures.length;
  command(g, { type: "build", kind, ...p });
  return g.structures.length > before ? g.structures.at(-1)! : null;
}

describe("Starfall power and construction", () => {
  it("keeps separate hubs independent and breaks a bridge without teleporting stored energy", () => {
    const solar = makeStructure(1, "solar", 500, 500),
      bridge = makeStructure(2, "relay", 600, 500),
      store = makeStructure(3, "battery", 700, 500),
      remote = makeStructure(4, "solar", 1200, 700),
      g = laboratory([solar, bridge, store, remote]);
    store.energy = 120;
    remote.energy = 2;
    run(g, 0.1);
    expect(g.networks).toHaveLength(2);
    expect(store.connected).toBe(true);
    const held = store.energy;
    bridge.hp = 0;
    g.connectionDirty = true;
    run(g, 0.2);
    expect(store.connected).toBe(false);
    expect(g.networks).toHaveLength(3);
    expect(store.energy).toBeCloseTo(held, 8);
    expect(remote.energy).toBeLessThan(4.001);
    expect(g.structures.reduce((s, n) => s + n.energy, 0)).toBeCloseTo(
      g.energy,
      8,
    );
  });
  it("caps reciprocal relay links at six while solar can connect to more than six", () => {
    const relay = makeStructure(1, "relay", 900, 600),
      nodes = Array.from({ length: 8 }, (_, i) =>
        makeStructure(
          i + 2,
          "solar",
          900 + Math.cos((i * Math.PI) / 4) * 100,
          600 + Math.sin((i * Math.PI) / 4) * 100,
        ),
      ),
      g = laboratory([relay, ...nodes]);
    expect(relay.connections).toHaveLength(6);
    for (const n of g.structures)
      for (const id of n.connections)
        expect(g.structures.find((p) => p.id === id)!.connections).toContain(
          n.id,
        );
    relay.kind = "solar";
    updateConnections(g);
    expect(relay.connections).toHaveLength(8);
  });
  it("queues construction and upgrades during pause and spends exact minerals without advancing the clock", () => {
    const g = newExpedition("campaign", "normal", 0);
    command(g, { type: "start" });
    command(g, { type: "pause", paused: true });
    const initial = g.ore,
      solar = g.structures[0];
    command(g, { type: "upgrade", id: solar.id });
    const miner = build(g, "miner")!;
    expect(miner).not.toBeNull();
    expect(g.ore).toBe(initial - 245);
    run(g, 10);
    expect(g.time).toBe(0);
    expect(miner.progress).toBe(0);
    expect(solar.upgrading?.progress).toBe(0);
    command(g, { type: "pause", paused: false });
    run(g, 15);
    expect(solar.level).toBe(2);
    expect(miner.progress).toBe(1);
    expect(g.mined).toBeGreaterThan(0);
  });
  it("upgrades the only solar from empty reserves without deadlock or free energy", () => {
    const solar = makeStructure(1, "solar", 700, 600);
    solar.energy = 0;
    const g = laboratory([solar]);
    command(g, { type: "upgrade", id: 1 });
    for (let i = 0; i < 41; i++) {
      const before = g.structures.reduce((s, n) => s + n.energy, 0),
        generation = stats(solar).generation;
      advanceExpedition(g, 0.1);
      expect(
        g.structures.reduce((s, n) => s + n.energy, 0),
      ).toBeLessThanOrEqual(before + generation * 0.1 + 0.00001);
    }
    expect(solar.level).toBe(2);
    expect(solar.upgrading).toBeNull();
    expect(g.capacity).toBe(9);
  });
  it("new storage adds empty capacity and a starved non-solar build stalls", () => {
    const solar = makeStructure(1, "solar", 700, 600),
      store = makeStructure(2, "battery", 790, 600, false);
    store.progress = 0.99;
    const g = laboratory([solar, store]);
    advanceExpedition(g, 0.1);
    expect(store.progress).toBe(1);
    expect(g.capacity).toBe(204);
    expect(g.energy).toBeLessThan(4.28);
    expect(solar.energy + store.energy).toBeCloseTo(g.energy, 8);
    const relay = makeStructure(3, "relay", 1000, 600, false);
    g.structures.push(relay);
    updateConnections(g);
    run(g, 5);
    expect(relay.progress).toBe(0);
  });
  it("rebuilds an independently powered solar hub after the last generator is lost", () => {
    const g = laboratory([makeStructure(1, "miner", 700, 600)]);
    g.ore = 200;
    const panel = build(g, "solar", { x: 1200, y: 700 })!;
    expect(panel).not.toBeNull();
    expect(panel.progress).toBe(0);
    expect(g.ore).toBe(0);
    run(g, 3.2);
    expect(panel.progress).toBe(1);
    expect(panel.connected).toBe(true);
    expect(g.generation).toBeCloseTo(2.7);
    expect(placementError(g, "laser", 1270, 700)).toContain("Need");
  });
});
describe("Starfall mineral economy", () => {
  it("mines 80 or 200 minerals per minute while conserving the finite asteroid field", () => {
    for (const level of [1, 2]) {
      const miner = makeStructure(2, "miner", 770, 600);
      miner.level = level;
      const g = laboratory([makeStructure(1, "solar", 700, 600), miner]);
      g.asteroids = [
        {
          id: 20,
          x: 825,
          y: 600,
          ore: 500,
          initialOre: 500,
          radius: 20,
          seed: 1,
        },
      ];
      g.totalOre = 500;
      const initial = g.ore;
      run(g, 60);
      const expected = level === 1 ? 80 : 200;
      expect(g.mined).toBeCloseTo(expected, 7);
      expect(g.ore - initial).toBeCloseTo(expected, 7);
      expect(g.asteroids[0].ore + g.mined).toBeCloseTo(500, 7);
      expect(g.miningRate).toBeCloseTo(expected, 7);
    }
  });
  it("stops at the last fraction of ore and refunds exhausted base miners together", () => {
    const a = makeStructure(2, "miner", 770, 600),
      b = makeStructure(3, "miner", 770, 650),
      g = laboratory([makeStructure(1, "solar", 700, 600), a, b]);
    g.asteroids = [
      {
        id: 20,
        x: 820,
        y: 625,
        ore: 0.05,
        initialOre: 0.05,
        radius: 20,
        seed: 1,
      },
    ];
    run(g, 0.3);
    expect(g.mined).toBeCloseTo(0.05, 9);
    expect(g.asteroids[0].ore).toBe(0);
    expect(a.depleted && b.depleted).toBe(true);
    const before = g.ore;
    command(g, { type: "salvage", id: a.id });
    expect(g.structures.map((n) => n.kind)).toEqual(["solar"]);
    expect(g.ore - before).toBe(90);
  });
  it("fully refunds an untouched queued upgrade and recovers half of completed upgrade investment", () => {
    const solar = makeStructure(1, "solar", 700, 600),
      g = laboratory([solar]),
      original = g.ore;
    command(g, { type: "upgrade", id: 1 });
    expect(salvageValue(solar)).toBe(400);
    command(g, { type: "salvage", id: 1, confirm: true });
    expect(g.ore).toBe(original + 200);
    const completed = makeStructure(2, "miner", 700, 600);
    completed.level = 2;
    completed.spent = 145;
    completed.maxHp = completed.hp = 500;
    expect(salvageValue(completed)).toBe(95);
    completed.hp = 250;
    expect(salvageValue(completed)).toBe(47);
  });
  it("offers both laser branches at incremental prices and rejects direct branch construction", () => {
    const laser = makeStructure(2, "laser", 770, 600),
      g = laboratory([makeStructure(1, "solar", 700, 600), laser]);
    expect(upgradeOptions(laser).map((o) => [o.kind, o.cost])).toEqual([
      ["pulser", 100],
      ["thel", 500],
    ]);
    expect(placementError(g, "thel", 800, 700)).toContain("Choose");
    const before = g.ore;
    command(g, { type: "upgrade", id: 2, branch: "thel" });
    expect(g.ore).toBe(before - 500);
    run(g, 15);
    expect(laser.kind).toBe("thel");
    expect(laser.spent).toBe(600);
  });
});
describe("Starfall combat roles", () => {
  it.each(["laser", "pulser"] as const)(
    "%s intercepts hostile missiles before station impact",
    (kind) => {
      const weapon = makeStructure(2, kind, 770, 600),
        g = laboratory([makeStructure(1, "solar", 700, 600), weapon]);
      g.projectiles = [
        {
          id: 30,
          x: 800,
          y: 600,
          target: 1,
          enemy: true,
          angle: Math.PI,
          speed: 1,
          damage: 130,
          hp: 28,
          life: 15,
          radius: 30,
          source: 31,
        },
      ];
      run(g, 0.7);
      expect(g.projectiles).toHaveLength(0);
      expect(g.structures[0].hp).toBe(600);
    },
  );
  it("THEL deals continuous shield-reduced damage but cannot intercept missiles", () => {
    const gun = makeStructure(2, "thel", 770, 600),
      g = laboratory([makeStructure(1, "solar", 700, 600), gun]),
      ring = hostile(g, "ringer", 930, 600),
      hp = ring.hp;
    g.projectiles = [
      {
        id: 30,
        x: 820,
        y: 650,
        target: 1,
        enemy: true,
        angle: Math.PI,
        speed: 1,
        damage: 130,
        hp: 28,
        life: 15,
        radius: 30,
        source: 31,
      },
    ];
    run(g, 0.5);
    expect(hp - ring.hp).toBeCloseTo(30 * 0.5 * (1 - ENEMIES.ringer.armor), 7);
    expect(g.projectiles[0].hp).toBe(28);
    expect(g.beams.some((b) => b.kind === "thel")).toBe(true);
  });
  it("mineral-funded missiles travel, splash through shields, and cease firing without ammo", () => {
    const gun = makeStructure(2, "missile", 770, 600),
      g = laboratory([makeStructure(1, "solar", 700, 600), gun]);
    g.ore = 5;
    const ring = hostile(g, "ringer", 920, 600),
      other = hostile(g, "fighter", 930, 610),
      hp = ring.hp;
    advanceExpedition(g, 0.1);
    expect(g.ore).toBe(0);
    expect(g.projectiles).toHaveLength(1);
    expect(ring.hp).toBe(hp);
    run(g, 2);
    expect(hp - ring.hp).toBeCloseTo(450, 6);
    expect(g.enemies.some((e) => e.id === other.id)).toBe(false);
    gun.cooldown = 0;
    advanceExpedition(g, 0.1);
    expect(g.projectiles).toHaveLength(0);
  });
  it("a level-three launcher fires five physical missiles for 25 minerals with no grid energy", () => {
    const gun = makeStructure(2, "missile", 770, 600);
    gun.level = 3;
    const g = laboratory([gun]);
    g.ore = 25;
    hostile(g, "mothership", 1120, 600);
    advanceExpedition(g, 0.1);
    expect(g.projectiles).toHaveLength(5);
    expect(g.ore).toBe(0);
    expect(g.energy).toBe(0);
  });
  it("each enemy role exercises distinct stand-off, suicide, carrier, or beam behavior", () => {
    for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
      const g = laboratory(),
        spec = ENEMIES[kind],
        enemy = hostile(g, kind, 700 + spec.range - 1, 600);
      enemy.cooldown = 0;
      enemy.spawnTimer = 0;
      const hp = g.structures[0].hp;
      advanceExpedition(g, 0.1);
      if (kind === "missileShip") {
        expect(g.projectiles.some((p) => p.enemy)).toBe(true);
        expect(g.structures[0].hp).toBe(hp);
      } else if (kind === "suicide") {
        expect(g.enemies).toHaveLength(0);
        expect(g.structures[0].hp).toBeLessThan(hp - 400);
      } else {
        expect(g.structures[0].hp).toBe(hp - spec.damage);
        expect(g.beams.some((b) => b.kind === "enemy")).toBe(true);
      }
      if (kind === "mothership")
        expect(
          g.enemies.filter((e) => e.kind === "attackFighter"),
        ).toHaveLength(4);
    }
  });
  it("four drones travel before healing and stop when isolated reserves run dry", () => {
    const repair = makeStructure(2, "repair", 790, 600),
      victim = makeStructure(3, "laser", 890, 600);
    victim.hp = 100;
    const g = laboratory([makeStructure(1, "solar", 700, 600), repair, victim]);
    run(g, 0.2);
    expect(g.drones).toHaveLength(4);
    expect(victim.hp).toBe(100);
    expect(g.drones.every((d) => d.x > 790 && d.x < 890)).toBe(true);
    run(g, 2);
    expect(victim.hp).toBeGreaterThan(100);
    g.structures = g.structures.filter((n) => n.id !== 1);
    for (const n of g.structures) n.energy = 0;
    updateConnections(g);
    const hp = victim.hp;
    run(g, 2);
    expect(victim.hp).toBe(hp);
  });
});
describe("Starfall operation scope", () => {
  it("starts seven conserved ore fields and all nine researched objective categories", () => {
    for (const { id } of MODES) {
      const g = newExpedition(id);
      expect(g.asteroids.reduce((s, a) => s + a.ore, 0)).toBe(g.totalOre);
      expect(objectiveProgress(g)).toBe(0);
      command(g, { type: "start" });
      run(g, 0.1);
      expect(g.time).toBeCloseTo(0.1);
    }
    expect(MISSIONS.map((m) => m.objective)).toEqual([
      "mine",
      "mine",
      "survive",
      "mine",
      "mine",
      "destroy",
      "mine",
      "mine",
      "survive",
    ]);
    for (let mission = 0; mission < 9; mission++) {
      const g = newExpedition("campaign", "normal", mission);
      expect(objectiveTarget(g)).toBe(
        [2, 8].includes(mission)
          ? mission === 2
            ? 600
            : 1200
          : mission === 5
            ? 20
            : g.totalOre / 2,
      );
    }
    expect(objectiveTarget(newExpedition("mining"))).toBe(MINING_GOAL);
    const first = newExpedition("campaign", "normal", 0);
    expect(first.ore).toBe(500);
    expect(first.structures.map((n) => n.kind)).toEqual(["solar"]);
  });
  it("finishes training with actual inspection, funded builds, upgrades, and mined ore", () => {
    const g = newExpedition("training");
    command(g, { type: "start" });
    run(g, 3);
    expect(g.trainingStep).toBe(0);
    command(g, { type: "inspect", id: 2 });
    expect(build(g, "miner")).not.toBeNull();
    expect(build(g, "solar", { x: 930, y: 690 })).not.toBeNull();
    command(g, { type: "upgrade", id: 2 });
    expect(build(g, "laser", { x: 900, y: 550 })).not.toBeNull();
    run(g, 120);
    expect(g.won).toBe(true);
    expect(g.trainingStep).toBe(6);
    expect(g.mined).toBeGreaterThanOrEqual(120);
    expect(g.time).toBeLessThan(120);
  });
  it("rejects stale commands and invalid deltas; paused and recalled runs cannot keep advancing", () => {
    const g = newExpedition("speed");
    command(g, { type: "start" });
    const before = JSON.stringify(g);
    performAction(g, {
      type: "build",
      tag: "old",
      kind: "solar",
      x: 1200,
      y: 500,
    });
    expect(JSON.stringify(g)).toBe(before);
    for (const dt of [NaN, Infinity, 0, -1]) advanceExpedition(g, dt);
    expect(g.time).toBe(0);
    command(g, { type: "pause", paused: true });
    run(g, 50);
    expect(g.time).toBe(0);
    command(g, { type: "pause", paused: false });
    command(g, { type: "end" });
    expect(g.ended).toBe(true);
    expect(g.won).toBe(false);
  });
});

// Uses only player commands: no granted minerals, erased attackers, shortened
// objectives, or directly edited progress counters.
function miningOperator(g: Expedition) {
  const exhausted = g.structures.find((n) => n.kind === "miner" && n.depleted);
  if (exhausted) command(g, { type: "salvage", id: exhausted.id });
  const solar = g.structures.filter((n) => n.kind === "solar"),
    miners = g.structures.filter((n) => n.kind === "miner"),
    generation = solar.reduce((sum, n) => sum + stats(n).generation, 0);
  for (const n of solar)
    if (
      n.level < 3 &&
      !n.upgrading &&
      n.progress === 1 &&
      miners.length >= generation - 2 &&
      g.ore >= 200
    ) {
      command(g, { type: "upgrade", id: n.id });
      return;
    }
  for (const n of miners)
    if (
      (g.mode !== "campaign" ||
        ![3, 4].includes(g.mission) ||
        g.asteroids
          .filter((a) => Math.hypot(a.x - n.x, a.y - n.y) <= 85)
          .reduce((sum, a) => sum + a.ore, 0) >
          (g.mission === 3 ? 500 : 400)) &&
      n.level === 1 &&
      !n.upgrading &&
      n.progress === 1 &&
      g.ore >= 100
    ) {
      command(g, { type: "upgrade", id: n.id });
      return;
    }
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  if (miners.length < generation - 1 && g.ore >= 45) {
    const rocks = g.asteroids
      .filter((a) => a.ore > 80)
      .sort((a, b) => {
        const score = (r: typeof a) =>
          r.ore / (1 + miners.filter((n) => distance(n, r) < 85).length * 3) -
          distance(r, { x: 900, y: 600 }) * 0.2;
        return score(b) - score(a);
      });
    for (const rock of rocks) if (build(g, "miner", rock)) return;
  }
  if (g.ore >= 200)
    for (const rock of g.asteroids
      .filter((a) => a.ore > 200)
      .sort((a, b) => b.ore - a.ore))
      if (
        !solar.some((n) => distance(n, rock) < 150) &&
        build(g, "solar", rock)
      )
        return;
}
describe("Starfall sustained legal play and room limits", () => {
  it.each(["campaign", "speed"] as const)(
    "a funded %s mining strategy actually finishes its full objective",
    (mode) => {
      const g = newExpedition(mode, "normal", 0);
      command(g, { type: "start" });
      let peak = 0;
      for (let second = 0; second < 700 && !g.ended; second++) {
        miningOperator(g);
        run(g, 1);
        expect(g.ore).toBeGreaterThanOrEqual(-0.00001);
        if (second % 30 === 0)
          peak = Math.max(peak, JSON.stringify(snapshot(g)).length);
      }
      expect(g.won).toBe(true);
      expect(g.mined).toBeGreaterThanOrEqual(mode === "speed" ? 30000 : 1700);
      expect(
        g.asteroids.reduce((sum, a) => sum + a.ore, 0) + g.mined,
      ).toBeCloseTo(g.totalOre, 5);
      expect(peak).toBeLessThan(128 * 1024);
    },
    10000,
  );
  it("caps repeated sandbox fleet calls while retaining six unique selections", () => {
    const g = newExpedition("sandbox");
    command(g, { type: "start" });
    for (let i = 0; i < 2000; i++)
      command(g, { type: "wave", wave: (i % 6) + 1 });
    expect(g.incoming.length).toBeLessThanOrEqual(60);
    expect(g.chosenWaves).toHaveLength(6);
    const wave = newExpedition("waves");
    command(wave, { type: "start" });
    command(wave, { type: "wave", wave: 1 });
    const count = wave.incoming.length;
    command(wave, { type: "wave", wave: 1 });
    expect(wave.incoming).toHaveLength(count);
    expect(wave.won).toBe(false);
  });
  it("serializes maximal station, enemy, drone, and projectile bounds below 512 KiB while retaining host precision", () => {
    const g = laboratory();
    g.structures = Array.from({ length: 220 }, (_, i) =>
      makeStructure(
        i + 1,
        i % 2 ? "repair" : "missile",
        200 + (i % 20) * 60,
        100 + Math.floor(i / 20) * 75,
      ),
    );
    updateConnections(g);
    for (let i = 0; i < 180; i++)
      hostile(
        g,
        i % 2 ? "mothership" : "missileShip",
        100 + (i % 20) * 70,
        100 + Math.floor(i / 20) * 70,
      );
    g.drones = Array.from({ length: 440 }, (_, i) => ({
      id: 10000 + i,
      home: 2 + (i % 110) * 2,
      x: 123.456789,
      y: 456.789123,
      target: null,
      phase: Math.PI / 3,
      working: false,
    }));
    g.projectiles = Array.from({ length: 1600 }, (_, i) => ({
      id: 20000 + i,
      x: 123.456789,
      y: 456.789123,
      target: 1000,
      enemy: i % 2 === 0,
      angle: Math.PI / 3,
      speed: 130,
      damage: 550,
      hp: 30,
      life: 11.3456789,
      radius: 42,
      source: 1,
    }));
    g.incoming = Array.from({ length: 60 }, (_, i) => ({
      id: 50000 + i,
      at: 1200 + i * 5,
      kind: "mothership",
      count: 20,
      angle: Math.PI / 3,
      wave: 20,
    }));
    g.bursts = Array.from({ length: 45 }, (_, i) => ({
      x: 123.456789,
      y: 234.56789,
      life: 0.8,
      maxLife: 0.85,
      seed: i,
      color: "#a7d4ec",
      size: 110,
    }));
    g.beams = Array.from({ length: 35 }, () => ({
      x: 123.456789,
      y: 234.56789,
      tx: 345.67891,
      ty: 456.78912,
      life: 0.13,
      kind: "thel",
      source: 1,
    }));
    g.history = Array.from({ length: 720 }, (_, i) => ({
      time: i * 5 + 0.123456,
      miningRate: 1234.56789,
      energy: 765.432123,
      capacity: 2000,
    }));
    const packed = snapshot(g),
      bytes = new TextEncoder().encode(
        JSON.stringify({
          type: "state",
          state: { game: "starfall", state: packed },
        }),
      ).length;
    expect(bytes).toBeLessThan(512 * 1024);
    expect(packed.projectiles).toHaveLength(1600);
    expect(packed.structures).toHaveLength(220);
    expect(packed.enemies).toHaveLength(180);
    expect(packed.drones).toHaveLength(440);
    expect(packed.projectiles[0].x).toBe(123.457);
    expect(g.projectiles[0].x).toBe(123.456789);
  });
});

function defenseOperator(g: Expedition) {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y),
    center = { x: 900, y: 600 };
  const guns = g.structures.filter((n) => n.kind === "missile"),
    miners = g.structures.filter((n) => n.kind === "miner");
  if (g.time > 250) {
    const retired = g.structures.find(
      (n) =>
        n.kind === "solar" &&
        !miners.some((m) => distance(n, m) < 140) &&
        !guns.some((m) => distance(n, m) < 200),
    );
    if (retired && g.structures.filter((n) => n.kind === "solar").length > 1)
      command(g, { type: "salvage", id: retired.id });
  }
  const solars = g.structures
    .filter(
      (n) =>
        n.kind === "solar" && n.level === 3 && n.progress === 1 && !n.upgrading,
    )
    .sort((a, b) => distance(a, center) - distance(b, center));
  if ((g.time < 90 || miners.length < 16) && g.ore < 3000) miningOperator(g);
  else if (
    g.ore >= 300 &&
    g.structures.filter((n) => n.kind === "repair").length < 3 &&
    guns.length >= 8
  )
    build(g, "repair", center);
  else if (g.ore >= 400 && guns.length < 16) {
    if (solars[0]) build(g, "missile", solars[0]);
    else miningOperator(g);
  } else miningOperator(g);
  for (const n of g.structures.filter((n) => n.kind === "repair"))
    if (n.level < 2 && !n.upgrading && n.progress === 1 && g.ore > 150)
      command(g, { type: "upgrade", id: n.id });
  for (const n of guns)
    if (n.level < 3 && !n.upgrading && g.ore > 1000)
      command(g, { type: "upgrade", id: n.id });
}
describe("Starfall full-length combat operations", () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])(
    "legally completes campaign mission %i with its real clock and enemy kills",
    (mission) => {
      const g = newExpedition("campaign", "normal", mission);
      command(g, { type: "start" });
      for (let second = 0; second < 1800 && !g.ended; second++) {
        defenseOperator(g);
        run(g, 1);
        expect(g.ore).toBeGreaterThanOrEqual(-0.00001);
      }
      expect(g.won).toBe(true);
      expect(g.structures.length).toBeGreaterThan(0);
      if (mission === 5) expect(g.capitalKills).toBe(20);
      else if ([2, 8].includes(mission))
        expect(g.time).toBeGreaterThanOrEqual(mission === 2 ? 600 : 1200);
      else expect(g.mined).toBeGreaterThanOrEqual(g.totalOre / 2);
      if ([2, 5, 8].includes(mission)) expect(g.kills).toBeGreaterThan(20);
      expect(g.history.length).toBeGreaterThan(30);
      expect(g.history.at(-1)!.time).toBe(g.time);
    },
    15000,
  );
});

it("preserves every required carrier arrival when the enemy cap is full, then admits the delayed fleet as space clears", () => {
  const g = laboratory();
  g.mode = "campaign";
  g.mission = 5;
  for (let i = 0; i < 180; i++)
    hostile(g, "fighter", 1600 + (i % 10), 100 + (i % 10));
  g.incoming = [
    { id: 5000, kind: "mothership", count: 2, at: 0, angle: 0, wave: 1 },
  ];
  advanceExpedition(g, 0.1);
  expect(g.enemies).toHaveLength(180);
  expect(g.incoming[0].count).toBe(2);
  g.enemies[0].hp = 0;
  run(g, 1.2);
  expect(g.enemies.filter((e) => e.kind === "mothership")).toHaveLength(1);
  expect(g.incoming[0].count).toBe(1);
  g.enemies.find((e) => e.kind === "fighter")!.hp = 0;
  run(g, 1.2);
  expect(g.enemies.filter((e) => e.kind === "mothership")).toHaveLength(2);
  expect(g.incoming).toHaveLength(0);
  expect(g.enemies).toHaveLength(180);
});

function frontierOperator(g: Expedition) {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y),
    center = { x: 900, y: 600 };
  const exhausted = g.structures.find((n) => n.kind === "miner" && n.depleted);
  if (exhausted) command(g, { type: "salvage", id: exhausted.id });
  const guns = g.structures.filter((n) => n.kind === "missile"),
    miners = g.structures.filter((n) => n.kind === "miner"),
    lasers = g.structures.filter((n) => ["laser", "pulser"].includes(n.kind)),
    repairs = g.structures.filter((n) => n.kind === "repair");
  if (g.time > 250) {
    const retired = g.structures.find(
      (n) =>
        n.kind === "solar" &&
        !miners.some((m) => distance(n, m) < 140) &&
        !guns.some((m) => distance(n, m) < 200),
    );
    if (retired && g.structures.filter((n) => n.kind === "solar").length > 1)
      command(g, { type: "salvage", id: retired.id });
  }
  const solars = g.structures
    .filter(
      (n) =>
        n.kind === "solar" && n.level === 3 && n.progress === 1 && !n.upgrading,
    )
    .sort((a, b) => distance(a, center) - distance(b, center));
  const targetGuns = g.time < 140 ? 2 : g.time < 260 ? 4 : 10;
  if (miners.length < 4) miningOperator(g);
  else if (guns.length < targetGuns) {
    if (g.ore >= 400) {
      const solar = solars[0] || g.structures.find((n) => n.kind === "solar");
      if (solar) build(g, "missile", solar);
    }
  } else if (lasers.length < 3) {
    if (g.ore >= 100) build(g, "laser", center);
  } else if (repairs.length < 1) {
    if (g.ore >= 300) build(g, "repair", center);
  } else miningOperator(g);
  for (const n of repairs)
    if (n.level < 2 && !n.upgrading && n.progress === 1 && g.ore > 150)
      command(g, { type: "upgrade", id: n.id });
  for (const n of guns)
    if (n.level < 3 && !n.upgrading && g.ore > 1200)
      command(g, { type: "upgrade", id: n.id });
}
describe("Starfall challenge modes in real play", () => {
  it("harvests all 30,000 minerals under attacks with a legal mining-first strategy", () => {
    const g = newExpedition("mining", "gentle");
    command(g, { type: "start" });
    const distance = (
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) => Math.hypot(a.x - b.x, a.y - b.y);
    for (let second = 0; second < 900 && !g.ended; second++) {
      miningOperator(g);
      if (g.enemies.length && g.ore >= 100) {
        const enemy = g.enemies[0],
          nearest = [...g.structures].sort(
            (a, b) => distance(a, enemy) - distance(b, enemy),
          )[0];
        if (
          nearest &&
          g.structures.filter(
            (n) =>
              ["laser", "pulser", "thel", "missile"].includes(n.kind) &&
              distance(n, nearest) < 120,
          ).length < 4
        )
          build(g, enemy.kind === "mothership" ? "missile" : "laser", nearest);
      }
      run(g, 1);
    }
    expect(g.won).toBe(true);
    expect(g.mined).toBeGreaterThanOrEqual(30000);
    expect(g.kills).toBeGreaterThan(0);
    expect(g.wave).toBeGreaterThanOrEqual(3);
  }, 10000);
  it("funds defenses and defeats all six requested fleets including their spawned fighters", () => {
    const g = newExpedition("waves");
    command(g, { type: "start" });
    const observed = new Set<EnemyKind>();
    for (let second = 0; second < 1800 && !g.ended; second++) {
      defenseOperator(g);
      if (
        g.time > 450 &&
        !g.enemies.length &&
        !g.incoming.length &&
        g.chosenWaves.length < 6
      )
        command(g, { type: "wave", wave: g.chosenWaves.length + 1 });
      run(g, 1);
      g.enemies.forEach((e) => observed.add(e.kind));
    }
    expect(g.won).toBe(true);
    expect(g.chosenWaves).toEqual([1, 2, 3, 4, 5, 6]);
    expect(g.capitalKills).toBe(6);
    expect(g.kills).toBeGreaterThan(118);
    expect(observed.size).toBe(7);
    expect(g.incoming).toHaveLength(0);
    expect(g.enemies).toHaveLength(0);
  }, 15000);
  it("continues beyond six waves in endless survival and banks only when the player recalls", () => {
    const g = newExpedition("survival", "gentle");
    command(g, { type: "start" });
    for (let second = 0; second < 900 && !g.ended && g.wave < 7; second++) {
      frontierOperator(g);
      run(g, 1);
    }
    expect(g.wave).toBeGreaterThanOrEqual(7);
    expect(g.kills).toBeGreaterThan(100);
    expect(g.ended).toBe(false);
    expect(g.won).toBe(false);
    command(g, { type: "end" });
    expect(g.ended).toBe(true);
    expect(g.won).toBe(false);
  }, 10000);
});

it.each(["speed", "waves"] as const)(
  "%s scores favor faster completion over extra harvesting and always beat recalled attempts",
  (mode) => {
    const fast = newExpedition(mode);
    fast.won = true;
    fast.time = 300;
    fast.mined = 30000;
    fast.kills = 100;
    const slow = { ...fast, time: 600, mined: 65000, kills: 10000 };
    expect(expeditionScore(fast)).toBe(17500);
    expect(expeditionScore(fast)).toBeGreaterThan(expeditionScore(slow));
    const recalled = { ...slow, won: false };
    expect(expeditionScore(recalled)).toBe(999);
    expect(expeditionScore({ ...slow, time: 1000000000 })).toBeGreaterThan(
      expeditionScore(recalled),
    );
  },
);
