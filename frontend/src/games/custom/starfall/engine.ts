import {
  BUILDABLE,
  DIFFICULTIES,
  ENEMIES,
  LINK_RADIUS,
  MINE_RADIUS,
  MINING_GOAL,
  MISSIONS,
  STRUCTURES,
  WORLD_H,
  WORLD_W,
  dist,
} from "./catalog";
import type {
  Difficulty,
  EnemyKind,
  Level,
  Mode,
  Point,
  StructureKind,
} from "./catalog";
export * from "./catalog";

export type Structure = Point & {
  id: number;
  kind: StructureKind;
  level: number;
  hp: number;
  maxHp: number;
  energy: number;
  capacity: number;
  network: number;
  connected: boolean;
  connections: number[];
  progress: number;
  buildEnergy: number;
  spent: number;
  upgrading: {
    kind: StructureKind;
    level: number;
    progress: number;
    energy: number;
  } | null;
  cooldown: number;
  target: number | null;
  working: boolean;
  angle: number;
  priority: "nearest" | "strongest" | "weakest";
  depleted: boolean;
};
export type Asteroid = Point & {
  id: number;
  ore: number;
  initialOre: number;
  radius: number;
  seed: number;
};
export type Enemy = Point & {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  angle: number;
  cooldown: number;
  spawnTimer: number;
  hit: number;
};
export type Projectile = Point & {
  id: number;
  target: number;
  enemy: boolean;
  angle: number;
  speed: number;
  damage: number;
  hp: number;
  life: number;
  radius: number;
  source: number;
};
export type Beam = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  life: number;
  kind: "laser" | "pulser" | "thel" | "enemy";
  source: number;
};
export type Burst = Point & {
  life: number;
  maxLife: number;
  seed: number;
  color: string;
  size: number;
};
export type Drone = Point & {
  id: number;
  home: number;
  target: number | null;
  phase: number;
  working: boolean;
};
export type PowerNetwork = {
  id: number;
  nodes: number[];
  energy: number;
  capacity: number;
  generation: number;
  demand: number;
  brownout: boolean;
};
export type Incoming = {
  id: number;
  at: number;
  kind: EnemyKind;
  count: number;
  angle: number;
  wave: number;
};
export type Expedition = {
  tag: string;
  mode: Mode;
  difficulty: Difficulty;
  mission: number;
  started: boolean;
  ended: boolean;
  won: boolean;
  paused: boolean;
  speed: number;
  ore: number;
  mined: number;
  totalOre: number;
  miningRate: number;
  energy: number;
  capacity: number;
  generation: number;
  demand: number;
  time: number;
  wave: number;
  nextWave: number;
  structures: Structure[];
  asteroids: Asteroid[];
  enemies: Enemy[];
  projectiles: Projectile[];
  beams: Beam[];
  bursts: Burst[];
  drones: Drone[];
  networks: PowerNetwork[];
  incoming: Incoming[];
  nextId: number;
  kills: number;
  capitalKills: number;
  chosenWaves: number[];
  trainingStep: number;
  rng: number;
  history: {
    time: number;
    miningRate: number;
    energy: number;
    capacity: number;
  }[];
  message: string;
  messageAt: number;
  receipt?: { id: string; message: string };
  connectionDirty: boolean;
};
export const stats = (node: Pick<Structure, "kind" | "level">): Level =>
  STRUCTURES[node.kind].levels[node.level - 1];
const ready = (n: Structure) => n.hp > 0 && n.progress >= 1;
export const operating = (n: Structure) => ready(n) && !n.upgrading;
const rand = (game: Expedition) => {
  game.rng = (Math.imul(game.rng, 1664525) + 1013904223) >>> 0;
  return game.rng / 4294967296;
};
const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n));
const MAX_INCOMING = 60;
const MAX_PROJECTILES = 1600;
const say = (game: Expedition, message: string) => {
  game.message = message;
  game.messageAt = game.time;
  return message;
};
export function makeStructure(
  id: number,
  kind: StructureKind,
  x: number,
  y: number,
  complete = true,
): Structure {
  const s = STRUCTURES[kind].levels[0];
  return {
    id,
    kind,
    x,
    y,
    level: 1,
    hp: s.hp,
    maxHp: s.hp,
    energy: complete && kind === "solar" ? s.capacity : 0,
    capacity: s.capacity,
    network: -1,
    connected: false,
    connections: [],
    progress: complete ? 1 : 0,
    buildEnergy: Math.max(1, STRUCTURES[kind].cost / 20),
    spent: STRUCTURES[kind].cost,
    upgrading: null,
    cooldown: 0,
    target: null,
    working: false,
    angle: -Math.PI / 2,
    priority: kind === "missile" || kind === "thel" ? "strongest" : "nearest",
    depleted: false,
  };
}

export function newExpedition(
  mode: Mode = "training",
  difficulty: Difficulty = "normal",
  mission = 0,
): Expedition {
  mission = clamp(Math.floor(mission), 0, 8);
  const spec = MISSIONS[mission];
  const totalOre =
    mode === "campaign" ? spec.ore : mode === "training" ? 6000 : 65000;
  const game: Expedition = {
    tag: crypto.randomUUID(),
    mode,
    difficulty: mode === "campaign" ? spec.difficulty : difficulty,
    mission,
    started: false,
    ended: false,
    won: false,
    paused: false,
    speed: 1,
    ore:
      mode === "campaign"
        ? spec.starting
        : mode === "sandbox"
          ? 999999
          : mode === "training"
            ? 650
            : 750,
    mined: 0,
    totalOre,
    miningRate: 0,
    energy: 4,
    capacity: 5,
    generation: 2.7,
    demand: 0,
    time: 0,
    wave: 0,
    nextWave: DIFFICULTIES[difficulty].grace,
    structures: [],
    asteroids: [],
    enemies: [],
    projectiles: [],
    beams: [],
    bursts: [],
    drones: [],
    networks: [],
    incoming: [],
    nextId: 1000,
    kills: 0,
    capitalKills: 0,
    chosenWaves: [],
    trainingStep: 0,
    rng: mode === "campaign" ? spec.seed : 78123,
    history: [],
    message:
      "A solar station and miner are online. Expand the network; every mineral and energy link matters.",
    messageAt: 0,
    connectionDirty: true,
  };
  game.nextWave = DIFFICULTIES[game.difficulty].grace;
  if (mode === "campaign" && spec.objective === "mine" && mission >= 3)
    game.nextWave = game.difficulty === "hard" ? 140 : 160;
  const count =
    mode === "campaign" && mission < 2 ? 14 : mode === "training" ? 16 : 48;
  const points: Point[] = [
    { x: 803, y: 607 },
    { x: 957, y: 493 },
    { x: 1056, y: 661 },
    { x: 735, y: 471 },
    { x: 884, y: 747 },
  ];
  for (let i = points.length; i < count; i++) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = rand(game) * Math.PI * 2;
      const radius =
        210 + Math.sqrt(rand(game)) * (mode === "training" ? 280 : 590);
      const p = {
        x: 900 + Math.cos(angle) * radius,
        y: 600 + Math.sin(angle) * radius * 0.66,
      };
      if (points.every((other) => dist(p, other) > 58)) {
        points.push(p);
        break;
      }
    }
  }
  const weights = points.map(() => 0.65 + rand(game));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let remaining = totalOre;
  game.asteroids = points.map((p, i) => {
    const ore =
      i === points.length - 1
        ? remaining
        : Math.floor((totalOre * weights[i]) / weightSum);
    remaining -= ore;
    return {
      ...p,
      id: 100 + i,
      ore,
      initialOre: ore,
      radius: clamp(13 + Math.sqrt(ore) * 0.36, 16, 34),
      seed: i * 97 + spec.seed,
    };
  });
  game.structures = [makeStructure(1, "solar", 900, 600)];
  if (!(mode === "campaign" && mission === 0))
    game.structures.push(makeStructure(2, "miner", 848, 610));
  if (mode === "campaign" && mission === 0)
    game.message =
      "One solar station. 500 minerals. Build your first miners beside the nearby asteroids.";
  if (mode === "campaign" && mission === 5) {
    game.structures.push(
      makeStructure(3, "solar", 920, 675),
      makeStructure(4, "battery", 981, 624),
    );
  }
  game.energy = game.structures.reduce((sum, node) => sum + node.energy, 0);
  game.capacity = game.structures.reduce((sum, node) => sum + node.capacity, 0);
  game.generation = game.structures.reduce(
    (sum, node) => sum + stats(node).generation,
    0,
  );
  updateConnections(game);
  return game;
}

// Geometric links form deterministic components. Solar nodes have no degree cap;
// relays have the documented six-link cap. Other units also conduct power.
export function updateConnections(game: Expedition) {
  const nodes = game.structures;
  const previous = new Map(nodes.map((n) => [n.id, n.connections]));
  for (const n of nodes) {
    n.connections = [];
    n.network = -1;
    n.connected = false;
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const maxLinks = (n: Structure) => (n.kind === "solar" ? Infinity : 6);
  const edges: {
    a: Structure;
    b: Structure;
    distance: number;
    existing: boolean;
  }[] = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i],
        b = nodes[j];
      const distance = dist(a, b);
      if (
        distance <= LINK_RADIUS &&
        a.hp > 0 &&
        b.hp > 0 &&
        (ready(a) || ready(b))
      )
        edges.push({
          a,
          b,
          distance,
          existing: previous.get(a.id)?.includes(b.id) ?? false,
        });
    }
  edges.sort(
    (a, b) =>
      Number(b.existing) - Number(a.existing) ||
      a.distance - b.distance ||
      a.a.id - b.a.id,
  );
  for (const { a, b } of edges) {
    if (
      a.connections.length >= maxLinks(a) ||
      b.connections.length >= maxLinks(b)
    )
      continue;
    if (
      (!ready(a) && a.connections.length) ||
      (!ready(b) && b.connections.length)
    )
      continue;
    a.connections.push(b.id);
    b.connections.push(a.id);
  }
  game.networks = [];
  for (const start of nodes.filter(ready)) {
    if (start.network !== -1) continue;
    const network: PowerNetwork = {
      id: start.id,
      nodes: [],
      energy: 0,
      capacity: 0,
      generation: 0,
      demand: 0,
      brownout: false,
    };
    const queue = [start];
    start.network = network.id;
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i];
      network.nodes.push(n.id);
      for (const id of n.connections) {
        const next = byId.get(id)!;
        if (next.network !== -1) continue;
        next.network = network.id;
        if (ready(next)) queue.push(next);
        else network.nodes.push(next.id);
      }
    }
    const generating = network.nodes.some((id) => {
      const n = byId.get(id)!;
      return ready(n) && n.kind === "solar";
    });
    for (const id of network.nodes) byId.get(id)!.connected = generating;
    game.networks.push(network);
  }
  game.connectionDirty = false;
}

export function placementError(
  game: Expedition,
  kind: StructureKind,
  x: number,
  y: number,
): string | null {
  if (!BUILDABLE.includes(kind))
    return "Choose a structure from the build bar.";
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 35 ||
    x > WORLD_W - 35 ||
    y < 35 ||
    y > WORLD_H - 35
  )
    return "Build inside the sector boundary.";
  if (game.structures.length >= 220)
    return "The sector has reached its 220-station limit. Recycle unused stations.";
  if (game.mode !== "sandbox" && game.ore < STRUCTURES[kind].cost)
    return "Need " + STRUCTURES[kind].cost + " minerals.";
  const radius = STRUCTURES[kind].radius;
  if (
    game.structures.some(
      (n) => dist(n, { x, y }) < radius + STRUCTURES[n.kind].radius + 7,
    )
  )
    return "Leave room between stations.";
  if (
    game.asteroids.some(
      (a) => a.ore > 0 && dist(a, { x, y }) < radius + a.radius + 3,
    )
  )
    return "Place stations beside an asteroid, not on it.";
  if (
    game.mode !== "sandbox" &&
    kind !== "solar" &&
    !game.structures.some(
      (n) =>
        ready(n) &&
        n.connected &&
        n.connections.length < (n.kind === "solar" ? Infinity : 6) &&
        dist(n, { x, y }) <= LINK_RADIUS,
    )
  )
    return "A free energy link from a powered station is required. Extend a relay first.";
  if (
    kind === "miner" &&
    !game.asteroids.some((a) => a.ore > 0 && dist(a, { x, y }) <= MINE_RADIUS)
  )
    return "A miner needs mineral-bearing rock within its green range circle.";
  return null;
}

export function upgradeOptions(
  node: Structure,
): { kind: StructureKind; level: number; cost: number; name: string }[] {
  if (node.kind === "laser")
    return [
      { kind: "pulser", level: 1, cost: 100, name: "Pulser laser" },
      { kind: "thel", level: 1, cost: 500, name: "THEL beam" },
    ];
  const next = STRUCTURES[node.kind].levels[node.level];
  return next
    ? [
        {
          kind: node.kind,
          level: node.level + 1,
          cost: next.upgradeCost,
          name: "Level " + (node.level + 1),
        },
      ]
    : [];
}
export function salvageValue(node: Structure) {
  // Full-health base machines refund their entire original cost. Upgrade mineral
  // investments refund half. Pending upgrades are fully refundable before work.
  const base = ["pulser", "thel"].includes(node.kind)
    ? STRUCTURES.laser.cost
    : STRUCTURES[node.kind].cost;
  const pending = node.upgrading
    ? upgradeOptions(node).find(
        (o) =>
          o.kind === node.upgrading!.kind && o.level === node.upgrading!.level,
      )?.cost || 0
    : 0;
  const recovery =
    base +
    (node.spent - base - pending) * 0.5 +
    pending * (1 - (node.upgrading?.progress || 0) * 0.5);
  return Math.max(0, Math.floor(recovery * clamp(node.hp / node.maxHp, 0, 1)));
}
export function performAction(
  game: Expedition,
  action: Record<string, unknown>,
): string {
  if (action.tag !== game.tag)
    return "That command belongs to an earlier expedition.";
  if (action.type === "start") {
    if (!game.started) game.started = true;
    return say(
      game,
      "Network online. Build carefully and watch your power reserves.",
    );
  }
  if (!game.started || game.ended)
    return "Start an expedition before giving orders.";
  if (action.type === "pause") {
    game.paused = action.paused === true;
    return say(
      game,
      game.paused
        ? "Paused. You can place and upgrade stations; construction resumes with the clock."
        : "Simulation resumed.",
    );
  }
  if (action.type === "speed") {
    if ([0.5, 1, 2, 4].includes(Number(action.speed)))
      game.speed = Number(action.speed);
    return "";
  }
  if (action.type === "end") {
    game.ended = true;
    game.won = false;
    return say(
      game,
      "Operation recalled. Your recorded progress has been banked.",
    );
  }
  if (action.type === "wave") {
    if (!["waves", "sandbox"].includes(game.mode))
      return "Choose Wave challenge or Sandbox to call a fleet.";
    const number = Number(action.wave);
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > 6 ||
      (game.mode === "waves" && game.chosenWaves.includes(number))
    )
      return "Choose a fleet that has not already been called.";
    if (game.incoming.length > MAX_INCOMING - 3)
      return "The arrival lanes are full. Wait for the queued fleets.";
    if (!game.chosenWaves.includes(number)) game.chosenWaves.push(number);
    queueWave(game, number, 7);
    return say(game, "Fleet " + number + " inbound.");
  }
  if (action.type === "build") {
    const kind = action.kind as StructureKind,
      x = Number(action.x),
      y = Number(action.y);
    const error = placementError(game, kind, x, y);
    if (error) return error;
    if (game.mode !== "sandbox") game.ore -= STRUCTURES[kind].cost;
    const node = makeStructure(
      game.nextId++,
      kind,
      x,
      y,
      game.mode === "sandbox",
    );
    game.structures.push(node);
    game.connectionDirty = true;
    updateConnections(game);
    return say(
      game,
      STRUCTURES[kind].name +
        (node.progress === 1 ? " online." : " construction queued."),
    );
  }
  const node = game.structures.find((n) => n.id === action.id && n.hp > 0);
  if (!node) return "Select a station first.";
  if (action.type === "inspect") {
    if (
      game.mode === "training" &&
      game.trainingStep === 0 &&
      node.kind === "miner"
    )
      game.trainingStep = 1;
    return "";
  }
  if (action.type === "priority") {
    if (["nearest", "strongest", "weakest"].includes(String(action.priority)))
      node.priority = action.priority as Structure["priority"];
    return say(game, "Target priority: " + node.priority + ".");
  }
  if (action.type === "salvage") {
    if (
      node.kind === "solar" &&
      game.structures.filter((n) => n.kind === "solar" && n.hp > 0).length ===
        1 &&
      action.confirm !== true &&
      game.mode !== "sandbox"
    )
      return "This is your last solar station. Confirm recycling to shut down generation.";
    const scrap =
      node.kind === "miner" && node.depleted
        ? game.structures.filter((n) => n.kind === "miner" && n.depleted)
        : [node];
    const refund = scrap.reduce((total, n) => total + salvageValue(n), 0);
    game.ore += refund;
    const ids = new Set(scrap.map((n) => n.id));
    game.structures = game.structures.filter((n) => !ids.has(n.id));
    game.connectionDirty = true;
    updateConnections(game);
    return say(
      game,
      "Recycled " +
        scrap.length +
        " station" +
        (scrap.length === 1 ? "" : "s") +
        " for " +
        refund +
        " minerals.",
    );
  }
  if (action.type === "upgrade") {
    if (!ready(node) || node.upgrading)
      return "Wait for construction to finish.";
    const options = upgradeOptions(node);
    const option = action.branch
      ? options.find((o) => o.kind === action.branch)
      : options[0];
    if (!option) return "This station is fully upgraded.";
    if (game.mode !== "sandbox" && game.ore < option.cost)
      return "Need " + option.cost + " minerals to upgrade.";
    if (game.mode !== "sandbox") game.ore -= option.cost;
    node.spent += option.cost;
    node.upgrading = {
      kind: option.kind,
      level: option.level,
      progress: game.mode === "sandbox" ? 1 : 0,
      energy: Math.max(2, option.cost / 20),
    };
    return say(
      game,
      "Upgrading " + STRUCTURES[node.kind].name + " to " + option.name + ".",
    );
  }
  return "Unknown station command.";
}

export function spawnEnemy(
  game: Expedition,
  kind: EnemyKind,
  x: number,
  y: number,
): Enemy {
  const spec = ENEMIES[kind];
  const scale = DIFFICULTIES[game.difficulty].multiplier;
  const hp =
    spec.hp *
    (game.mode === "training" ? 0.5 : Math.max(0.8, Math.sqrt(scale)));
  const enemy = {
    id: game.nextId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    angle: 0,
    cooldown: 1 + rand(game),
    spawnTimer: 10,
    hit: 0,
  };
  game.enemies.push(enemy);
  return enemy;
}
export function queueWave(game: Expedition, number: number, warning = 14) {
  if (game.incoming.length > MAX_INCOMING - 3) return;
  const mix: [EnemyKind, number][][] = [
    [["fighter", 6]],
    [
      ["fighter", 9],
      ["missileShip", 2],
    ],
    [
      ["swarmer", 22],
      ["suicide", 6],
    ],
    [
      ["ringer", 5],
      ["missileShip", 4],
    ],
    [
      ["mothership", 2],
      ["fighter", 10],
      ["suicide", 5],
    ],
    [
      ["mothership", 4],
      ["ringer", 8],
      ["swarmer", 35],
    ],
  ];
  const roster = mix[Math.min(5, number - 1)];
  const escalation =
    game.mode === "campaign" && MISSIONS[game.mission].objective === "survive"
      ? 0.09
      : 0.17;
  const multiplier =
    DIFFICULTIES[game.difficulty].multiplier *
    (number > 6 ? 1 + (number - 6) * escalation : 1);
  const angle = rand(game) * Math.PI * 2;
  for (let i = 0; i < roster.length; i++) {
    const [kind, count] = roster[i];
    game.incoming.push({
      id: game.nextId++,
      kind,
      count: Math.max(1, Math.round(count * multiplier)),
      at: game.time + warning + i * 4,
      angle: angle + i * 0.28,
      wave: number,
    });
  }
  game.wave = Math.max(game.wave, number);
}
function spawnIncoming(game: Expedition) {
  for (const incoming of game.incoming.filter((w) => w.at <= game.time)) {
    const center = { x: WORLD_W / 2, y: WORLD_H / 2 };
    let spawned = 0;
    for (let i = 0; i < incoming.count && game.enemies.length < 180; i++) {
      const angle = incoming.angle + (i - incoming.count / 2) * 0.025;
      spawnEnemy(
        game,
        incoming.kind,
        center.x + Math.cos(angle) * (WORLD_W * 0.5 + 30),
        center.y + Math.sin(angle) * (WORLD_H * 0.5 + 30),
      );
      spawned++;
    }
    incoming.count -= spawned;
    // Capacity throttles arrivals rather than deleting them. In particular,
    // all twenty campaign motherships must eventually enter and be defeated.
    if (incoming.count > 0) incoming.at = game.time + 1;
    if (spawned)
      say(game, ENEMIES[incoming.kind].name + " entered the sector.");
  }
  game.incoming = game.incoming.filter((w) => w.count > 0);
}
function burst(game: Expedition, p: Point, color: string, size = 35) {
  game.bursts.push({
    ...p,
    life: 0.85,
    maxLife: 0.85,
    seed: game.nextId++,
    color,
    size,
  });
  if (game.bursts.length > 45) game.bursts.shift();
}
function hurtEnemy(
  game: Expedition,
  enemy: Enemy,
  damage: number,
  explosive = false,
) {
  const armor = ENEMIES[enemy.kind].armor;
  enemy.hp -= damage * (explosive ? 1 : 1 - armor);
  enemy.hit = 0.18;
  if (enemy.hp <= 0)
    burst(
      game,
      enemy,
      ENEMIES[enemy.kind].color,
      enemy.kind === "mothership" ? 110 : 25,
    );
}
function networkFor(game: Expedition, node: Structure) {
  return game.networks.find((n) => n.id === node.network);
}
function consume(game: Expedition, node: Structure, amount: number) {
  const net = networkFor(game, node);
  if (!net) return game.mode === "sandbox";
  if (amount <= 0) return true;
  if (net.energy + 0.00001 < amount) {
    net.brownout = true;
    return false;
  }
  net.energy = Math.max(0, net.energy - amount);
  return true;
}
function chargeDemand(game: Expedition, node: Structure, perSecond: number) {
  const net = networkFor(game, node);
  if (net) net.demand += perSecond;
}
function preparePower(game: Expedition, dt: number) {
  if (game.connectionDirty) updateConnections(game);
  const nodes = new Map(game.structures.map((n) => [n.id, n]));
  for (const net of game.networks) {
    net.energy = 0;
    net.capacity = 0;
    net.generation = 0;
    net.demand = 0;
    net.brownout = false;
    for (const id of net.nodes) {
      const n = nodes.get(id)!;
      n.capacity = stats(n).capacity;
      if (ready(n)) {
        net.capacity += n.capacity;
        net.energy += clamp(n.energy, 0, n.capacity);
      }
      if (ready(n)) net.generation += stats(n).generation;
    }
    net.energy = Math.min(net.capacity, net.energy + net.generation * dt);
    if (game.mode === "sandbox") net.energy = net.capacity;
  }
}
function finishPower(game: Expedition) {
  game.energy = 0;
  game.capacity = 0;
  game.generation = 0;
  game.demand = 0;
  for (const net of game.networks) {
    // Construction or an upgrade may have changed capacity during this tick.
    // Recompute the denominator before distributing reserves, so adding empty
    // storage never manufactures energy and splitting networks conserves it.
    net.capacity = game.structures
      .filter((n) => n.network === net.id && ready(n))
      .reduce((sum, n) => sum + n.capacity, 0);
    net.energy = Math.min(net.energy, net.capacity);
    const fill = net.capacity > 0 ? clamp(net.energy / net.capacity, 0, 1) : 0;
    for (const n of game.structures.filter((n) => n.network === net.id))
      n.energy = ready(n) ? n.capacity * fill : 0;
    game.energy += net.energy;
    game.capacity += net.capacity;
    game.generation += net.generation;
    game.demand += net.demand;
  }
}
function construct(game: Expedition, node: Structure, dt: number) {
  if (node.progress < 1) {
    const amount = Math.min(1 - node.progress, dt / 3);
    chargeDemand(game, node, node.buildEnergy / 3);
    // Solar panels can bootstrap an independent hub, including recovery after
    // losing the last generator. Connected construction still draws grid energy.
    if (
      (node.kind === "solar" && !node.connected) ||
      consume(game, node, amount * node.buildEnergy)
    )
      node.progress += amount;
    if (node.progress >= 1 - 0.00001) {
      node.progress = 1;
      game.connectionDirty = true;
      burst(game, node, "#a7d4ec", 22);
    }
  } else if (node.upgrading) {
    const upgrade = node.upgrading;
    const amount = Math.min(1 - upgrade.progress, dt / 4);
    chargeDemand(game, node, upgrade.energy / 4);
    if (game.mode === "sandbox" || consume(game, node, amount * upgrade.energy))
      upgrade.progress += amount;
    if (upgrade.progress >= 1 - 0.00001) {
      const fraction = node.hp / node.maxHp;
      node.kind = upgrade.kind;
      node.level = upgrade.level;
      node.maxHp = stats(node).hp;
      node.hp = node.maxHp * fraction;
      node.capacity = stats(node).capacity;
      node.upgrading = null;
      game.connectionDirty = true;
      burst(game, node, STRUCTURES[node.kind].color, 34);
    }
  }
}
function chooseTarget(node: Structure, targets: Enemy[]) {
  return targets.sort((a, b) =>
    node.priority === "strongest"
      ? b.maxHp - a.maxHp || dist(node, a) - dist(node, b)
      : node.priority === "weakest"
        ? a.hp - b.hp
        : dist(node, a) - dist(node, b),
  )[0];
}
function fireWeapons(game: Expedition, node: Structure, dt: number) {
  if (!["laser", "pulser", "thel", "missile"].includes(node.kind)) return;
  const s = stats(node);
  const intercept = ["laser", "pulser"].includes(node.kind)
    ? game.projectiles
        .filter((p) => p.enemy && p.hp > 0 && dist(p, node) < s.range)
        .sort((a, b) => dist(node, a) - dist(node, b))[0]
    : undefined;
  const target =
    intercept ||
    chooseTarget(
      node,
      game.enemies.filter((e) => e.hp > 0 && dist(e, node) <= s.range),
    );
  if (!target) return;
  node.target = target.id;
  node.angle = Math.atan2(target.y - node.y, target.x - node.x);
  if (node.kind === "missile") {
    if (node.cooldown > 0) return;
    const count = Math.min(
      s.salvo,
      Math.floor(game.ore / 5),
      MAX_PROJECTILES - game.projectiles.length,
    );
    if (!count) return;
    for (let i = 0; i < count; i++) {
      game.projectiles.push({
        id: game.nextId++,
        source: node.id,
        x:
          node.x +
          Math.cos(node.angle + Math.PI / 2) * (i - (count - 1) / 2) * 5,
        y:
          node.y +
          Math.sin(node.angle + Math.PI / 2) * (i - (count - 1) / 2) * 5,
        target: target.id,
        angle: node.angle,
        enemy: false,
        speed: 130,
        damage: s.damage,
        hp: 30,
        life: 12,
        radius: 42,
      });
    }
    if (game.mode !== "sandbox") game.ore -= count * 5;
    node.cooldown = s.interval;
    node.working = true;
    return;
  }
  const cost = node.kind === "thel" ? s.demand * dt : s.demand * 0.25;
  chargeDemand(game, node, node.kind === "thel" ? s.demand : cost / s.interval);
  if (
    (node.kind === "thel" || node.cooldown <= 0) &&
    consume(game, node, cost)
  ) {
    if (intercept) intercept.hp -= s.damage;
    else
      hurtEnemy(
        game,
        target as Enemy,
        node.kind === "thel" ? s.damage * dt : s.damage,
      );
    node.working = true;
    if (node.cooldown <= 0) {
      game.beams.push({
        x: node.x,
        y: node.y,
        tx: target.x,
        ty: target.y,
        kind: node.kind as Beam["kind"],
        source: node.id,
        life: node.kind === "thel" ? 0.13 : 0.14,
      });
      node.cooldown = s.interval;
    }
  }
}
function repairDrones(game: Expedition, dt: number) {
  for (const home of game.structures.filter(
    (n) => n.kind === "repair" && operating(n),
  )) {
    for (
      let i = game.drones.filter((d) => d.home === home.id).length;
      i < 4;
      i++
    )
      game.drones.push({
        id: game.nextId++,
        home: home.id,
        x: home.x,
        y: home.y,
        target: null,
        phase: (i * Math.PI) / 2,
        working: false,
      });
    const s = stats(home);
    const damaged = game.structures
      .filter(
        (n) =>
          n.id !== home.id &&
          n.hp > 0 &&
          n.hp < n.maxHp &&
          ready(n) &&
          dist(home, n) <= s.range,
      )
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const assigned = new Map<number, number>();
    for (const drone of game.drones.filter((d) => d.home === home.id)) {
      drone.working = false;
      let target = damaged.find((n) => n.id === drone.target);
      if (!target)
        target =
          damaged.find((n) => (assigned.get(n.id) || 0) < 2) || damaged[0];
      drone.target = target?.id ?? null;
      if (target) assigned.set(target.id, (assigned.get(target.id) || 0) + 1);
      const point = target || {
        x: home.x + Math.cos(game.time * 0.9 + drone.phase) * 28,
        y: home.y + Math.sin(game.time * 0.9 + drone.phase) * 28,
      };
      const distance = dist(drone, point);
      if (target) chargeDemand(game, home, s.demand / 4);
      if (!target || consume(game, home, (s.demand / 4) * dt)) {
        const step = Math.min(distance, dt * 95);
        if (distance > 0.01) {
          drone.x += ((point.x - drone.x) / distance) * step;
          drone.y += ((point.y - drone.y) / distance) * step;
        }
        if (target && distance < 22) {
          target.hp = Math.min(target.maxHp, target.hp + s.damage * dt);
          drone.working = true;
          home.working = true;
        }
      }
    }
  }
  game.drones = game.drones.filter((d) =>
    game.structures.some((n) => n.id === d.home && n.hp > 0),
  );
}
function advanceEnemies(game: Expedition, dt: number) {
  for (const enemy of [...game.enemies]) {
    if (enemy.hp <= 0) continue;
    const spec = ENEMIES[enemy.kind];
    enemy.hit = Math.max(0, enemy.hit - dt);
    enemy.cooldown -= dt;
    enemy.spawnTimer -= dt;
    const target = game.structures
      .filter((n) => n.hp > 0)
      .sort((a, b) => dist(enemy, a) - dist(enemy, b))[0];
    if (!target) break;
    const distance = dist(enemy, target);
    enemy.angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    if (distance > spec.range) {
      const step = Math.min(spec.speed * dt, distance - spec.range);
      enemy.x += Math.cos(enemy.angle) * step;
      enemy.y += Math.sin(enemy.angle) * step;
    }
    if (
      enemy.kind === "mothership" &&
      enemy.spawnTimer <= 0 &&
      game.enemies.length < 170
    ) {
      enemy.spawnTimer = 14;
      for (let i = 0; i < 4; i++)
        spawnEnemy(
          game,
          "attackFighter",
          enemy.x + Math.cos((i * Math.PI) / 2) * 38,
          enemy.y + Math.sin((i * Math.PI) / 2) * 38,
        );
    }
    if (distance > spec.range + 3 || enemy.cooldown > 0) continue;
    if (enemy.kind === "suicide") {
      for (const n of game.structures)
        if (dist(enemy, n) < 82)
          n.hp -= spec.damage * (1 - dist(enemy, n) / 115);
      enemy.hp = 0;
      burst(game, enemy, "#ffac6f", 85);
    } else if (enemy.kind === "missileShip") {
      if (game.projectiles.length < MAX_PROJECTILES)
        game.projectiles.push({
          id: game.nextId++,
          source: enemy.id,
          x: enemy.x,
          y: enemy.y,
          target: target.id,
          angle: enemy.angle,
          enemy: true,
          speed: 86,
          hp: 28,
          damage: spec.damage,
          life: 15,
          radius: 30,
        });
    } else {
      target.hp -= spec.damage;
      game.beams.push({
        x: enemy.x,
        y: enemy.y,
        tx: target.x,
        ty: target.y,
        kind: "enemy",
        source: enemy.id,
        life: enemy.kind === "mothership" ? 0.42 : 0.16,
      });
    }
    enemy.cooldown = spec.interval;
  }
}
function advanceProjectiles(game: Expedition, dt: number) {
  for (const p of game.projectiles) {
    p.life -= dt;
    if (p.hp <= 0 || p.life <= 0) continue;
    let target: (Point & { id: number; hp: number }) | undefined = p.enemy
      ? game.structures.find((n) => n.id === p.target && n.hp > 0)
      : game.enemies.find((n) => n.id === p.target && n.hp > 0);
    if (!target)
      target = (p.enemy ? game.structures : game.enemies)
        .filter((n) => n.hp > 0)
        .sort((a, b) => dist(p, a) - dist(p, b))[0];
    if (!target) {
      p.hp = 0;
      continue;
    }
    p.target = target.id;
    const desired = Math.atan2(target.y - p.y, target.x - p.x);
    const difference = Math.atan2(
      Math.sin(desired - p.angle),
      Math.cos(desired - p.angle),
    );
    p.angle += clamp(difference, -dt * 4, dt * 4);
    const step = p.speed * dt;
    if (dist(p, target) < step + 10) {
      if (p.enemy) {
        for (const n of game.structures) {
          const d = dist(target, n);
          if (d < p.radius) n.hp -= p.damage * (1 - d / (p.radius * 1.5));
        }
      } else
        for (const n of game.enemies) {
          const d = dist(target, n);
          if (d < p.radius && n.hp > 0)
            hurtEnemy(game, n, p.damage * (1 - d / (p.radius * 1.5)), true);
        }
      burst(game, target, p.enemy ? "#eaaa73" : "#f4d78d", p.radius);
      p.hp = 0;
    } else {
      p.x += Math.cos(p.angle) * step;
      p.y += Math.sin(p.angle) * step;
    }
  }
  game.projectiles = game.projectiles.filter((p) => p.hp > 0 && p.life > 0);
}
export const objectiveTarget = (game: Expedition) =>
  game.mode === "campaign"
    ? MISSIONS[game.mission].objective === "mine"
      ? game.totalOre / 2
      : MISSIONS[game.mission].target
    : MINING_GOAL;
export function objectiveProgress(game: Expedition) {
  if (game.mode === "campaign") {
    const objective = MISSIONS[game.mission].objective;
    return objective === "mine"
      ? game.mined / objectiveTarget(game)
      : objective === "survive"
        ? game.time / objectiveTarget(game)
        : game.capitalKills / objectiveTarget(game);
  }
  if (["mining", "speed"].includes(game.mode)) return game.mined / MINING_GOAL;
  if (game.mode === "training") return game.trainingStep / 6;
  if (game.mode === "waves") return game.chosenWaves.length / 6;
  return 0;
}
export function objectiveText(game: Expedition) {
  const time = (seconds: number) =>
    Math.floor(seconds / 60) +
    ":" +
    String(Math.floor(seconds % 60)).padStart(2, "0");
  if (game.mode === "training")
    return [
      "Select the miner to inspect its range and reserve.",
      "Build a second mineral miner beside a rock.",
      "Build a solar station to expand power generation.",
      "Upgrade a miner to level 2 with U.",
      "Build a Basic laser for your first defense.",
      "Harvest 120 minerals to finish training.",
      "Training complete.",
    ][game.trainingStep];
  if (game.mode === "campaign") {
    const spec = MISSIONS[game.mission];
    if (spec.objective === "survive")
      return "Survive " + time(game.time) + " / " + time(spec.target);
    if (spec.objective === "destroy")
      return "Motherships destroyed " + game.capitalKills + " / 20";
    return (
      "Harvest " +
      Math.floor(game.mined).toLocaleString() +
      " / " +
      Math.floor(game.totalOre / 2).toLocaleString() +
      " minerals"
    );
  }
  if (["mining", "speed"].includes(game.mode))
    return (
      "Harvest " +
      Math.floor(game.mined).toLocaleString() +
      " / 30,000 minerals"
    );
  if (game.mode === "waves")
    return (
      "Fleets called " +
      game.chosenWaves.length +
      " / 6 · " +
      game.enemies.length +
      " hostiles"
    );
  if (game.mode === "sandbox")
    return "Free construction · call fleets to experiment";
  return "Survived " + time(game.time) + " · wave " + game.wave;
}
function waveSchedule(game: Expedition) {
  if (["training", "speed", "waves", "sandbox"].includes(game.mode)) return;
  if (game.mode === "campaign" && game.mission === 5) {
    if (game.time >= game.nextWave && game.wave < 10) {
      game.wave++;
      game.incoming.push({
        id: game.nextId++,
        at: game.time + 15,
        kind: "mothership",
        count: 2,
        angle: game.wave * 2.4,
        wave: game.wave,
      });
      game.nextWave = game.time + 75;
    }
    return;
  }
  if (game.time < game.nextWave) return;
  let number = game.wave + 1;
  if (game.mode === "campaign" && game.mission < 2) {
    game.wave++;
    game.incoming.push({
      id: game.nextId++,
      at: game.time + 15,
      kind: "fighter",
      count: Math.min(8, 2 + game.wave),
      angle: game.wave * 2.4,
      wave: game.wave,
    });
  } else {
    queueWave(game, number);
  }
  // Mining pressure rises as the operation expands, with a time limit between
  // attacks. Exact original trigger percentages were not recoverable.
  const endurance =
    game.mode === "campaign" && MISSIONS[game.mission].objective === "survive";
  const pressure =
    !endurance && ["mining", "campaign"].includes(game.mode)
      ? Math.min(0.35, objectiveProgress(game) * 0.4)
      : 0;
  // Timed operations need an economic opening and a readable escalation over
  // their full ten/twenty minutes. Their timer is not a mining-pressure trigger.
  const miningMission =
    game.mode === "campaign" &&
    MISSIONS[game.mission].objective === "mine" &&
    game.mission >= 3;
  const interval = endurance
    ? game.mission === 8
      ? 110
      : 90
    : miningMission
      ? game.difficulty === "hard"
        ? 85
        : 95
      : DIFFICULTIES[game.difficulty].interval;
  game.nextWave = game.time + interval * (1 - pressure);
}
function finishAndClean(game: Expedition) {
  for (const enemy of game.enemies.filter((e) => e.hp <= 0)) {
    game.kills++;
    if (enemy.kind === "mothership") game.capitalKills++;
  }
  game.enemies = game.enemies.filter((e) => e.hp > 0);
  for (const n of game.structures.filter((n) => n.hp <= 0)) {
    burst(game, n, "#e2a079", 40);
    say(
      game,
      STRUCTURES[n.kind].name + " destroyed. Check the isolated networks.",
    );
    game.connectionDirty = true;
  }
  game.structures = game.structures.filter((n) => n.hp > 0);
  if (!game.structures.length && game.mode !== "sandbox") {
    game.ended = true;
    game.won = false;
    say(game, "All stations were destroyed. The operation is lost.");
    return;
  }
  if (game.mode === "training") {
    if (
      game.trainingStep === 1 &&
      game.structures.filter((n) => n.kind === "miner" && ready(n)).length >= 2
    )
      game.trainingStep = 2;
    if (
      game.trainingStep === 2 &&
      game.structures.filter((n) => n.kind === "solar" && ready(n)).length >= 2
    )
      game.trainingStep = 3;
    if (
      game.trainingStep === 3 &&
      game.structures.some((n) => n.kind === "miner" && n.level === 2)
    )
      game.trainingStep = 4;
    if (
      game.trainingStep === 4 &&
      game.structures.some(
        (n) => ["laser", "pulser", "thel"].includes(n.kind) && ready(n),
      )
    )
      game.trainingStep = 5;
    if (game.trainingStep === 5 && game.mined >= 120) game.trainingStep = 6;
  }
  const won =
    game.mode === "training"
      ? game.trainingStep === 6
      : ["mining", "speed", "campaign"].includes(game.mode)
        ? objectiveProgress(game) >= 1
        : game.mode === "waves"
          ? game.chosenWaves.length === 6 &&
            !game.incoming.length &&
            !game.enemies.length
          : false;
  if (won) {
    game.ended = true;
    game.won = true;
    say(
      game,
      game.mode === "campaign"
        ? "Mission " +
            (game.mission + 1) +
            " complete. " +
            MISSIONS[game.mission].name +
            " secured."
        : "Objective complete. Your operation made it home.",
    );
  }
}
export function advanceExpedition(game: Expedition, dt: number) {
  if (
    !game.started ||
    game.ended ||
    game.paused ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return;
  dt = Math.min(dt, 0.1);
  game.time += dt;
  game.miningRate = 0;
  preparePower(game, dt);
  waveSchedule(game);
  spawnIncoming(game);
  for (const node of game.structures) {
    node.cooldown = Math.max(0, node.cooldown - dt);
    node.working = false;
    node.target = null;
    if (!ready(node) || node.upgrading) {
      construct(game, node, dt);
      continue;
    }
    if (node.network === -1 && game.mode !== "sandbox") continue;
    if (node.kind === "miner") {
      const rock = game.asteroids
        .filter((a) => a.ore > 0.00001 && dist(node, a) <= MINE_RADIUS)
        .sort((a, b) => dist(node, a) - dist(node, b))[0];
      node.depleted = !rock;
      if (rock) {
        const s = stats(node);
        chargeDemand(game, node, s.demand);
        if (consume(game, node, s.demand * dt)) {
          const amount = Math.min(rock.ore, s.mining * dt);
          rock.ore = Math.max(0, rock.ore - amount);
          game.ore += amount;
          game.mined += amount;
          game.miningRate += s.mining * 60;
          node.target = rock.id;
          node.working = true;
          node.angle = Math.atan2(rock.y - node.y, rock.x - node.x);
        }
      }
    }
    fireWeapons(game, node, dt);
  }
  repairDrones(game, dt);
  advanceEnemies(game, dt);
  advanceProjectiles(game, dt);
  game.beams = game.beams.filter((b) => (b.life -= dt) > 0).slice(-100);
  game.bursts = game.bursts.filter((b) => (b.life -= dt) > 0);
  finishPower(game);
  finishAndClean(game);
  const previous = game.history.at(-1);
  if (
    !previous ||
    Math.floor(game.time / 5) > Math.floor(previous.time / 5) ||
    game.ended
  ) {
    game.history.push({
      time: game.time,
      miningRate: game.miningRate,
      energy: game.energy,
      capacity: game.capacity,
    });
    if (game.history.length > 720) game.history.shift();
  }
}
export const expeditionScore = (game: Expedition) => {
  if (game.mode === "sandbox" || game.mode === "training") return 0;
  // These modes race the clock: extra harvesting must never beat a faster
  // completion, and every completed operation ranks above a recalled attempt.
  if (game.mode === "speed" || game.mode === "waves")
    return game.won
      ? 1000 + Math.floor(99000 / (1 + game.time / 60))
      : Math.min(999, Math.floor((game.mined + game.kills * 20) / 100));
  return Math.floor(
    game.mined +
      game.kills * 20 +
      game.time * (game.mode === "survival" ? 10 : 0) +
      (game.won ? 5000 : 0),
  );
};

// Keep precision reasonable on the wire. Bounded effects travel with gameplay
// state so guests and late joiners see the same explosions and construction.
export function snapshot(game: Expedition): Expedition {
  // The host retains full precision. Three decimals on the wire are well below
  // a rendered pixel and keep large battles comfortably within the room limit.
  return JSON.parse(
    JSON.stringify(
      { ...game, bursts: game.bursts.slice(-45), beams: game.beams.slice(-35) },
      (_key, value: unknown) =>
        typeof value === "number" && Number.isFinite(value)
          ? Math.round(value * 1000) / 1000
          : value,
    ),
  ) as Expedition;
}
