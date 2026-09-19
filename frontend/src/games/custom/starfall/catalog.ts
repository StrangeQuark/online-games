// Original-game structural values are transcribed as facts from the sources in
// docs/SPACE_GAME_REFERENCE.md. Unrecoverable timings are isolated here.
export type StructureKind =
  | "relay"
  | "miner"
  | "solar"
  | "battery"
  | "repair"
  | "laser"
  | "pulser"
  | "thel"
  | "missile";
export type Mode =
  | "training"
  | "campaign"
  | "mining"
  | "survival"
  | "waves"
  | "speed"
  | "sandbox";
export type Difficulty = "gentle" | "normal" | "hard" | "madness";
export type EnemyKind =
  | "fighter"
  | "missileShip"
  | "suicide"
  | "ringer"
  | "swarmer"
  | "mothership"
  | "attackFighter";
export type Point = { x: number; y: number };
export type Level = {
  hp: number;
  capacity: number;
  upgradeCost: number;
  generation: number;
  mining: number;
  demand: number;
  range: number;
  damage: number;
  interval: number;
  salvo: number;
};
const level = (value: Partial<Level> & Pick<Level, "hp">): Level => ({
  capacity: 1,
  upgradeCost: 0,
  generation: 0,
  mining: 0,
  demand: 0,
  range: 0,
  damage: 0,
  interval: 1,
  salvo: 0,
  ...value,
});
export const LINK_RADIUS = 110;
export const MINE_RADIUS = 85;
export const WORLD_W = 1800;
export const WORLD_H = 1200;
export const MINING_GOAL = 30000;
export const BUILDABLE: StructureKind[] = [
  "relay",
  "miner",
  "solar",
  "battery",
  "repair",
  "laser",
  "missile",
];
export const STRUCTURES: Record<
  StructureKind,
  {
    name: string;
    short: string;
    cost: number;
    color: string;
    radius: number;
    description: string;
    levels: Level[];
  }
> = {
  relay: {
    name: "Energy relay",
    short: "Relay",
    cost: 20,
    color: "#96b8f4",
    radius: 9,
    description:
      "Extends a power network. At most six energy links; construction needs a live connection.",
    levels: [level({ hp: 100, capacity: 1, range: LINK_RADIUS })],
  },
  miner: {
    name: "Mineral miner",
    short: "Miner",
    cost: 45,
    color: "#b5d786",
    radius: 15,
    description:
      "Mines 80 minerals per minute, or 200 when upgraded. Asteroids are finite; move on when they run dry.",
    levels: [
      level({
        hp: 300,
        capacity: 1,
        mining: 80 / 60,
        demand: 1,
        range: MINE_RADIUS,
      }),
      level({
        hp: 500,
        capacity: 1,
        mining: 200 / 60,
        demand: 1,
        range: MINE_RADIUS,
        upgradeCost: 100,
      }),
    ],
  },
  solar: {
    name: "Solar station",
    short: "Solar",
    cost: 200,
    color: "#edd88e",
    radius: 23,
    description:
      "The source of your power. Each independent network needs generation. Upgrades improve generation and its own reserve.",
    levels: [
      level({ hp: 600, capacity: 4, generation: 2.7, range: LINK_RADIUS }),
      level({
        hp: 800,
        capacity: 9,
        generation: 6.3,
        range: LINK_RADIUS,
        upgradeCost: 200,
      }),
      level({
        hp: 1000,
        capacity: 14,
        generation: 9,
        range: LINK_RADIUS,
        upgradeCost: 200,
      }),
    ],
  },
  battery: {
    name: "Energy store",
    short: "Store",
    cost: 300,
    color: "#9b9feb",
    radius: 18,
    description:
      "Stores 200 energy, or 600 upgraded, in its own connected network. Keeps lasers firing through demand spikes.",
    levels: [
      level({ hp: 500, capacity: 200, range: LINK_RADIUS }),
      level({ hp: 750, capacity: 600, range: LINK_RADIUS, upgradeCost: 500 }),
    ],
  },
  repair: {
    name: "Repair station",
    short: "Repair",
    cost: 300,
    color: "#81d9b8",
    radius: 18,
    description:
      "Launches four repair drones. Their travel and healing consume power; upgraded drones cover a wider area.",
    levels: [
      level({ hp: 400, capacity: 4, range: 200, demand: 1.8, damage: 4 }),
      level({
        hp: 600,
        capacity: 4,
        range: 300,
        demand: 2.4,
        damage: 6,
        upgradeCost: 150,
      }),
    ],
  },
  laser: {
    name: "Basic laser",
    short: "Laser",
    cost: 100,
    color: "#ed9a8c",
    radius: 15,
    description:
      "Short-range laser; intercepts missiles. Choose a rapid Pulser or long-range THEL as its upgrade branch.",
    levels: [
      level({
        hp: 200,
        capacity: 1,
        range: 90,
        damage: 30,
        demand: 1,
        interval: 0.45,
      }),
    ],
  },
  pulser: {
    name: "Pulser laser",
    short: "Pulser",
    cost: 100,
    color: "#8fded4",
    radius: 19,
    description:
      "Rapid point defense. Shoots hostile missiles and fighters; its short range rewards dense connected defenses.",
    levels: [
      level({
        hp: 300,
        capacity: 2,
        range: 110,
        damage: 12,
        demand: 1,
        interval: 0.225,
      }),
      level({
        hp: 500,
        capacity: 7,
        range: 115,
        damage: 14,
        demand: 1,
        interval: 0.15,
        upgradeCost: 150,
      }),
      level({
        hp: 900,
        capacity: 9,
        range: 130,
        damage: 16,
        demand: 1,
        interval: 0.105,
        upgradeCost: 300,
      }),
    ],
  },
  thel: {
    name: "Tactical heavy-energy laser",
    short: "THEL",
    cost: 500,
    color: "#dfb5f1",
    radius: 22,
    description:
      "Continuous long-range beam. Excellent against large ships; cannot intercept missiles. A hungry power consumer.",
    levels: [
      level({
        hp: 400,
        capacity: 6,
        range: 200,
        damage: 30,
        demand: 2.5,
        interval: 0.1,
      }),
      level({
        hp: 600,
        capacity: 10,
        range: 290,
        damage: 150,
        demand: 6,
        interval: 0.1,
        upgradeCost: 800,
      }),
      level({
        hp: 960,
        capacity: 17,
        range: 390,
        damage: 300,
        demand: 10,
        interval: 0.1,
        upgradeCost: 1000,
      }),
    ],
  },
  missile: {
    name: "Missile launcher",
    short: "Missile",
    cost: 400,
    color: "#eeb27e",
    radius: 22,
    description:
      "Homing splash missiles. Each missile costs five minerals, not energy. Prioritizes capital ships; cannot intercept missiles.",
    levels: [
      level({
        hp: 500,
        capacity: 0,
        range: 400,
        damage: 450,
        salvo: 1,
        interval: 10,
      }),
      level({
        hp: 520,
        capacity: 0,
        range: 480,
        damage: 500,
        salvo: 2,
        interval: 10,
        upgradeCost: 500,
      }),
      level({
        hp: 540,
        capacity: 0,
        range: 576,
        damage: 550,
        salvo: 5,
        interval: 10,
        upgradeCost: 1000,
      }),
    ],
  },
};
export const ENEMIES: Record<
  EnemyKind,
  {
    name: string;
    hp: number;
    speed: number;
    range: number;
    damage: number;
    interval: number;
    radius: number;
    color: string;
    armor: number;
  }
> = {
  fighter: {
    name: "Red fighters",
    hp: 170,
    speed: 40,
    range: 75,
    damage: 16,
    interval: 1.2,
    radius: 10,
    color: "#e7807c",
    armor: 0,
  },
  missileShip: {
    name: "Missile ships",
    hp: 700,
    speed: 22,
    range: 290,
    damage: 130,
    interval: 6,
    radius: 20,
    color: "#a5c878",
    armor: 0,
  },
  suicide: {
    name: "Self-destructors",
    hp: 180,
    speed: 63,
    range: 12,
    damage: 470,
    interval: 1,
    radius: 12,
    color: "#efac70",
    armor: 0,
  },
  ringer: {
    name: "Yellow ringers",
    hp: 1800,
    speed: 18,
    range: 110,
    damage: 38,
    interval: 0.8,
    radius: 24,
    color: "#e8d87a",
    armor: 0.72,
  },
  swarmer: {
    name: "Swarmers",
    hp: 60,
    speed: 55,
    range: 42,
    damage: 5,
    interval: 0.6,
    radius: 6,
    color: "#b9c6cf",
    armor: 0,
  },
  mothership: {
    name: "Motherships",
    hp: 11000,
    speed: 12,
    range: 355,
    damage: 38,
    interval: 0.45,
    radius: 43,
    color: "#c69cdd",
    armor: 0.12,
  },
  attackFighter: {
    name: "Carrier fighters",
    hp: 95,
    speed: 56,
    range: 60,
    damage: 10,
    interval: 1,
    radius: 8,
    color: "#b395cf",
    armor: 0,
  },
};
export const DIFFICULTIES: Record<
  Difficulty,
  { name: string; multiplier: number; grace: number; interval: number }
> = {
  gentle: { name: "Gentle", multiplier: 0.7, grace: 150, interval: 70 },
  normal: { name: "Bring it on", multiplier: 1, grace: 90, interval: 55 },
  hard: { name: "No hope", multiplier: 1.4, grace: 40, interval: 40 },
  madness: { name: "Madness", multiplier: 1.9, grace: 20, interval: 30 },
};
export type Mission = {
  name: string;
  objective: "mine" | "survive" | "destroy";
  target: number;
  text: string;
  seed: number;
  ore: number;
  starting: number;
  difficulty: Difficulty;
};
export const MISSIONS: Mission[] = [
  {
    name: "First light",
    objective: "mine",
    target: 0.5,
    text: "Extract half the minerals in this quiet belt. Build miners beside asteroids and keep them supplied with solar energy.",
    seed: 101,
    ore: 3400,
    starting: 500,
    difficulty: "gentle",
  },
  {
    name: "Across the belt",
    objective: "mine",
    target: 0.5,
    text: "Extract half the minerals. Expand with relays and recycle exhausted mining equipment.",
    seed: 202,
    ore: 6400,
    starting: 450,
    difficulty: "gentle",
  },
  {
    name: "Hold the line",
    objective: "survive",
    target: 600,
    text: "Survive for ten minutes. A balanced network needs stores and point defense.",
    seed: 303,
    ore: 28000,
    starting: 750,
    difficulty: "gentle",
  },
  {
    name: "Missile weather",
    objective: "mine",
    target: 0.5,
    text: "Extract half the minerals. Pulsers intercept incoming missiles before they reach your stations.",
    seed: 404,
    ore: 10000,
    starting: 650,
    difficulty: "normal",
  },
  {
    name: "The golden ring",
    objective: "mine",
    target: 0.5,
    text: "Extract half the minerals. Shielded ringers resist lasers; missile splash breaks their formation.",
    seed: 505,
    ore: 16000,
    starting: 1000,
    difficulty: "normal",
  },
  {
    name: "Twenty shadows",
    objective: "destroy",
    target: 20,
    text: "Destroy twenty motherships. Long-range missile launchers and ample minerals are essential.",
    seed: 606,
    ore: 50000,
    starting: 6500,
    difficulty: "normal",
  },
  {
    name: "Web of light",
    objective: "mine",
    target: 0.5,
    text: "Extract half the minerals from scattered clusters. Independent solar hubs limit the damage from a broken link.",
    seed: 707,
    ore: 22000,
    starting: 900,
    difficulty: "normal",
  },
  {
    name: "The last harvest",
    objective: "mine",
    target: 0.5,
    text: "Extract half the minerals under growing pressure. Reserve minerals for your missile batteries.",
    seed: 808,
    ore: 28000,
    starting: 1250,
    difficulty: "hard",
  },
  {
    name: "Against the dark",
    objective: "survive",
    target: 1200,
    text: "Survive for twenty minutes. Expand, harvest, salvage, and consolidate your defenses as the field runs dry.",
    seed: 909,
    ore: 65000,
    starting: 1600,
    difficulty: "normal",
  },
];
export const MODES: { id: Mode; name: string; description: string }[] = [
  {
    id: "training",
    name: "Training",
    description: "Learn the network, mining, upgrades, and defenses.",
  },
  {
    id: "campaign",
    name: "Missions",
    description: "Nine operations: harvest, endure, and destroy.",
  },
  {
    id: "mining",
    name: "Mining",
    description: "Bring home 30,000 minerals under attack.",
  },
  {
    id: "survival",
    name: "Survival",
    description: "Endless assaults. Survive as long as you can.",
  },
  {
    id: "waves",
    name: "Wave challenge",
    description: "Choose and defeat all six fleets. Race the clock.",
  },
  {
    id: "speed",
    name: "Speed miner",
    description: "Harvest 30,000 minerals with no enemies.",
  },
  {
    id: "sandbox",
    name: "Sandbox",
    description:
      "An open workshop with free construction and selectable fleets.",
  },
];
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
