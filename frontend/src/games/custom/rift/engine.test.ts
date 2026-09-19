import { describe, it, expect } from "vitest";
import {
  actor,
  BODY,
  collectPickup,
  damage,
  direction,
  initial,
  moveActor,
  neutralInput,
  reload,
  route,
  safeSpawn,
  shoot,
  step,
  visible,
  WEAPONS,
  worldRay,
  type Actor,
  type Input,
} from "./engine";
import { floorAt, getMap, MAPS, NAV, PICKUP_SPAWNS, SPAWNS } from "./map";
function walk(a: Actor, input: Partial<Input>, seconds: number) {
  const control = { ...neutralInput(a), ...input };
  for (let t = 0; t < seconds; t += 1 / 120) moveActor(a, control, 1 / 120);
}
function solo() {
  const game = initial("me", "You");
  game.actors = [game.actors[0]];
  game.pickups = [];
  return game;
}
function run(
  game: ReturnType<typeof initial>,
  seconds: number,
  inputs = new Map<string, Input>(),
) {
  for (let t = 0; t < seconds; t += 1 / 120) step(game, inputs, 1 / 120);
}
describe("Rift physical 3D arena", () => {
  it("jumps above eye height and lands, without repeated jumps from a held key", () => {
    const a = actor("a", "A");
    walk(a, { jump: true }, 0.33);
    expect(a.y).toBeGreaterThan(1.15);
    expect(a.grounded).toBe(false);
    walk(a, { jump: true }, 1.2);
    expect(a.y).toBe(0);
    expect(a.grounded).toBe(true);
    walk(a, { jump: false }, 0.02);
    walk(a, { jump: true }, 0.12);
    expect(a.y).toBeGreaterThan(0.5);
  });
  it("supports full pitch independently of horizontal movement", () => {
    const a = actor("a", "A");
    walk(a, { pitch: 1.2, forward: 1 }, 0.5);
    expect(a.pitch).toBe(1.2);
    expect(a.z).toBeLessThan(9);
    expect(a.y).toBe(0);
    expect(direction(0, 1.2).y).toBeGreaterThan(0.9);
  });
  it("climbs both continuous ramps from the floor to upper galleries", () => {
    for (const side of [-1, 1]) {
      const a = actor("a", "A");
      Object.assign(a, { x: side * 17, z: 15 });
      walk(a, { forward: 1, yaw: 0 }, 3.1);
      expect(a.y).toBeCloseTo(4.5);
      expect(a.z).toBeLessThan(0);
      expect(a.grounded).toBe(true);
    }
  });
  it("walks up actual stair treads to the central elevated bridge", () => {
    const a = actor("a", "A");
    Object.assign(a, { x: 0, z: 17 });
    walk(a, { forward: 1, yaw: 0 }, 2.2);
    expect(a.y).toBeCloseTo(4.5);
    expect(a.z).toBeLessThan(5);
  });
  it("falls off a gallery onto the actual lower floor", () => {
    const a = actor("a", "A", 2);
    walk(a, { strafe: 1, yaw: 0 }, 1.7);
    expect(a.x).toBeGreaterThan(-11);
    expect(a.y).toBeCloseTo(0);
  });
  it("stops the head at the underside of a deck", () => {
    const a = actor("a", "A");
    Object.assign(a, { x: -12, z: -13, vy: 10, grounded: false, y: 1 });
    walk(a, {}, 0.2);
    expect(a.y + BODY.height).toBeLessThanOrEqual(4.05);
  });
  it("slides along walls and cannot tunnel through cover", () => {
    const a = actor("a", "A");
    Object.assign(a, { x: -19, z: 12 });
    walk(a, { strafe: -1 }, 1);
    expect(a.x).toBeGreaterThanOrEqual(-20.2);
    const b = actor("b", "B");
    Object.assign(b, { x: -8, z: 7 });
    walk(b, { forward: 1 }, 2);
    expect(b.z).toBeGreaterThan(4.8);
  });
  it("does not run through the vertical side of a high ramp", () => {
    const a = actor("a", "A");
    Object.assign(a, { x: -12, z: 3 });
    walk(a, { strafe: -1, yaw: 0 }, 1);
    expect(a.x).toBeGreaterThan(-14.2);
    expect(a.y).toBe(0);
  });
  it("spawns and pickups rest on playable surfaces", () => {
    for (const p of [...SPAWNS, ...PICKUP_SPAWNS])
      expect(floorAt(p.x, p.z, p.y + 0.01)).toBeCloseTo(p.y);
    expect(safeSpawn([actor("a", "A")], "b")).not.toEqual(SPAWNS[0]);
  });
  it("raycasts against platforms and ramps in three dimensions", () => {
    expect(
      worldRay({ x: -12, y: 1.5, z: -13 }, { x: 0, y: 1, z: 0 }, 10),
    ).toBeCloseTo(2.55);
    expect(
      worldRay({ x: -17, y: 1.5, z: 15 }, { x: 0, y: 0, z: -1 }, 30),
    ).toBeLessThan(7);
    expect(visible({ x: -12, y: 0, z: -13 }, { x: -12, y: 4.5, z: -13 })).toBe(
      false,
    );
  });
});
it("shoots through visible rail gaps while the top bar and posts stop shots", () => {
  const north = { x: 0, y: 0, z: -1 };
  expect(worldRay({ x: -10.75, y: 4.8, z: -9 }, north, 4)).toBe(4);
  expect(worldRay({ x: -10, y: 4.8, z: -9 }, north, 4)).toBeCloseTo(0.96);
  expect(worldRay({ x: -10.75, y: 5.18, z: -9 }, north, 4)).toBeCloseTo(0.935);
});

describe("Rift combat and resource rules", () => {
  it("absorbs damage into armor, preserving remaining health and protection", () => {
    const game = solo(),
      a = game.actors[0];
    a.armor = 60;
    damage(game, a, 100, undefined);
    expect(a.hp).toBe(100);
    a.protected = 0;
    damage(game, a, 50, undefined);
    expect(a.hp).toBe(82.5);
    expect(a.armor).toBe(27.5);
  });
  it("uses pitch to hit an enemy on another floor and respects intervening walls", () => {
    const game = solo(),
      a = game.actors[0],
      b = actor("b", "B");
    Object.assign(a, { x: -12, z: 4, protected: 0 });
    Object.assign(b, { x: -14.5, y: 4.5, z: -6, protected: 0 });
    game.actors.push(b);
    a.yaw = Math.atan2(a.x - b.x, a.z - b.z);
    a.pitch = Math.atan2(
      b.y + 1.1 - (a.y + BODY.eye),
      Math.hypot(a.x - b.x, a.z - b.z),
    );
    shoot(game, a);
    expect(b.hp).toBeLessThan(100);
    a.cooldown = 0;
    b.hp = 100;
    Object.assign(a, { x: -12, y: 0, z: -13, yaw: 0, pitch: Math.PI / 2 });
    Object.assign(b, { x: -12, y: 4.5, z: -13 });
    shoot(game, a);
    expect(b.hp).toBe(100);
  });
  it("uses a finite magazine and transfers only available reserve ammo on reload", () => {
    const game = solo(),
      a = game.actors[0];
    a.inventory.carbine.clip = 1;
    a.inventory.carbine.reserve = 7;
    shoot(game, a);
    expect(a.inventory.carbine.clip).toBe(0);
    a.cooldown = 0;
    shoot(game, a);
    expect(a.shots).toBe(1);
    expect(a.reloading).toBe(WEAPONS.carbine.reload);
    run(game, 1.25);
    expect(a.inventory.carbine.clip).toBe(7);
    expect(a.inventory.carbine.reserve).toBe(0);
  });
  it("does not reload a full magazine or duplicate ammunition", () => {
    const a = actor("a", "A");
    reload(a);
    expect(a.reloading).toBe(0);
    a.inventory.carbine.clip = 4;
    a.inventory.carbine.reserve = 0;
    reload(a);
    expect(a.reloading).toBe(0);
  });
  it("collects a real weapon, auto equips, and starts its respawn timer", () => {
    const a = actor("a", "A");
    a.z = 8;
    const p = {
      id: 1,
      x: -11,
      y: 0,
      z: 8,
      kind: "shotgun" as const,
      remaining: 0,
    };
    expect(collectPickup(a, p)).toBe(true);
    expect(a.weapon).toBe("shotgun");
    expect(a.inventory.shotgun.clip).toBe(6);
    expect(p.remaining).toBe(12);
    expect(collectPickup(a, p)).toBe(false);
  });
  it("cannot collect armor through a floor and does not consume unneeded health", () => {
    const a = actor("a", "A");
    const p = {
      id: 1,
      x: a.x,
      y: 4.5,
      z: a.z,
      kind: "armor" as const,
      remaining: 0,
    };
    expect(collectPickup(a, p)).toBe(false);
    p.y = 0;
    expect(collectPickup(a, p)).toBe(true);
    expect(a.armor).toBe(60);
    expect(collectPickup(a, { ...p, kind: "health", remaining: 0 })).toBe(
      false,
    );
  });
  it("respawns pickups and respawns defeated players with scores preserved", () => {
    const game = solo(),
      a = game.actors[0];
    game.pickups = [{ id: 0, x: 0, y: 0, z: 0, kind: "armor", remaining: 0.5 }];
    a.protected = 0;
    a.kills = 3;
    damage(game, a, 500, undefined);
    expect(a.deaths).toBe(1);
    run(game, 2.6);
    expect(game.pickups[0].remaining).toBe(0);
    expect(a.hp).toBe(100);
    expect(a.kills).toBe(3);
    expect(a.deaths).toBe(1);
    expect(a.spawnCount).toBe(1);
    expect(a.protected).toBeGreaterThan(0);
  });
  it("rockets physically travel, explode, and apply splash with self damage", () => {
    const game = solo(),
      a = game.actors[0],
      b = actor("b", "B");
    Object.assign(a, { x: 12, z: 2, yaw: 0, protected: 0, weapon: "rocket" });
    a.inventory.rocket = { owned: true, clip: 4, reserve: 4 };
    Object.assign(b, { x: 12, z: -1, protected: 0 });
    game.actors.push(b);
    shoot(game, a);
    expect(game.projectiles).toHaveLength(1);
    expect(b.hp).toBe(100);
    run(game, 0.25);
    expect(game.projectiles).toHaveLength(0);
    expect(b.hp).toBeLessThan(35);
    expect(a.hp).toBeLessThan(100);
  });
  it("freezes a finished match and retains its round identity", () => {
    const game = solo(),
      tag = game.tag;
    game.time = 0.01;
    run(game, 0.1);
    expect(game.ended).toBe(true);
    const ended = JSON.stringify(game);
    run(game, 1);
    expect(JSON.stringify(game)).toBe(ended);
    expect(game.tag).toBe(tag);
  });
});
describe("Rift vertical bot navigation", () => {
  it("finds an actual connected route via the ramps to a gallery", () => {
    const path = route({ x: -11, y: 0, z: 12 }, { x: -17, y: 4.5, z: -6 });
    expect(path.some((i) => NAV[i].y > 0 && NAV[i].y < 4.5)).toBe(true);
    expect(NAV[path[path.length - 1]].y).toBe(4.5);
  });
  it("bots collect weapons and reach upper decks using physical movement", () => {
    const game = initial("me", "You");
    game.actors = [actor("bot", "Sentinel", 0, true)];
    game.pickups = game.pickups.filter((p) => p.kind === "rocket");
    const bot = game.actors[0];
    for (let t = 0; t < 23 && !bot.inventory.rocket.owned; t += 1 / 120)
      step(game, new Map(), 1 / 120);
    expect(bot.inventory.rocket.owned).toBe(true);
    expect(bot.y).toBeCloseTo(4.5);
  });
  it("reroutes after falling beneath an elevated waypoint instead of circling below it", () => {
    const game = initial("me", "You"),
      map = getMap("foundry");
    const bot = actor("bot", "Sentinel", 0, true);
    const target = game.pickups.find((p) => p.kind === "rocket" && p.x < 0)!;
    Object.assign(bot, {
      x: target.x,
      y: 0,
      z: target.z,
      destination: { x: target.x, y: target.y, z: target.z },
      think: 0.7,
    });
    bot.goal = map.nav.findIndex(
      (p) => p.x === target.x && p.y === target.y && p.z === target.z,
    );
    bot.nav = [bot.goal];
    game.actors = [bot];
    game.pickups = [target];
    run(game, 35);
    expect(bot.inventory.rocket.owned).toBe(true);
    expect(bot.walk).toBeGreaterThan(10);
  });
  it("a live match produces real bot combat without standing idle", () => {
    const game = initial("me", "You");
    run(game, 30);
    expect(
      game.actors.reduce((total, a) => total + a.shots, 0),
    ).toBeGreaterThan(20);
    expect(game.actors.some((a) => a.kills > 0)).toBe(true);
    expect(game.actors.filter((a) => a.bot).some((a) => a.walk > 30)).toBe(
      true,
    );
  });
});

describe("Rift movement perks and sprint resource", () => {
  it("sprints faster, consumes stamina, recovers at rest and stops sprinting to fire", () => {
    const normal = actor("n", "Normal"),
      sprint = actor("s", "Sprint");
    walk(normal, { forward: 1 }, 0.6);
    walk(sprint, { forward: 1, sprint: true }, 0.6);
    expect(12 - sprint.z).toBeGreaterThan((12 - normal.z) * 1.4);
    expect(sprint.stamina).toBeLessThan(90);
    expect(sprint.sprinting).toBe(true);
    walk(sprint, { forward: 1, sprint: true, fire: true }, 0.01);
    expect(sprint.sprinting).toBe(false);
    walk(sprint, {}, 2);
    expect(sprint.stamina).toBe(100);
    sprint.stamina = 0;
    walk(sprint, { sprint: true, forward: 1 }, 0.1);
    expect(sprint.sprinting).toBe(false);
    expect(sprint.stamina).toBeGreaterThan(0);
  });
  it("refreshes a speed pickup without multiplying speed or accumulating time", () => {
    const a = actor("a", "A"),
      b = actor("b", "B");
    const pickup = {
      id: 0,
      x: a.x,
      y: a.y,
      z: a.z,
      kind: "speed" as const,
      remaining: 0,
    };
    expect(collectPickup(a, pickup)).toBe(true);
    const duration = a.perks.speed;
    a.perks.speed -= 5;
    expect(collectPickup(a, { ...pickup, remaining: 0 })).toBe(true);
    expect(a.perks.speed).toBe(duration);
    walk(a, { forward: 1 }, 0.5);
    walk(b, { forward: 1 }, 0.5);
    expect((12 - a.z) / (12 - b.z)).toBeCloseTo(1.35);
    expect(pickup.remaining).toBeGreaterThan(duration);
  });
  it("expires perks in the host simulation and clears them after death", () => {
    const game = solo(),
      a = game.actors[0];
    a.perks = { speed: 0.1, invisibility: 0.1, jetpack: 0.1 };
    run(game, 0.2);
    expect(a.perks).toEqual({ speed: 0, invisibility: 0, jetpack: 0 });
    a.perks = { speed: 15, invisibility: 15, jetpack: 15 };
    a.protected = 0;
    damage(game, a, 500, undefined);
    expect(a.perks).toEqual({ speed: 0, invisibility: 0, jetpack: 0 });
    run(game, 2.6);
    expect(a.stamina).toBe(100);
    expect(a.thrusting).toBe(false);
  });
  it("uses jet fuel for controlled flight, collides with a ceiling and lands when released", () => {
    const a = actor("a", "A");
    a.perks.jetpack = 22;
    walk(a, { jump: true, thrust: true }, 1);
    expect(a.y).toBeGreaterThan(4.5);
    expect(a.vy).toBeLessThanOrEqual(6.5);
    expect(a.jetFuel).toBeLessThan(80);
    expect(a.thrusting).toBe(true);
    walk(a, {}, 2);
    expect(a.y).toBe(0);
    expect(a.thrusting).toBe(false);
    const under = actor("b", "B");
    Object.assign(under, { x: -12, z: -13 });
    under.perks.jetpack = 22;
    walk(under, { jump: true, thrust: true }, 1.5);
    expect(under.y + BODY.height).toBeLessThanOrEqual(4.05);
    expect(under.y).toBeGreaterThan(2);
  });
  it("cannot thrust without a pickup or continue powered flight after fuel depletion", () => {
    const a = actor("a", "A");
    walk(a, { jump: true, thrust: true }, 1);
    expect(a.y).toBe(0);
    a.perks.jetpack = 22;
    a.jetFuel = 0;
    Object.assign(a, { y: 6, grounded: false, jumpHeld: true });
    walk(a, { jump: true, thrust: true }, 0.2);
    expect(a.y).toBeLessThan(6);
    expect(a.jetFuel).toBe(0);
    expect(a.thrusting).toBe(false);
  });
  it("hides cloaked opponents from bot targeting until firing or taking damage reveals them", () => {
    const game = solo(),
      player = game.actors[0],
      bot = actor("bot", "Bot", 1, true);
    Object.assign(player, { x: 12, z: -1, protected: 0 });
    Object.assign(bot, { x: 12, z: 2, yaw: 0, protected: 0 });
    player.perks.invisibility = 15;
    game.actors.push(bot);
    run(game, 0.3);
    expect(bot.shots).toBe(0);
    shoot(game, player);
    expect(player.revealed).toBeGreaterThan(1);
    run(game, 1);
    expect(bot.shots).toBeGreaterThan(0);
    player.revealed = 0;
    damage(game, player, 1, bot);
    expect(player.revealed).toBeGreaterThan(2);
    expect(player.hp).toBeLessThan(100);
  });
});

describe("Rift expanded arsenal", () => {
  function duel(weapon: "plasma" | "rail" | "grenade") {
    const game = solo(),
      a = game.actors[0],
      b = actor("b", "B");
    Object.assign(a, { x: 12, z: 2, yaw: 0, protected: 0, weapon });
    a.inventory[weapon] = {
      owned: true,
      clip: WEAPONS[weapon].capacity,
      reserve: WEAPONS[weapon].capacity,
    };
    Object.assign(b, { x: 12, z: -1, protected: 0 });
    game.actors.push(b);
    return { game, a, b };
  }
  it("fires moving plasma bolts that can be dodged and do not splash the shooter", () => {
    const { game, a, b } = duel("plasma");
    shoot(game, a);
    expect(b.hp).toBe(100);
    expect(game.projectiles[0].kind).toBe("plasma");
    run(game, 0.2);
    expect(b.hp).toBe(81);
    expect(a.hp).toBe(100);
    a.cooldown = 0;
    shoot(game, a);
    b.x += 2;
    run(game, 0.2);
    expect(b.hp).toBe(81);
  });
  it("fires a precise heavy rail hit with a slower recovery and finite magazine", () => {
    const { game, a, b } = duel("rail");
    shoot(game, a);
    expect(b.hp).toBe(10);
    expect(game.projectiles).toHaveLength(0);
    expect(a.cooldown).toBeGreaterThan(1);
    expect(a.inventory.rail.clip).toBe(2);
    expect(game.effects.some((e) => e.kind === "shot" && e.life >= 0.15)).toBe(
      true,
    );
    shoot(game, a);
    expect(a.shots).toBe(1);
    a.cooldown = 0;
    Object.assign(a, { x: -12, z: -13, pitch: Math.PI / 2 });
    Object.assign(b, { x: -12, y: 4.5, z: -13 });
    shoot(game, a);
    expect(b.hp).toBe(10);
  });
  it("arcs grenades, bounces on the floor, and detonates on the timed fuse", () => {
    const { game, a, b } = duel("grenade");
    game.actors = [a];
    a.pitch = -0.5;
    shoot(game, a);
    const grenade = game.projectiles[0];
    expect(grenade.kind).toBe("grenade");
    run(game, 0.55);
    expect(grenade.bounces).toBeGreaterThan(0);
    expect(grenade.y).toBeGreaterThanOrEqual(0);
    expect(game.projectiles).toHaveLength(1);
    Object.assign(b, { x: grenade.x + 1, y: 0, z: grenade.z, protected: 0 });
    game.actors.push(b);
    grenade.dx = 0;
    grenade.dz = 0;
    run(game, 1.8);
    expect(game.projectiles).toHaveLength(0);
    expect(b.hp).toBeLessThan(100);
  });
  it("bounces grenades off deck undersides before their fuse expires", () => {
    const { game, a } = duel("grenade");
    game.actors = [a];
    Object.assign(a, { x: -12, z: -13, pitch: 1.2 });
    shoot(game, a);
    const grenade = game.projectiles[0];
    run(game, 0.18);
    expect(grenade.bounces).toBeGreaterThan(0);
    expect(grenade.y).toBeLessThan(4.05);
    expect(grenade.dy).toBeLessThan(0);
    expect(game.projectiles).toHaveLength(1);
  });
  it("collects all six weapon types and never overfills reserve ammunition", () => {
    const a = actor("a", "A");
    for (const kind of [
      "shotgun",
      "rocket",
      "plasma",
      "rail",
      "grenade",
    ] as const) {
      expect(
        collectPickup(a, { id: 0, x: a.x, y: a.y, z: a.z, kind, remaining: 0 }),
      ).toBe(true);
      expect(a.inventory[kind].owned).toBe(true);
      expect(a.weapon).toBe(kind);
    }
    for (let i = 0; i < 50; i++)
      collectPickup(a, {
        id: 1,
        x: a.x,
        y: a.y,
        z: a.z,
        kind: "ammo",
        remaining: 0,
      });
    for (const weapon of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[])
      expect(a.inventory[weapon].reserve).toBe(WEAPONS[weapon].reserve);
  });
  it("serializes all authoritative equipment, movement and projectile state for peers", () => {
    const { game, a } = duel("grenade");
    a.perks = { speed: 12, invisibility: 7, jetpack: 18 };
    a.stamina = 35;
    a.jetFuel = 62;
    shoot(game, a);
    const peer = JSON.parse(JSON.stringify(game)) as typeof game;
    expect(JSON.stringify(peer)).toBe(JSON.stringify(game));
    expect(peer.mapId).toBe("foundry");
    expect(peer.actors[0].perks.invisibility).toBe(7);
    expect(peer.projectiles[0].kind).toBe("grenade");
    const inputs = new Map([
      [a.id, { ...neutralInput(a), forward: 1, sprint: true }],
    ]);
    step(game, inputs, 1 / 60);
    step(peer, inputs, 1 / 60);
    expect(JSON.stringify(peer)).toBe(JSON.stringify(game));
  });
});

describe("Rift authored map integration", () => {
  it("starts and respawns on each selected map's authored surfaces", () => {
    for (const map of MAPS) {
      const game = initial("me", "You", map.id),
        a = game.actors[0];
      expect(game.mapId).toBe(map.id);
      expect(game.pickups.map((p) => p.kind)).toContain("jetpack");
      for (const p of [...map.spawns, ...map.pickups]) {
        expect(floorAt(p.x, p.z, p.y + 0.01, map)).toBeCloseTo(p.y);
        expect(Math.abs(p.x)).toBeLessThan(map.width / 2);
        expect(Math.abs(p.z)).toBeLessThan(map.depth / 2);
      }
      game.actors = [a];
      a.protected = 0;
      damage(game, a, 200, undefined);
      run(game, 2.6);
      expect(
        map.spawns.some((p) => p.x === a.x && p.z === a.z && p.y === a.y),
      ).toBe(true);
      expect(a.hp).toBe(100);
    }
  });
  it.each(["foundry", "aqueduct", "citadel", "orbital"] as const)(
    "bots physically reach the rail rifle on %s",
    (mapId) => {
      const game = initial("me", "You", mapId);
      game.actors = [actor("bot", "Sentinel", 0, true, mapId)];
      game.pickups = game.pickups.filter((p) => p.kind === "rail");
      const bot = game.actors[0],
        map = getMap(mapId);
      run(game, 50);
      expect(bot.inventory.rail.owned).toBe(true);
      expect(bot.walk).toBeGreaterThan(15);
      expect(Math.abs(bot.x)).toBeLessThan(map.width / 2);
      expect(Math.abs(bot.z)).toBeLessThan(map.depth / 2);
      expect(Number.isFinite(bot.y)).toBe(true);
    },
  );
  it.each(["foundry", "aqueduct", "citadel", "orbital"] as const)(
    "produces active bounded combat on %s",
    (mapId) => {
      const game = initial("me", "You", mapId),
        map = getMap(mapId);
      run(game, 35);
      expect(
        game.actors.reduce((total, a) => total + a.shots, 0),
      ).toBeGreaterThan(12);
      expect(game.actors.some((a) => a.bot && a.walk > 30)).toBe(true);
      for (const a of game.actors) {
        expect(Math.abs(a.x)).toBeLessThan(map.width / 2);
        expect(Math.abs(a.z)).toBeLessThan(map.depth / 2);
        expect(a.y).toBeGreaterThanOrEqual(0);
        expect(a.hp).toBeGreaterThanOrEqual(0);
      }
      expect(JSON.stringify(game).length).toBeLessThan(128 * 1024);
    },
  );
});
