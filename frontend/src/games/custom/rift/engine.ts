import {
  contains,
  floorAt,
  getMap,
  rampHeight,
  type ArenaMap,
  type MapId,
  type PickupKind,
  type Vec3,
} from "./map";

export const MATCH_SECONDS = 120;
export const BODY = {
  radius: 0.34,
  height: 1.72,
  eye: 1.5,
  step: 0.34,
  speed: 6.2,
  jump: 7.3,
  gravity: 20,
};
export type WeaponId =
  "carbine" | "shotgun" | "rocket" | "plasma" | "rail" | "grenade";
export type PerkId = "speed" | "invisibility" | "jetpack";
export const PERKS: Record<
  PerkId,
  { name: string; duration: number; respawn: number; color: string }
> = {
  speed: { name: "Overdrive", duration: 18, respawn: 32, color: "#ffd77a" },
  invisibility: {
    name: "Phase cloak",
    duration: 15,
    respawn: 38,
    color: "#d4aeff",
  },
  jetpack: {
    name: "Vector jetpack",
    duration: 22,
    respawn: 40,
    color: "#83d9ff",
  },
};
export const isWeapon = (kind: string): kind is WeaponId =>
  Object.hasOwn(WEAPONS, kind);
export const isPerk = (kind: string): kind is PerkId =>
  Object.hasOwn(PERKS, kind);
export const WEAPONS: Record<
  WeaponId,
  {
    name: string;
    capacity: number;
    reserve: number;
    interval: number;
    reload: number;
    damage: number;
    color: string;
  }
> = {
  carbine: {
    name: "Ion carbine",
    capacity: 24,
    reserve: 144,
    interval: 0.17,
    reload: 1.2,
    damage: 23,
    color: "#98ead9",
  },
  shotgun: {
    name: "Scattergun",
    capacity: 6,
    reserve: 36,
    interval: 0.78,
    reload: 1.55,
    damage: 11,
    color: "#ffc683",
  },
  rocket: {
    name: "Rocket launcher",
    capacity: 4,
    reserve: 16,
    interval: 0.85,
    reload: 1.75,
    damage: 75,
    color: "#ff987c",
  },
  plasma: {
    name: "Plasma caster",
    capacity: 36,
    reserve: 180,
    interval: 0.105,
    reload: 1.65,
    damage: 19,
    color: "#7ebfff",
  },
  rail: {
    name: "Arc rail rifle",
    capacity: 3,
    reserve: 15,
    interval: 1.35,
    reload: 2.2,
    damage: 90,
    color: "#d5a5ff",
  },
  grenade: {
    name: "Breach launcher",
    capacity: 5,
    reserve: 20,
    interval: 0.72,
    reload: 1.9,
    damage: 115,
    color: "#ffd177",
  },
};
export const WEAPON_ORDER: WeaponId[] = [
  "carbine",
  "shotgun",
  "rocket",
  "plasma",
  "rail",
  "grenade",
];
export type Input = {
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
  fire: boolean;
  jump: boolean;
  sprint: boolean;
  thrust: boolean;
  reload: boolean;
  weapon: WeaponId;
  updated: number;
};
export type Actor = Vec3 & {
  id: string;
  name: string;
  yaw: number;
  pitch: number;
  vy: number;
  grounded: boolean;
  hp: number;
  armor: number;
  kills: number;
  deaths: number;
  bot: boolean;
  cooldown: number;
  respawn: number;
  flash: number;
  hit: number;
  protected: number;
  weapon: WeaponId;
  stamina: number;
  sprinting: boolean;
  perks: Record<PerkId, number>;
  jetFuel: number;
  thrusting: boolean;
  revealed: number;
  inventory: Record<
    WeaponId,
    { owned: boolean; clip: number; reserve: number }
  >;
  reloading: number;
  jumpHeld: boolean;
  notice: string;
  noticeTime: number;
  shots: number;
  spawnCount: number;
  nav: number[];
  goal: number;
  destination: Vec3 | null;
  think: number;
  walk: number;
};
export type Pickup = Vec3 & { id: number; kind: PickupKind; remaining: number };
export type Projectile = Vec3 & {
  id: number;
  owner: string;
  dx: number;
  dy: number;
  dz: number;
  life: number;
  kind: "rocket" | "plasma" | "grenade";
  age: number;
  bounces: number;
};
export type Effect = Vec3 & {
  id: number;
  kind: "shot" | "blast" | "spark";
  end?: Vec3;
  life: number;
  maxLife: number;
  color: string;
};
export type Match = {
  tag: string;
  mapId: MapId;
  actors: Actor[];
  pickups: Pickup[];
  projectiles: Projectile[];
  effects: Effect[];
  time: number;
  elapsed: number;
  ended: boolean;
  message: string;
  sequence: number;
};
export const normalize = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const distance = (a: Vec3, b: Vec3) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const neutralInput = (a: Actor): Input => ({
  forward: 0,
  strafe: 0,
  yaw: a.yaw,
  pitch: a.pitch,
  fire: false,
  jump: false,
  sprint: false,
  thrust: false,
  reload: false,
  weapon: a.weapon,
  updated: 0,
});
export function actor(
  id: string,
  name: string,
  index = 0,
  bot = false,
  mapId: MapId = "foundry",
): Actor {
  const map = getMap(mapId),
    spawn = map.spawns[index % map.spawns.length];
  return {
    ...spawn,
    id,
    name,
    pitch: 0,
    vy: 0,
    grounded: true,
    hp: 100,
    armor: 0,
    kills: 0,
    deaths: 0,
    bot,
    cooldown: 0,
    respawn: 0,
    flash: 0,
    hit: 0,
    protected: 1.5,
    weapon: "carbine",
    stamina: 100,
    sprinting: false,
    perks: { speed: 0, invisibility: 0, jetpack: 0 },
    jetFuel: 100,
    thrusting: false,
    revealed: 0,
    inventory: {
      carbine: { owned: true, clip: 24, reserve: 96 },
      shotgun: { owned: false, clip: 0, reserve: 0 },
      rocket: { owned: false, clip: 0, reserve: 0 },
      plasma: { owned: false, clip: 0, reserve: 0 },
      rail: { owned: false, clip: 0, reserve: 0 },
      grenade: { owned: false, clip: 0, reserve: 0 },
    },
    reloading: 0,
    jumpHeld: false,
    notice: `${map.name.toUpperCase()} · Control the high ground and power-ups`,
    noticeTime: 4,
    shots: 0,
    spawnCount: 0,
    nav: [],
    goal: -1,
    destination: null,
    think: 0,
    walk: 0,
  };
}
export function initial(
  id: string,
  name: string,
  mapId: MapId = "foundry",
): Match {
  return {
    tag: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mapId,
    actors: [
      actor(id, name, 0, false, mapId),
      actor("bot-cinder", "Cinder", 1, true, mapId),
      actor("bot-static", "Static", 5, true, mapId),
      actor("bot-echo", "Echo", 6, true, mapId),
    ],
    pickups: getMap(mapId).pickups.map((p, id) => ({ ...p, id, remaining: 0 })),
    projectiles: [],
    effects: [],
    time: MATCH_SECONDS,
    elapsed: 0,
    ended: false,
    message: "First to 12 frags. Control the upper galleries.",
    sequence: 0,
  };
}
export function safeSpawn(
  actors: Actor[],
  excludedId: string,
  mapId: MapId = "foundry",
) {
  const living = actors.filter((a) => a.id !== excludedId && a.hp > 0);
  return [...getMap(mapId).spawns].sort(
    (a, b) =>
      Math.min(100, ...living.map((v) => distance(b, v))) -
      Math.min(100, ...living.map((v) => distance(a, v))),
  )[0];
}
function blocked(x: number, y: number, z: number, map: ArenaMap) {
  for (const s of map.solids) {
    if (y >= s.top - 0.025 || y + BODY.height <= s.bottom + 0.025) continue;
    const dx = Math.max(Math.abs(x - s.x) - s.w / 2, 0),
      dz = Math.max(Math.abs(z - s.z) - s.d / 2, 0);
    if (dx * dx + dz * dz < BODY.radius * BODY.radius) return true;
  }
  for (const ramp of map.ramps)
    if (
      contains(x, z, ramp, BODY.radius * 0.5) &&
      y + BODY.step < rampHeight(ramp, x, z)
    )
      return true;
  return false;
}
function supportFloor(x: number, z: number, ceiling: number, map: ArenaMap) {
  let floor = floorAt(x, z, ceiling, map);
  for (const solid of map.solids) {
    const dx = Math.max(Math.abs(x - solid.x) - solid.w / 2, 0);
    const dz = Math.max(Math.abs(z - solid.z) - solid.d / 2, 0);
    if (
      solid.top <= ceiling + 0.001 &&
      dx * dx + dz * dz <= BODY.radius * BODY.radius
    )
      floor = Math.max(floor, solid.top);
  }
  return floor;
}
/** A cylinder with substepped movement; platforms have real undersides, ramps are solid. */
export function moveActor(
  a: Actor,
  control: Input,
  dt: number,
  map: ArenaMap = getMap("foundry"),
) {
  if (a.hp <= 0) return;
  a.yaw = normalize(control.yaw);
  a.pitch = clamp(control.pitch, -1.35, 1.35);
  if (control.jump && !a.jumpHeld && a.grounded) {
    a.vy = BODY.jump;
    a.grounded = false;
  }
  a.jumpHeld = control.jump;
  const moving = Math.hypot(control.forward, control.strafe) > 0.1;
  a.sprinting = Boolean(
    control.sprint &&
    moving &&
    !control.fire &&
    a.reloading <= 0 &&
    a.stamina > (a.sprinting ? 0 : 15),
  );
  a.stamina = clamp(a.stamina + (a.sprinting ? -27 : 19) * dt, 0, 100);
  a.thrusting = Boolean(
    control.thrust && !a.grounded && a.perks.jetpack > 0 && a.jetFuel > 0,
  );
  a.jetFuel = clamp(
    a.jetFuel +
      (a.thrusting ? -28 : a.grounded ? 30 : control.thrust ? 0 : 10) * dt,
    0,
    100,
  );
  const length = Math.max(1, Math.hypot(control.forward, control.strafe));
  const speed =
    ((a.bot ? 4.35 : BODY.speed) / length) *
    (a.sprinting ? 1.48 : 1) *
    (a.perks.speed > 0 ? 1.35 : 1);
  const dx =
    (-Math.sin(a.yaw) * control.forward + Math.cos(a.yaw) * control.strafe) *
    speed *
    dt;
  const dz =
    (-Math.cos(a.yaw) * control.forward - Math.sin(a.yaw) * control.strafe) *
    speed *
    dt;
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  const beforeX = a.x,
    beforeZ = a.z;
  for (let i = 0; i < count; i++) {
    for (const axis of ["x", "z"] as const) {
      const nx = a.x + (axis === "x" ? dx / count : 0),
        nz = a.z + (axis === "z" ? dz / count : 0);
      const floor = supportFloor(
        nx,
        nz,
        a.y + (a.grounded ? BODY.step : 0),
        map,
      );
      const nextY = a.grounded && floor > a.y ? floor : a.y;
      if (!blocked(nx, nextY, nz, map)) {
        a.x = nx;
        a.z = nz;
        a.y = nextY;
      }
    }
  }
  a.walk += Math.hypot(a.x - beforeX, a.z - beforeZ);
  const previousY = a.y;
  a.vy -= BODY.gravity * dt;
  if (a.thrusting) a.vy = Math.min(6.5, a.vy + 34 * dt);
  let nextY = a.y + a.vy * dt;
  if (a.vy > 0) {
    for (const s of map.solids)
      if (
        contains(a.x, a.z, s, BODY.radius * 0.6) &&
        previousY + BODY.height <= s.bottom + 0.03 &&
        nextY + BODY.height > s.bottom
      ) {
        nextY = s.bottom - BODY.height;
        a.vy = 0;
      }
  }
  const floor = supportFloor(
    a.x,
    a.z,
    previousY + (a.grounded ? BODY.step : 0.04),
    map,
  );
  if (nextY <= floor && a.vy <= 0) {
    a.y = floor;
    a.vy = 0;
    a.grounded = true;
  } else {
    a.y = nextY;
    a.grounded = false;
  }
  // Flight cannot leave the authored arena over the perimeter walls.
  a.x = clamp(
    a.x,
    -map.width / 2 + BODY.radius + 0.55,
    map.width / 2 - BODY.radius - 0.55,
  );
  a.z = clamp(
    a.z,
    -map.depth / 2 + BODY.radius + 0.55,
    map.depth / 2 - BODY.radius - 0.55,
  );
  if (a.y > map.upper + 8) {
    a.y = map.upper + 8;
    a.vy = Math.min(0, a.vy);
  }
}
export function direction(yaw: number, pitch: number): Vec3 {
  return {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
}
/** Slab ray intersection is shared by weapons, splash occlusion and bot vision. */
function rayBox(origin: Vec3, dir: Vec3, min: Vec3, max: Vec3, range: number) {
  let near = 0,
    far = range;
  for (const axis of ["x", "y", "z"] as const) {
    if (Math.abs(dir[axis]) < 0.000001) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return range;
      continue;
    }
    let t1 = (min[axis] - origin[axis]) / dir[axis],
      t2 = (max[axis] - origin[axis]) / dir[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far) return range;
  }
  return near >= 0 && near < range ? near : range;
}
export function worldRay(
  origin: Vec3,
  dir: Vec3,
  range: number,
  map: ArenaMap = getMap("foundry"),
) {
  let result = range;
  for (const s of map.shotSolids)
    result = Math.min(
      result,
      rayBox(
        origin,
        dir,
        { x: s.x - s.w / 2, y: s.bottom, z: s.z - s.d / 2 },
        { x: s.x + s.w / 2, y: s.top, z: s.z + s.d / 2 },
        result,
      ),
    );
  if (dir.y < 0) result = Math.min(result, -origin.y / dir.y);
  // Short surface steps match the exact visible staircase/ramp collision volume.
  for (let d = 0.08; d < result; d += 0.12) {
    const x = origin.x + dir.x * d,
      y = origin.y + dir.y * d,
      z = origin.z + dir.z * d;
    if (
      map.ramps.some(
        (r) => contains(x, z, r) && y >= 0 && y < rampHeight(r, x, z),
      )
    ) {
      result = d;
      break;
    }
  }
  return Math.max(0, result);
}
export function visible(a: Vec3, b: Vec3, map: ArenaMap = getMap("foundry")) {
  const origin = { x: a.x, y: a.y + BODY.eye, z: a.z },
    end = { x: b.x, y: b.y + 1.05, z: b.z };
  const length = distance(origin, end);
  return (
    worldRay(
      origin,
      {
        x: (end.x - origin.x) / length,
        y: (end.y - origin.y) / length,
        z: (end.z - origin.z) / length,
      },
      length,
      map,
    ) >=
    length - 0.15
  );
}
function notify(a: Actor, text: string) {
  a.notice = text;
  a.noticeTime = 2.7;
}
function effect(
  game: Match,
  kind: Effect["kind"],
  p: Vec3,
  color: string,
  life: number,
  end?: Vec3,
) {
  game.effects.push({
    ...p,
    id: ++game.sequence,
    kind,
    color,
    life,
    maxLife: life,
    end,
  });
}
export function damage(
  game: Match,
  target: Actor,
  amount: number,
  source: Actor | undefined,
) {
  if (target.hp <= 0 || target.protected > 0 || amount <= 0) return;
  const absorbed = Math.min(target.armor, amount * 0.65);
  target.armor -= absorbed;
  target.hp = Math.max(0, target.hp - (amount - absorbed));
  target.revealed = Math.max(target.revealed, 2.3);
  if (source && source.id !== target.id) source.hit = 0.18;
  if (target.hp <= 0) {
    target.deaths++;
    target.respawn = 2.5;
    target.reloading = 0;
    target.perks = { speed: 0, invisibility: 0, jetpack: 0 };
    target.sprinting = false;
    target.thrusting = false;
    target.jetFuel = 0;
    if (source && source.id !== target.id) {
      source.kills++;
      notify(source, `FRAGGED ${target.name.toUpperCase()}`);
    } else if (source) source.kills = Math.max(0, source.kills - 1);
    game.message =
      source?.id === target.id
        ? `${target.name} caught their own blast`
        : `${source?.name || getMap(game.mapId).name} fragmented ${target.name}`;
    effect(
      game,
      "blast",
      { x: target.x, y: target.y + 0.8, z: target.z },
      "#8df4e4",
      0.5,
    );
  }
}
export function collectPickup(a: Actor, p: Pickup) {
  if (
    p.remaining > 0 ||
    a.hp <= 0 ||
    Math.hypot(a.x - p.x, a.z - p.z) > 0.95 ||
    Math.abs(a.y - p.y) > 0.8
  )
    return false;
  if (p.kind === "health") {
    if (a.hp >= 100) return false;
    a.hp = Math.min(100, a.hp + 35);
    notify(a, "+35 HEALTH");
  } else if (p.kind === "armor") {
    if (a.armor >= 100) return false;
    a.armor = Math.min(100, a.armor + 60);
    notify(a, "+60 ARMOR");
  } else if (isPerk(p.kind)) {
    a.perks[p.kind] = PERKS[p.kind].duration;
    if (p.kind === "jetpack") a.jetFuel = 100;
    if (p.kind === "speed") a.stamina = 100;
    notify(
      a,
      `${PERKS[p.kind].name.toUpperCase()} · ${PERKS[p.kind].duration}s`,
    );
  } else if (p.kind === "ammo") {
    if (
      WEAPON_ORDER.every(
        (w) =>
          !a.inventory[w].owned || a.inventory[w].reserve >= WEAPONS[w].reserve,
      )
    )
      return false;
    for (const w of WEAPON_ORDER)
      if (a.inventory[w].owned)
        a.inventory[w].reserve = Math.min(
          WEAPONS[w].reserve,
          a.inventory[w].reserve + WEAPONS[w].capacity * 2,
        );
    notify(a, "AMMUNITION REPLENISHED");
  } else if (isWeapon(p.kind)) {
    const w = p.kind,
      ammo = a.inventory[w],
      first = !ammo.owned;
    if (!first && ammo.reserve >= WEAPONS[w].reserve) return false;
    ammo.owned = true;
    if (first) {
      ammo.clip = WEAPONS[w].capacity;
      a.weapon = w;
      a.reloading = 0;
      a.cooldown = 0.25;
    }
    ammo.reserve = Math.min(
      WEAPONS[w].reserve,
      ammo.reserve +
        WEAPONS[w].capacity * (w === "rocket" || w === "rail" ? 1 : 2),
    );
    notify(
      a,
      `${first ? "" : "+"}${WEAPONS[w].name.toUpperCase()}${first ? " ACQUIRED" : " AMMO"}`,
    );
  }
  p.remaining = isPerk(p.kind)
    ? PERKS[p.kind].respawn
    : p.kind === "armor"
      ? 20
      : p.kind === "health"
        ? 15
        : 12;
  return true;
}
export function reload(a: Actor) {
  const ammo = a.inventory[a.weapon];
  if (
    a.reloading <= 0 &&
    ammo.clip < WEAPONS[a.weapon].capacity &&
    ammo.reserve > 0
  )
    a.reloading = WEAPONS[a.weapon].reload;
}
export function shoot(game: Match, a: Actor) {
  if (a.hp <= 0 || a.cooldown > 0 || a.reloading > 0) return;
  const weapon = WEAPONS[a.weapon],
    ammo = a.inventory[a.weapon];
  if (ammo.clip <= 0) {
    reload(a);
    return;
  }
  ammo.clip--;
  a.cooldown = weapon.interval * (a.bot ? 1.7 : 1);
  a.flash = 0.08;
  a.shots++;
  a.protected = 0;
  a.sprinting = false;
  a.revealed = Math.max(a.revealed, 1.8);
  const origin = { x: a.x, y: a.y + BODY.eye, z: a.z };
  if (
    a.weapon === "rocket" ||
    a.weapon === "plasma" ||
    a.weapon === "grenade"
  ) {
    const dir = direction(a.yaw, a.pitch);
    const speed = a.weapon === "plasma" ? 34 : a.weapon === "grenade" ? 14 : 19;
    game.projectiles.push({
      ...origin,
      id: ++game.sequence,
      owner: a.id,
      dx: dir.x * speed,
      dy: dir.y * speed + (a.weapon === "grenade" ? 4.5 : 0),
      dz: dir.z * speed,
      life: a.weapon === "grenade" ? 2.25 : a.weapon === "plasma" ? 2.4 : 4,
      kind: a.weapon,
      age: 0,
      bounces: 0,
    });
    return;
  }
  const pellets = a.weapon === "shotgun" ? 8 : 1;
  for (let i = 0; i < pellets; i++) {
    const spread =
      pellets > 1 ? 0.074 : a.bot ? 0.028 : a.weapon === "rail" ? 0 : 0.002;
    const dir = direction(
      a.yaw + Math.sin(i * 2.4 + a.shots * 1.7) * spread,
      a.pitch + Math.cos(i * 2.4 + a.shots * 1.3) * spread * 0.7,
    );
    const range = a.weapon === "rail" ? 140 : 65;
    let length = worldRay(origin, dir, range, getMap(game.mapId)),
      target: Actor | undefined;
    for (const other of game.actors)
      if (other.id !== a.id && other.hp > 0) {
        const hit = rayBox(
          origin,
          dir,
          { x: other.x - 0.33, y: other.y + 0.06, z: other.z - 0.33 },
          { x: other.x + 0.33, y: other.y + BODY.height, z: other.z + 0.33 },
          length,
        );
        if (hit < length) {
          length = hit;
          target = other;
        }
      }
    const end = {
      x: origin.x + dir.x * length,
      y: origin.y + dir.y * length,
      z: origin.z + dir.z * length,
    };
    if (target)
      damage(
        game,
        target,
        weapon.damage *
          (a.bot ? 0.58 : 1) *
          (a.weapon === "shotgun" ? clamp(1 - length / 40, 0.35, 1) : 1),
        a,
      );
    effect(
      game,
      "shot",
      origin,
      weapon.color,
      a.weapon === "rail" ? 0.16 : 0.065,
      end,
    );
    if (length < range - 0.1)
      effect(game, "spark", end, target ? "#ffbc80" : weapon.color, 0.14);
  }
}
export function route(from: Vec3, to: Vec3, map: ArenaMap = getMap("foundry")) {
  const NAV = map.nav,
    NAV_EDGES = map.navEdges;
  const nearest = (p: Vec3) =>
    NAV.reduce(
      (best, n, i) =>
        distance(n, p) + Math.abs(n.y - p.y) * 3 <
        distance(NAV[best], p) + Math.abs(NAV[best].y - p.y) * 3
          ? i
          : best,
      0,
    );
  const start = nearest(from),
    end = nearest(to),
    costs = NAV.map(() => Infinity),
    previous = NAV.map(() => -1),
    pending = new Set(NAV.map((_, i) => i));
  costs[start] = 0;
  while (pending.size) {
    const current = [...pending].sort((a, b) => costs[a] - costs[b])[0];
    pending.delete(current);
    if (current === end || !Number.isFinite(costs[current])) break;
    for (const edge of NAV_EDGES)
      if (edge.includes(current)) {
        const next = edge[0] === current ? edge[1] : edge[0],
          cost = costs[current] + distance(NAV[current], NAV[next]);
        if (cost < costs[next]) {
          costs[next] = cost;
          previous[next] = current;
        }
      }
  }
  const path = [end];
  while (path[0] !== start && previous[path[0]] !== -1)
    path.unshift(previous[path[0]]);
  return path;
}
function botInput(game: Match, a: Actor, dt: number): Input {
  const map = getMap(game.mapId),
    NAV = map.nav;
  const target = game.actors
    .filter(
      (b) =>
        b.id !== a.id &&
        b.hp > 0 &&
        (b.perks.invisibility <= 0 || b.revealed > 0),
    )
    .sort((x, y) => distance(a, x) - distance(a, y))[0];
  a.think -= dt;
  const canSee = !!target && visible(a, target, map);
  const nextNode = NAV[a.nav[0]];
  const fellBelowRoute = Boolean(
    a.grounded &&
    nextNode &&
    nextNode.y > a.y + 0.75 &&
    Math.hypot(a.x - nextNode.x, a.z - nextNode.z) < 1.2 &&
    !map.ramps.some((r) => contains(a.x, a.z, r)),
  );
  if (fellBelowRoute) a.think = 0;
  if (a.think <= 0 || !a.destination) {
    a.think = 0.8;
    const supply = game.pickups
      .filter(
        (p) =>
          p.remaining <= 0 &&
          ((isWeapon(p.kind) && !a.inventory[p.kind].owned) ||
            (isPerk(p.kind) && a.perks[p.kind] < 3) ||
            (p.kind === "armor" && a.armor < 35) ||
            (p.kind === "health" && a.hp < 60) ||
            (p.kind === "ammo" && a.inventory[a.weapon].reserve < 4)),
      )
      .sort((x, y) => distance(a, x) - distance(a, y))[0];
    const goal =
      supply && (!canSee || a.hp < 45 || !a.inventory.shotgun.owned)
        ? supply
        : target ||
          map.nav[
            (Math.floor(game.elapsed / 7) + a.id.length * 3) % map.nav.length
          ];
    if (goal) {
      const path = route(a, goal, map),
        endpoint = path[path.length - 1];
      if (endpoint !== a.goal || !a.destination || fellBelowRoute) {
        a.nav = path;
        a.goal = endpoint;
      }
      a.destination = { x: goal.x, y: goal.y, z: goal.z };
    }
  }
  while (
    a.nav.length > 0 &&
    Math.hypot(a.x - NAV[a.nav[0]].x, a.z - NAV[a.nav[0]].z) < 0.65 &&
    Math.abs(a.y - NAV[a.nav[0]].y) < 0.55
  )
    a.nav.shift();
  let waypoint: Vec3 = NAV[a.nav[0]] || a.destination || target || a;
  if (
    canSee &&
    target &&
    Math.abs(a.y - target.y) < 0.5 &&
    distance(a, target) < 9 &&
    (!a.destination || distance(a.destination, target) < 1) &&
    !map.ramps.some((r) => contains(a.x, a.z, r))
  )
    waypoint = target;
  const dx = waypoint.x - a.x,
    dz = waypoint.z - a.z,
    moveYaw = Math.atan2(-dx, -dz);
  let yaw = moveYaw,
    pitch = 0;
  if (target && canSee) {
    yaw = Math.atan2(a.x - target.x, a.z - target.z);
    pitch = Math.atan2(
      target.y + 1.1 - (a.y + BODY.eye),
      Math.hypot(a.x - target.x, a.z - target.z),
    );
  }
  const delta = normalize(yaw - a.yaw);
  yaw = normalize(a.yaw + clamp(delta, -dt * 3.4, dt * 3.4));
  const move = distance(a, waypoint) > 0.25 ? 0.88 : canSee ? -0.12 : 0;
  const offset = normalize(moveYaw - yaw);
  const targetDistance = distance(a, target || a);
  const preference: WeaponId[] =
    targetDistance > 22
      ? ["rail", "rocket", "plasma", "carbine", "grenade", "shotgun"]
      : targetDistance < 8
        ? ["shotgun", "plasma", "carbine", "rail", "grenade", "rocket"]
        : ["rocket", "plasma", "grenade", "rail", "carbine", "shotgun"];
  const weapon =
    preference.find(
      (w) =>
        a.inventory[w].owned &&
        a.inventory[w].clip + a.inventory[w].reserve > 0,
    ) || a.weapon;
  return {
    forward: Math.cos(offset) * move,
    strafe: -Math.sin(offset) * move,
    yaw,
    pitch,
    fire:
      canSee && Math.abs(delta) < 0.11 && !!target && distance(a, target) < 34,
    jump:
      a.grounded &&
      game.projectiles.some((p) => p.owner !== a.id && distance(a, p) < 5),
    sprint: !canSee && a.nav.length > 1 && a.stamina > 25,
    thrust:
      a.perks.jetpack > 0 &&
      !a.grounded &&
      a.vy < 1 &&
      !!target &&
      target.y > a.y + 1,
    reload: a.inventory[weapon].clip === 0,
    weapon,
    updated: 0,
  };
}
/** A collision normal for a swept projectile, including deck undersides and ramps. */
function impactNormal(point: Vec3, direction: Vec3, map: ArenaMap): Vec3 {
  let best = Infinity;
  let normal: Vec3 = { x: 0, y: 1, z: 0 };
  for (const solid of map.shotSolids) {
    const min = {
      x: solid.x - solid.w / 2,
      y: solid.bottom,
      z: solid.z - solid.d / 2,
    };
    const max = {
      x: solid.x + solid.w / 2,
      y: solid.top,
      z: solid.z + solid.d / 2,
    };
    if (
      ["x", "y", "z"].some(
        (axis) =>
          point[axis as keyof Vec3] < min[axis as keyof Vec3] - 0.15 ||
          point[axis as keyof Vec3] > max[axis as keyof Vec3] + 0.15,
      )
    )
      continue;
    for (const axis of ["x", "y", "z"] as const) {
      const face = direction[axis] > 0 ? min[axis] : max[axis];
      const gap = Math.abs(point[axis] - face);
      if (Math.abs(direction[axis]) > 0.0001 && gap < best) {
        best = gap;
        normal = { x: 0, y: 0, z: 0 };
        normal[axis] = direction[axis] > 0 ? -1 : 1;
      }
    }
  }
  if (point.y < 0.12) return { x: 0, y: 1, z: 0 };
  if (best < 0.15) return normal;
  const ramp = map.ramps.find(
    (r) =>
      contains(point.x, point.z, r) &&
      Math.abs(point.y - rampHeight(r, point.x, point.z)) < 0.3,
  );
  if (ramp && !ramp.steps) {
    const gradientX =
      (rampHeight(ramp, point.x + 0.05, point.z) -
        rampHeight(ramp, point.x - 0.05, point.z)) /
      0.1;
    const gradientZ =
      (rampHeight(ramp, point.x, point.z + 0.05) -
        rampHeight(ramp, point.x, point.z - 0.05)) /
      0.1;
    const magnitude = Math.hypot(gradientX, 1, gradientZ);
    return {
      x: -gradientX / magnitude,
      y: 1 / magnitude,
      z: -gradientZ / magnitude,
    };
  }
  return normal;
}
function explode(game: Match, p: Projectile, origin: Vec3, map: ArenaMap) {
  const source = game.actors.find((a) => a.id === p.owner);
  const radius = p.kind === "grenade" ? 5.2 : 4.8;
  const power = p.kind === "grenade" ? 115 : 110;
  for (const a of game.actors) {
    if (a.hp <= 0) continue;
    const center = { x: a.x, y: a.y + 0.8, z: a.z },
      d = distance(origin, center);
    if (
      d < radius &&
      worldRay(
        origin,
        {
          x: (center.x - origin.x) / Math.max(0.001, d),
          y: (center.y - origin.y) / Math.max(0.001, d),
          z: (center.z - origin.z) / Math.max(0.001, d),
        },
        d,
        map,
      ) >=
        d - 0.2
    )
      damage(
        game,
        a,
        (1 - d / radius) *
          power *
          (a.id === source?.id ? 0.6 : source?.bot ? 0.65 : 1),
        source,
      );
  }
  effect(game, "blast", p, WEAPONS[p.kind].color, 0.5);
}
function advanceProjectile(
  game: Match,
  p: Projectile,
  dt: number,
  map: ArenaMap,
) {
  p.age += dt;
  p.life -= dt;
  if (p.kind === "grenade") p.dy -= 13 * dt;
  const speed = Math.hypot(p.dx, p.dy, p.dz);
  const travel = speed * dt;
  const dir = {
    x: p.dx / Math.max(0.001, speed),
    y: p.dy / Math.max(0.001, speed),
    z: p.dz / Math.max(0.001, speed),
  };
  let length = worldRay(p, dir, travel, map),
    worldHit = length < travel;
  let target: Actor | undefined;
  for (const a of game.actors) {
    if (
      a.hp <= 0 ||
      (a.id === p.owner && (p.kind !== "grenade" || p.age < 0.45))
    )
      continue;
    const hit = rayBox(
      p,
      dir,
      { x: a.x - 0.37, y: a.y, z: a.z - 0.37 },
      { x: a.x + 0.37, y: a.y + BODY.height, z: a.z + 0.37 },
      length,
    );
    if (hit < length) {
      length = hit;
      target = a;
      worldHit = false;
    }
  }
  p.x += dir.x * length;
  p.y += dir.y * length;
  p.z += dir.z * length;
  if (p.kind === "plasma") {
    if (target)
      damage(
        game,
        target,
        WEAPONS.plasma.damage *
          (game.actors.find((a) => a.id === p.owner)?.bot ? 0.65 : 1),
        game.actors.find((a) => a.id === p.owner),
      );
    if (target || worldHit || p.life <= 0) {
      effect(game, "spark", p, WEAPONS.plasma.color, 0.2);
      return false;
    }
    return true;
  }
  if (p.kind === "grenade" && worldHit && p.life > 0) {
    const normal = impactNormal(p, dir, map);
    const dot = p.dx * normal.x + p.dy * normal.y + p.dz * normal.z;
    p.dx = (p.dx - 1.56 * dot * normal.x) * 0.85;
    p.dy = (p.dy - 1.56 * dot * normal.y) * 0.85;
    p.dz = (p.dz - 1.56 * dot * normal.z) * 0.85;
    p.x += normal.x * 0.055;
    p.y += normal.y * 0.055;
    p.z += normal.z * 0.055;
    p.bounces++;
    if (p.bounces <= 5) effect(game, "spark", p, "#ffe1a0", 0.09);
    return true;
  }
  if (worldHit || target || p.life <= 0) {
    // Move blasts just off walls so their own impact surface doesn't hide them.
    explode(
      game,
      p,
      {
        x: p.x - dir.x * 0.1,
        y: Math.max(0.08, p.y - dir.y * 0.1),
        z: p.z - dir.z * 0.1,
      },
      map,
    );
    return false;
  }
  return true;
}

export function step(game: Match, inputs: Map<string, Input>, dt: number) {
  if (game.ended) return;
  const map = getMap(game.mapId);
  dt = clamp(dt, 0, 0.04);
  game.elapsed += dt;
  game.time = Math.max(0, game.time - dt);
  game.effects = game.effects.filter((e) => (e.life -= dt) > 0);
  for (const p of game.pickups) p.remaining = Math.max(0, p.remaining - dt);
  for (const a of game.actors) {
    a.flash = Math.max(0, a.flash - dt);
    a.hit = Math.max(0, a.hit - dt);
    a.cooldown = Math.max(0, a.cooldown - dt);
    a.protected = Math.max(0, a.protected - dt);
    a.noticeTime = Math.max(0, a.noticeTime - dt);
    a.revealed = Math.max(0, a.revealed - dt);
    for (const perk of Object.keys(PERKS) as PerkId[])
      a.perks[perk] = Math.max(0, a.perks[perk] - dt);
    if (a.hp <= 0) {
      const floor = supportFloor(a.x, a.z, a.y + 0.04, map);
      a.vy -= BODY.gravity * dt;
      a.y = Math.max(floor, a.y + a.vy * dt);
      a.grounded = a.y <= floor + 0.001;
      if (a.grounded) a.vy = 0;
      a.respawn -= dt;
      if (a.respawn <= 0) {
        const spawn = safeSpawn(game.actors, a.id, game.mapId),
          fresh = actor(a.id, a.name, 0, a.bot, game.mapId);
        Object.assign(a, fresh, spawn, {
          kills: a.kills,
          deaths: a.deaths,
          shots: a.shots,
          spawnCount: a.spawnCount + 1,
        });
      }
      continue;
    }
    const control = a.bot
      ? botInput(game, a, dt)
      : inputs.get(a.id) || neutralInput(a);
    if (a.inventory[control.weapon]?.owned && control.weapon !== a.weapon) {
      a.weapon = control.weapon;
      a.reloading = 0;
      a.cooldown = Math.max(0.22, a.cooldown);
    }
    if (a.reloading > 0) {
      a.reloading = Math.max(0, a.reloading - dt);
      if (a.reloading === 0) {
        const ammo = a.inventory[a.weapon],
          count = Math.min(
            WEAPONS[a.weapon].capacity - ammo.clip,
            ammo.reserve,
          );
        ammo.clip += count;
        ammo.reserve -= count;
      }
    }
    if (control.reload) reload(a);
    moveActor(a, control, dt, map);
    for (const p of game.pickups) collectPickup(a, p);
    if (control.fire) shoot(game, a);
  }
  game.projectiles = game.projectiles.filter((p) =>
    advanceProjectile(game, p, dt, map),
  );
  if (game.time <= 0 || game.actors.some((a) => a.kills >= 12)) {
    game.ended = true;
    game.message = `${[...game.actors].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)[0].name} takes ${map.name}.`;
  }
}
