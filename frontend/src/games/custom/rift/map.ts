/** Coordinates are metres, Y is up. These same solids drive rendering and physics. */
export type Vec3 = { x: number; y: number; z: number };
export type Solid = {
  x: number;
  z: number;
  w: number;
  d: number;
  bottom: number;
  top: number;
  kind: "wall" | "deck" | "cover" | "reactor" | "rail";
};
/** The top bar and posts are solid to shots; their open gaps stay open. */
export function railParts(rail: Solid): Solid[] {
  const alongX = rail.w >= rail.d;
  const length = alongX ? rail.w : rail.d;
  const parts: Solid[] = [
    {
      ...rail,
      bottom: rail.top - 0.12,
      w: alongX ? rail.w : 0.13,
      d: alongX ? 0.13 : rail.d,
    },
  ];
  const count = Math.max(1, Math.ceil(length / 1.5));
  for (let i = 0; i <= count; i++) {
    const offset = -length / 2 + (length * i) / count;
    parts.push({
      ...rail,
      x: rail.x + (alongX ? offset : 0),
      z: rail.z + (alongX ? 0 : offset),
      w: 0.08,
      d: 0.08,
    });
  }
  return parts;
}
export type Ramp = {
  axis?: "x" | "z";
  direction?: 1 | -1;
  bottom?: number;
  x: number;
  z: number;
  w: number;
  d: number;
  top: number;
  steps?: number;
};
export const ARENA = { width: 58, depth: 50, upper: 4.5 };
export const RAMPS: Ramp[] = [
  { x: -17, z: 7, w: 6, d: 12, top: 4.5 },
  { x: 17, z: 7, w: 6, d: 12, top: 4.5 },
  { x: 0, z: 12, w: 5, d: 8, top: 4.5, steps: 15 },
];
export const SOLIDS: Solid[] = [
  { x: -29, z: 0, w: 1, d: 51, bottom: 0, top: 10, kind: "wall" },
  { x: 29, z: 0, w: 1, d: 51, bottom: 0, top: 10, kind: "wall" },
  { x: 0, z: -25, w: 58, d: 1, bottom: 0, top: 10, kind: "wall" },
  { x: 0, z: 25, w: 58, d: 1, bottom: 0, top: 10, kind: "wall" },
  { x: 0, z: -16.5, w: 56, d: 13, bottom: 4.05, top: 4.5, kind: "deck" },
  { x: -17, z: -4.5, w: 6, d: 11, bottom: 4.05, top: 4.5, kind: "deck" },
  { x: 17, z: -4.5, w: 6, d: 11, bottom: 4.05, top: 4.5, kind: "deck" },
  { x: 0, z: -1, w: 5, d: 18, bottom: 4.05, top: 4.5, kind: "deck" },
  { x: -8, z: 3, w: 3, d: 3, bottom: 0, top: 2.25, kind: "cover" },
  { x: 8, z: 3, w: 3, d: 3, bottom: 0, top: 2.25, kind: "cover" },
  { x: -8.5, z: -6, w: 3, d: 2, bottom: 0, top: 2.75, kind: "cover" },
  { x: 8.5, z: -6, w: 3, d: 2, bottom: 0, top: 2.75, kind: "cover" },
  { x: 0, z: -3, w: 4.4, d: 4.4, bottom: 0, top: 3.9, kind: "reactor" },
  { x: -9, z: -15.5, w: 2.5, d: 2.5, bottom: 4.5, top: 6.4, kind: "cover" },
  { x: 9, z: -15.5, w: 2.5, d: 2.5, bottom: 4.5, top: 6.4, kind: "cover" },
  // Short rail sections leave generous jump-off openings and clear firing lanes.
  { x: -8.5, z: -10, w: 6, d: 0.18, bottom: 4.5, top: 5.25, kind: "rail" },
  { x: 8.5, z: -10, w: 6, d: 0.18, bottom: 4.5, top: 5.25, kind: "rail" },
];

export function contains(
  x: number,
  z: number,
  rect: { x: number; z: number; w: number; d: number },
  padding = 0,
) {
  return (
    Math.abs(x - rect.x) < rect.w / 2 + padding &&
    Math.abs(z - rect.z) < rect.d / 2 + padding
  );
}
/** Two arguments retain the legacy (ramp, z) form. New callers pass (ramp, x, z). */
export function rampHeight(ramp: Ramp, xOrZ: number, z?: number) {
  const alongX = ramp.axis === "x";
  const position = z === undefined ? xOrZ : alongX ? xOrZ : z;
  const center = alongX ? ramp.x : ramp.z;
  const length = alongX ? ramp.w : ramp.d;
  const t = Math.max(
    0,
    Math.min(1, 0.5 + ((position - center) / length) * (ramp.direction ?? -1)),
  );
  const fraction = ramp.steps
    ? Math.ceil(t * ramp.steps - 1e-9) / ramp.steps
    : t;
  return (ramp.bottom ?? 0) + fraction * (ramp.top - (ramp.bottom ?? 0));
}
export function floorAt(x: number, z: number, ceiling: number, map = getMap()) {
  let floor = 0;
  for (const solid of map.solids)
    if (solid.top <= ceiling + 0.001 && contains(x, z, solid, 1e-7))
      floor = Math.max(floor, solid.top);
  for (const ramp of map.ramps) {
    const top = rampHeight(ramp, x, z);
    if (top <= ceiling + 0.001 && contains(x, z, ramp, 1e-7))
      floor = Math.max(floor, top);
  }
  return floor;
}
export const SPAWNS = [
  { x: -11, y: 0, z: 12, yaw: 0 },
  { x: 11, y: 0, z: 12, yaw: 0 },
  { x: -17, y: 4.5, z: -6, yaw: Math.PI / 2 },
  { x: 17, y: 4.5, z: -6, yaw: -Math.PI / 2 },
  { x: 0, y: 4.5, z: -16, yaw: Math.PI },
  { x: -11, y: 0, z: -13, yaw: Math.PI },
  { x: 11, y: 0, z: -13, yaw: Math.PI },
];
export type PickupKind =
  | "shotgun"
  | "rocket"
  | "plasma"
  | "rail"
  | "grenade"
  | "armor"
  | "health"
  | "ammo"
  | "speed"
  | "invisibility"
  | "jetpack";
export const PICKUP_SPAWNS: (Vec3 & { kind: PickupKind })[] = [
  { x: -11, y: 0, z: 8, kind: "shotgun" },
  { x: 11, y: 0, z: 8, kind: "shotgun" },
  { x: 17, y: 4.5, z: -6, kind: "rocket" },
  { x: -17, y: 4.5, z: -6, kind: "rocket" },
  { x: 0, y: 4.5, z: 0, kind: "armor" },
  { x: 0, y: 0, z: -13, kind: "armor" },
  { x: -12, y: 4.5, z: -15, kind: "health" },
  { x: 12, y: 4.5, z: -15, kind: "health" },
  { x: -12, y: 0, z: 15, kind: "health" },
  { x: 12, y: 0, z: 15, kind: "health" },
  { x: -11, y: 0, z: -9, kind: "ammo" },
  { x: 11, y: 0, z: -9, kind: "ammo" },
  { x: 0, y: 4.5, z: -13, kind: "ammo" },
];

/** A small explicit route graph keeps bots on navigable paths across all floors. */
export const NAV: Vec3[] = [
  [-11, 0, 12],
  [-17, 0, 15],
  [-17, 1.875, 8],
  [-17, 4.125, 2],
  [-17, 4.5, -6],
  [-17, 4.5, -13],
  [-6, 4.5, -13],
  [0, 4.5, -13],
  [6, 4.5, -13],
  [17, 4.5, -13],
  [17, 4.5, -6],
  [17, 4.125, 2],
  [17, 1.875, 8],
  [17, 0, 15],
  [11, 0, 12],
  [0, 0, 17],
  [0, 2.4, 12],
  [0, 4.5, 7],
  [0, 4.5, 0],
  [0, 4.5, -6],
  [-11, 0, 6],
  [-12, 0, -1],
  [-12, 0, -9],
  [-11, 0, -13],
  [0, 0, -13],
  [11, 0, -13],
  [12, 0, -9],
  [12, 0, -1],
  [11, 0, 6],
  [-4.5, 0, 7],
  [-4.5, 0, -1],
  [-4.5, 0, -8],
  [4.5, 0, -8],
  [4.5, 0, -1],
  [4.5, 0, 7],
].map(([x, y, z]) => ({ x, y, z }));
export const NAV_EDGES: number[][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [12, 13],
  [13, 14],
  [0, 15],
  [14, 15],
  [15, 16],
  [16, 17],
  [17, 18],
  [18, 19],
  [19, 7],
  [0, 20],
  [20, 21],
  [21, 22],
  [22, 23],
  [23, 24],
  [24, 25],
  [25, 26],
  [26, 27],
  [27, 28],
  [28, 14],
  [0, 29],
  [29, 30],
  [30, 31],
  [31, 24],
  [31, 32],
  [32, 24],
  [32, 33],
  [33, 34],
  [34, 14],
  [29, 20],
  [34, 28],
];

export type MapId = "foundry" | "aqueduct" | "citadel" | "orbital";
export type Spawn = Vec3 & { yaw: number };
export type PickupSpawn = Vec3 & { kind: PickupKind };
export type ArenaMap = {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  width: number;
  depth: number;
  upper: number;
  theme: MapId;
  solids: Solid[];
  shotSolids: Solid[];
  ramps: Ramp[];
  spawns: Spawn[];
  pickups: PickupSpawn[];
  nav: Vec3[];
  navEdges: number[][];
};
const solid = (
  x: number,
  z: number,
  w: number,
  d: number,
  bottom: number,
  top: number,
  kind: Solid["kind"],
): Solid => ({ x, z, w, d, bottom, top, kind });
const deck = (x: number, z: number, w: number, d: number, top: number) =>
  solid(x, z, w, d, top - 0.45, top, "deck");
const cover = (
  x: number,
  z: number,
  w: number,
  d: number,
  bottom = 0,
  height = 2.1,
) => solid(x, z, w, d, bottom, bottom + height, "cover");
const rail = (x: number, z: number, w: number, d: number, bottom: number) =>
  solid(x, z, w, d, bottom, bottom + 0.75, "rail");
const boundary = (w: number, d: number): Solid[] => [
  solid(-w / 2, 0, 1, d + 1, 0, 12, "wall"),
  solid(w / 2, 0, 1, d + 1, 0, 12, "wall"),
  solid(0, -d / 2, w, 1, 0, 12, "wall"),
  solid(0, d / 2, w, 1, 0, 12, "wall"),
];
const spawn = (x: number, y: number, z: number, yaw = 0): Spawn => ({
  x,
  y,
  z,
  yaw,
});
const pickup = (
  kind: PickupKind,
  x: number,
  y: number,
  z: number,
): PickupSpawn => ({ x, y, z, kind });
type Point = [number, number, number];

/** A navigation edge must offer standing clearance in both directions, including every stair. */
function walkable(map: ArenaMap, from: Vec3, to: Vec3) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.16),
  );
  let y = from.y;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      x = from.x + (to.x - from.x) * t,
      z = from.z + (to.z - from.z) * t;
    let next = floorAt(x, z, y + 0.34, map);
    for (const s of map.solids) {
      const dx = Math.max(Math.abs(x - s.x) - s.w / 2, 0);
      const dz = Math.max(Math.abs(z - s.z) - s.d / 2, 0);
      if (s.top <= y + 0.341 && dx * dx + dz * dz <= 0.34 * 0.34)
        next = Math.max(next, s.top);
    }
    if (next < y - 0.35) return false;
    y = next;
    for (const s of map.solids) {
      if (y >= s.top - 0.025 || y + 1.72 <= s.bottom + 0.025) continue;
      const dx = Math.max(Math.abs(x - s.x) - s.w / 2, 0),
        dz = Math.max(Math.abs(z - s.z) - s.d / 2, 0);
      if (dx * dx + dz * dz < 0.35 * 0.35) return false;
    }
    for (const r of map.ramps)
      if (contains(x, z, r, 0.17) && y + 0.34 < rampHeight(r, x, z))
        return false;
  }
  return Math.abs(y - to.y) < 0.35;
}
/** Authored lanes are subdivided sparsely; only physically walkable nearby nodes connect. */
function navigation(map: ArenaMap, paths: Point[][]) {
  const nodes: Vec3[] = [];
  const add = (p: Vec3) => {
    if (!walkable(map, p, p)) return;
    if (!nodes.some((n) => Math.hypot(n.x - p.x, n.y - p.y, n.z - p.z) < 0.04))
      nodes.push(p);
  };
  for (const path of paths)
    for (let i = 0; i < path.length; i++) {
      const [x, y, z] = path[i];
      add({ x, y, z });
      if (!i) continue;
      const [px, py, pz] = path[i - 1],
        count = Math.ceil(Math.hypot(x - px, z - pz) / 5.5);
      for (let j = 1; j < count; j++) {
        const t = j / count,
          nx = px + (x - px) * t,
          nz = pz + (z - pz) * t;
        add({
          x: nx,
          z: nz,
          y: floorAt(nx, nz, py + (y - py) * t + 0.34, map),
        });
      }
    }
  for (const p of [...map.spawns, ...map.pickups])
    add({ x: p.x, y: p.y, z: p.z });
  const edges: number[][] = [];
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i],
        b = nodes[j];
      if (
        Math.hypot(a.x - b.x, a.z - b.z) <= 7.8 &&
        walkable(map, a, b) &&
        walkable(map, b, a)
      )
        edges.push([i, j]);
    }
  map.nav = nodes;
  map.navEdges = edges;
}
type Definition = Omit<ArenaMap, "shotSolids" | "nav" | "navEdges" | "theme">;
function arena(definition: Definition, paths: Point[][]): ArenaMap {
  const map: ArenaMap = {
    ...definition,
    theme: definition.id,
    shotSolids: definition.solids.flatMap((s) =>
      s.kind === "rail" ? railParts(s) : [s],
    ),
    nav: [],
    navEdges: [],
  };
  navigation(map, paths);
  return map;
}

RAMPS.push(
  { x: -24, z: 4, w: 6, d: 12, top: 4.5 },
  { x: 24, z: 4, w: 6, d: 12, top: 4.5 },
);
SOLIDS.push(
  deck(-24, -10, 6, 16, 4.5),
  deck(24, -10, 6, 16, 4.5),
  cover(-24, 17, 3, 3, 0, 3.4),
  cover(24, 17, 3, 3, 0, 3.4),
  cover(-23, -15, 2, 2, 4.5, 1.8),
  cover(23, -15, 2, 2, 4.5, 1.8),
  solid(-20.4, -1, 0.6, 7, 0, 3, "wall"),
  solid(20.4, -1, 0.6, 7, 0, 3, "wall"),
  cover(-6, 21, 3, 2, 0, 1.3),
  cover(6, 21, 3, 2, 0, 1.3),
  rail(-27, -6, 0.18, 5, 4.5),
  rail(27, -6, 0.18, 5, 4.5),
);
PICKUP_SPAWNS.push(
  pickup("plasma", -24, 0, 12),
  pickup("rail", 24, 4.5, -11),
  pickup("grenade", 0, 0, 22),
  pickup("speed", -24, 0, -20),
  pickup("invisibility", 24, 0, -20),
  pickup("jetpack", 0, 4.5, -20),
  pickup("health", -27.5, 0, -7),
  pickup("ammo", 27.5, 0, 7),
);
const oldPaths: Point[][] = NAV_EDGES.map(([a, b]) =>
  [NAV[a], NAV[b]].map((p) => [p.x, p.y, p.z] as Point),
);
const foundry = arena(
  {
    id: "foundry",
    name: "Ion Foundry",
    subtitle: "Expanded industrial complex",
    description:
      "A reactor hall, upper galleries and two new maintenance wings. Circle outside the crossfire or take the north gantry for a clear rail shot.",
    ...ARENA,
    solids: SOLIDS,
    ramps: RAMPS,
    spawns: SPAWNS,
    pickups: PICKUP_SPAWNS,
  },
  [
    ...oldPaths,
    [
      [0, 4.5, -13],
      [0, 4.5, -20],
    ],
    [
      [-24, 0, 12],
      [-24, 0, 10],
      [-24, 2.25, 4],
      [-24, 4.5, -2],
      [-24, 4.5, -9],
      [-24, 4.5, -11],
      [-27, 4.5, -19],
      [-17, 4.5, -20],
      [0, 4.5, -20],
      [17, 4.5, -20],
      [27, 4.5, -19],
      [24, 4.5, -11],
      [24, 4.5, -9],
      [24, 4.5, -2],
      [24, 2.25, 4],
      [24, 0, 10],
      [24, 0, 12],
    ],
    [
      [-27.6, 0, 22],
      [0, 0, 22],
      [27.6, 0, 22],
      [27.6, 0, -22],
      [-27.6, 0, -22],
      [-27.6, 0, 22],
    ],
    [
      [-27.6, 0, 12],
      [-24, 0, 12],
      [-19, 0, 16],
      [-11, 0, 12],
    ],
    [
      [27.6, 0, 12],
      [24, 0, 12],
      [19, 0, 16],
      [11, 0, 12],
    ],
    [
      [-27.6, 0, -20],
      [-24, 0, -20],
      [-11, 0, -20],
      [-11, 0, -13],
    ],
    [
      [27.6, 0, -20],
      [24, 0, -20],
      [11, 0, -20],
      [11, 0, -13],
    ],
  ],
);
NAV.splice(0, NAV.length, ...foundry.nav);
NAV_EDGES.splice(0, NAV_EDGES.length, ...foundry.navEdges);
foundry.nav = NAV;
foundry.navEdges = NAV_EDGES;
export const SHOT_SOLIDS = foundry.shotSolids;

const aqueduct = arena(
  {
    id: "aqueduct",
    name: "Mosswater Aqueduct",
    subtitle: "Ancient stone · twin skyways",
    description:
      "Weathered waterways cross a sunken garden. Trade fire across the long aqueducts, slip beneath their arches or flank through the north stair.",
    width: 56,
    depth: 68,
    upper: 5,
    ramps: [
      { x: -12, z: 24, w: 6, d: 8, top: 5 },
      { x: 12, z: 24, w: 6, d: 8, top: 5 },
      { x: 0, z: -27, w: 6, d: 10, top: 5, steps: 20, direction: 1 },
    ],
    solids: [
      ...boundary(56, 68),
      deck(-12, 0, 6, 40, 5),
      deck(12, 0, 6, 40, 5),
      deck(0, 0, 30, 6, 5),
      deck(0, -19, 30, 6, 5),
      cover(-12, -10, 2, 2, 0, 4.55),
      cover(12, -10, 2, 2, 0, 4.55),
      cover(-12, 10, 2, 2, 0, 4.55),
      cover(12, 10, 2, 2, 0, 4.55),
      cover(-3, 11, 5, 1.3, 0, 2.4),
      cover(3, -11, 5, 1.3, 0, 2.4),
      cover(-21, -12, 3, 4, 0, 3.2),
      cover(21, 12, 3, 4, 0, 3.2),
      cover(-21, 14, 4, 2, 0, 2.2),
      cover(21, -14, 4, 2, 0, 2.2),
      cover(-12, -9, 2, 1.5, 5, 1.3),
      cover(12, 9, 2, 1.5, 5, 1.3),
      solid(0, 1, 2.6, 2.6, 0, 3.5, "reactor"),
      rail(-15, 8, 0.18, 8, 5),
      rail(15, -8, 0.18, 8, 5),
      rail(-6, -22, 6, 0.18, 5),
      rail(6, -22, 6, 0.18, 5),
      rail(-5, 3, 4, 0.18, 5),
      rail(5, 3, 4, 0.18, 5),
    ],
    spawns: [
      spawn(-21, 0, 25),
      spawn(21, 0, 25),
      spawn(-23, 0, -24, Math.PI),
      spawn(23, 0, -24, Math.PI),
      spawn(-12, 5, 17),
      spawn(12, 5, -17, Math.PI),
      spawn(0, 5, -19, Math.PI),
      spawn(6, 0, 18),
    ],
    pickups: [
      pickup("shotgun", -20, 0, 5),
      pickup("shotgun", 20, 0, -5),
      pickup("plasma", 0, 0, -18),
      pickup("rocket", -12, 5, 17),
      pickup("rail", 12, 5, -18),
      pickup("grenade", 0, 5, 0),
      pickup("speed", -23, 0, -24),
      pickup("invisibility", 23, 0, 24),
      pickup("jetpack", 0, 5, -19),
      pickup("armor", 0, 0, 19),
      pickup("armor", -12, 5, -18),
      pickup("health", -23, 0, 0),
      pickup("health", 23, 0, 0),
      pickup("health", 12, 5, 18),
      pickup("ammo", -12, 5, 3),
      pickup("ammo", 12, 5, -3),
      pickup("ammo", 6, 0, -17),
    ],
  },
  [
    [
      [-24, 0, 29],
      [24, 0, 29],
      [24, 0, -26],
      [-24, 0, -26],
      [-24, 0, 29],
    ],
    [
      [-24, 0, 20],
      [-6, 0, 20],
      [6, 0, 20],
      [24, 0, 20],
    ],
    [
      [-24, 0, -19],
      [-6, 0, -19],
      [6, 0, -19],
      [24, 0, -19],
    ],
    [
      [-6, 0, 20],
      [-6, 0, 5],
      [-6, 0, -5],
      [-6, 0, -19],
    ],
    [
      [6, 0, 20],
      [6, 0, 5],
      [6, 0, -5],
      [6, 0, -19],
    ],
    [
      [-24, 0, 0],
      [-6, 0, 0],
      [-3, 0, -4],
      [3, 0, -4],
      [6, 0, 0],
      [24, 0, 0],
    ],
    [
      [-12, 0, 29],
      [-12, 0, 28],
      [-12, 2.5, 24],
      [-12, 5, 20],
      [-12, 5, 17],
      [-10, 5, 12],
      [-10, 5, 6],
      [-12, 5, 0],
      [-10, 5, -5],
      [-10, 5, -12],
      [-12, 5, -19],
      [0, 5, -19],
      [12, 5, -19],
      [12, 5, -12],
      [12, 5, 0],
      [10, 5, 5],
      [10, 5, 12],
      [12, 5, 17],
      [12, 5, 20],
      [12, 2.5, 24],
      [12, 0, 28],
      [12, 0, 29],
    ],
    [
      [-12, 5, 0],
      [0, 5, 0],
      [12, 5, 0],
    ],
    [
      [0, 0, -32],
      [0, 2.5, -27],
      [0, 5, -22],
      [0, 5, -19],
    ],
    [
      [-24, 0, -29],
      [-5, 0, -29],
      [-5, 0, -32.5],
      [0, 0, -32.5],
      [5, 0, -32.5],
      [5, 0, -29],
      [24, 0, -29],
    ],
  ],
);

const citadel = arena(
  {
    id: "citadel",
    name: "Ember Citadel",
    subtitle: "Sandstone fortress · three elevations",
    description:
      "Two broad approaches lead to a fortress gallery. Its central courtyard offers a shorter stair to the battlements, with sheltered ground lanes below.",
    width: 62,
    depth: 62,
    upper: 6,
    ramps: [
      { x: 0, z: 15, w: 6, d: 12, top: 3 },
      { x: 0, z: -14.5, w: 5, d: 11, bottom: 3, top: 6, steps: 12 },
      { x: -11.5, z: 23, w: 15, d: 6, axis: "x", top: 6, direction: -1 },
      { x: 11.5, z: 23, w: 15, d: 6, axis: "x", top: 6, direction: 1 },
    ],
    solids: [
      ...boundary(62, 62),
      deck(0, 0, 18, 18, 3),
      deck(0, -23, 50, 6, 6),
      deck(-22, 0, 6, 46, 6),
      deck(22, 0, 6, 46, 6),
      deck(-22, 23, 6, 6, 6),
      deck(22, 23, 6, 6, 6),
      cover(-5, -4, 2.5, 2, 3, 1.8),
      cover(5, 4, 2.5, 2, 3, 1.8),
      cover(-22, -11, 2, 2, 6, 2),
      cover(22, 10, 2, 2, 6, 2),
      cover(-11, -23, 2, 2, 6, 1.6),
      cover(11, -23, 2, 2, 6, 1.6),
      cover(-13, -12, 3, 3, 0, 3.8),
      cover(13, -12, 3, 3, 0, 3.8),
      cover(-13, 12, 3, 3, 0, 3.8),
      cover(13, 12, 3, 3, 0, 3.8),
      cover(-25, 3, 2, 5, 0, 4),
      cover(25, -3, 2, 5, 0, 4),
      solid(-5, -15, 2, 5, 0, 3.5, "wall"),
      solid(5, -15, 2, 5, 0, 3.5, "wall"),
      rail(-9, -5, 0.18, 5, 3),
      rail(9, 5, 0.18, 5, 3),
      rail(-17, -20, 6, 0.18, 6),
      rail(17, -20, 6, 0.18, 6),
      rail(-25, 13, 0.18, 6, 6),
      rail(25, -13, 0.18, 6, 6),
    ],
    spawns: [
      spawn(-25, 0, 27),
      spawn(25, 0, 27),
      spawn(-25, 0, -27, Math.PI),
      spawn(25, 0, -27, Math.PI),
      spawn(-22, 6, 20),
      spawn(22, 6, -20, Math.PI),
      spawn(0, 3, 6),
      spawn(7, 0, 0, Math.PI / 2),
    ],
    pickups: [
      pickup("shotgun", -16, 0, 4),
      pickup("shotgun", 16, 0, -4),
      pickup("plasma", 0, 3, 0),
      pickup("rocket", -22, 6, 16),
      pickup("grenade", 22, 6, 16),
      pickup("rail", 0, 6, -23),
      pickup("speed", 0, 0, 28),
      pickup("invisibility", 0, 0, -25),
      pickup("jetpack", 0, 3, -6),
      pickup("armor", 0, 0, 0),
      pickup("armor", 22, 6, -17),
      pickup("health", -25, 0, -26),
      pickup("health", 25, 0, 26),
      pickup("health", -22, 6, -18),
      pickup("ammo", -6, 3, 5),
      pickup("ammo", 6, 3, -5),
      pickup("ammo", -5, 6, -23),
      pickup("ammo", 5, 6, -23),
    ],
  },
  [
    [
      [-28, 0, 28],
      [28, 0, 28],
      [28, 0, -28],
      [-28, 0, -28],
      [-28, 0, 28],
    ],
    [
      [-28, 0, 17],
      [-16, 0, 17],
      [-7, 0, 17],
    ],
    [
      [28, 0, 17],
      [16, 0, 17],
      [7, 0, 17],
    ],
    [
      [-16, 0, 17],
      [-16, 0, 0],
      [-16, 0, -18],
      [-16, 0, -28],
    ],
    [
      [16, 0, 17],
      [16, 0, 0],
      [16, 0, -18],
      [16, 0, -28],
    ],
    [
      [-16, 0, 0],
      [-7, 0, 0],
      [0, 0, 0],
      [7, 0, 0],
      [16, 0, 0],
    ],
    [
      [-16, 0, -21],
      [-8, 0, -21],
      [0, 0, -25],
      [8, 0, -21],
      [16, 0, -21],
    ],
    [
      [0, 0, 28],
      [0, 0, 22],
      [0, 0, 21],
      [0, 1.5, 15],
      [0, 3, 9],
      [0, 3, 6],
      [0, 3, 0],
      [0, 3, -6],
      [0, 3, -9],
      [0, 4.5, -14.5],
      [0, 6, -20],
      [0, 6, -23],
    ],
    [
      [-7, 3, 6],
      [-7, 3, 0],
      [0, 3, 0],
      [7, 3, 0],
      [7, 3, -6],
    ],
    [
      [-4, 0, 23],
      [-11.5, 3, 23],
      [-19, 6, 23],
      [-22, 6, 23],
      [-22, 6, 17],
      [-20, 6, 6],
      [-20, 6, -6],
      [-20, 6, -15],
      [-22, 6, -23],
      [-16, 6, -23],
      [-16, 6, -25],
      [0, 6, -25],
      [16, 6, -25],
      [16, 6, -23],
      [22, 6, -23],
      [22, 6, -17],
      [20, 6, -6],
      [20, 6, 5],
      [20, 6, 15],
      [22, 6, 23],
      [19, 6, 23],
      [11.5, 3, 23],
      [4, 0, 23],
    ],
  ],
);

const orbital = arena(
  {
    id: "orbital",
    name: "Orbital Array",
    subtitle: "Docking ring · observation hub",
    description:
      "Four docking pads surround a raised command hub. Cross the spokes for fast rotations, use the lower service floor for cover and contest the observation platform.",
    width: 64,
    depth: 64,
    upper: 4,
    ramps: [
      { x: -23, z: 27, w: 6, d: 6, top: 4 },
      { x: 23, z: 27, w: 6, d: 6, top: 4 },
      { x: -23, z: -27, w: 6, d: 6, top: 4, direction: 1 },
      { x: 23, z: -27, w: 6, d: 6, top: 4, direction: 1 },
      { x: 0, z: 6.25, w: 4, d: 5.5, bottom: 4, top: 7.5, steps: 14 },
    ],
    solids: [
      ...boundary(64, 64),
      deck(0, 0, 18, 18, 4),
      deck(-23, -18, 14, 12, 4),
      deck(23, -18, 14, 12, 4),
      deck(-23, 18, 14, 12, 4),
      deck(23, 18, 14, 12, 4),
      deck(-15, 0, 12, 6, 4),
      deck(15, 0, 12, 6, 4),
      deck(-23, 0, 6, 24, 4),
      deck(23, 0, 6, 24, 4),
      deck(0, -18, 32, 4, 4),
      deck(0, 18, 32, 4, 4),
      deck(0, -13.5, 5, 9, 4),
      deck(0, 13.5, 5, 9, 4),
      deck(0, 0, 7, 7, 7.5),
      solid(0, 0, 4, 4, 0, 3.55, "reactor"),
      cover(-23, -18, 3, 3, 4, 2.2),
      cover(23, 18, 3, 3, 4, 2.2),
      cover(-27, 18, 2, 4, 4, 1.7),
      cover(27, -18, 2, 4, 4, 1.7),
      cover(-7, -6, 2, 2, 4, 1.5),
      cover(7, 6, 2, 2, 4, 1.5),
      cover(-11, 11, 3, 3, 0, 2.6),
      cover(11, -11, 3, 3, 0, 2.6),
      cover(-11, -11, 3, 3, 0, 2.6),
      cover(11, 11, 3, 3, 0, 2.6),
      cover(-23, 0, 2, 4, 0, 3.55),
      cover(23, 0, 2, 4, 0, 3.55),
      rail(-9, -15, 7, 0.18, 4),
      rail(9, 15, 7, 0.18, 4),
      rail(-30, -18, 0.18, 6, 4),
      rail(30, 18, 0.18, 6, 4),
      rail(-3.5, 0, 0.18, 4, 7.5),
      rail(3.5, 0, 0.18, 4, 7.5),
    ],
    spawns: [
      spawn(-17, 0, 27),
      spawn(17, 0, 27),
      spawn(-17, 0, -27, Math.PI),
      spawn(17, 0, -27, Math.PI),
      spawn(-20, 4, 20),
      spawn(20, 4, -20, Math.PI),
      spawn(-5, 4, 2, Math.PI / 2),
      spawn(5, 4, -2, -Math.PI / 2),
    ],
    pickups: [
      pickup("shotgun", -18, 0, 9),
      pickup("shotgun", 18, 0, -9),
      pickup("plasma", 0, 4, -18),
      pickup("rocket", -23, 4, 18),
      pickup("rail", 23, 4, -18),
      pickup("grenade", 0, 4, 18),
      pickup("speed", 0, 0, 25),
      pickup("invisibility", 0, 0, -25),
      pickup("jetpack", 0, 7.5, 0),
      pickup("armor", -4, 4, 0),
      pickup("armor", 4, 4, 0),
      pickup("health", -27, 0, 0),
      pickup("health", 27, 0, 0),
      pickup("health", -23, 4, -22),
      pickup("health", 23, 4, 22),
      pickup("ammo", -23, 4, 0),
      pickup("ammo", 23, 4, 0),
      pickup("ammo", 0, 0, 12),
      pickup("ammo", 0, 0, -12),
    ],
  },
  [
    [
      [-30.6, 0, 30.6],
      [30.6, 0, 30.6],
      [30.6, 0, -30.6],
      [-30.6, 0, -30.6],
      [-30.6, 0, 30.6],
    ],
    [
      [-17, 0, 27],
      [-17, 0, 17],
      [-17, 0, 0],
      [-17, 0, -17],
      [-17, 0, -27],
    ],
    [
      [17, 0, 27],
      [17, 0, 17],
      [17, 0, 0],
      [17, 0, -17],
      [17, 0, -27],
    ],
    [
      [-30.6, 0, 27],
      [-17, 0, 27],
      [0, 0, 27],
      [17, 0, 27],
      [30.6, 0, 27],
    ],
    [
      [-30.6, 0, -27],
      [-17, 0, -27],
      [0, 0, -27],
      [17, 0, -27],
      [30.6, 0, -27],
    ],
    [
      [-17, 0, 5],
      [-5, 0, 5],
      [5, 0, 5],
      [17, 0, 5],
    ],
    [
      [-17, 0, -5],
      [-5, 0, -5],
      [5, 0, -5],
      [17, 0, -5],
    ],
    [
      [0, 0, 27],
      [0, 0, 12],
      [0, 0, 5],
    ],
    [
      [0, 0, -27],
      [0, 0, -12],
      [0, 0, -5],
    ],
    [
      [-23, 0, 30],
      [-23, 2, 27],
      [-23, 4, 24],
      [-23, 4, 18],
      [-23, 4, 12],
      [-23, 4, 0],
      [-23, 4, -12],
      [-20, 4, -16],
      [-20, 4, -21],
      [-23, 4, -24],
      [-23, 2, -27],
      [-23, 0, -30],
    ],
    [
      [23, 0, 30],
      [23, 2, 27],
      [23, 4, 24],
      [20, 4, 21],
      [20, 4, 16],
      [23, 4, 12],
      [23, 4, 0],
      [23, 4, -12],
      [23, 4, -18],
      [23, 4, -24],
      [23, 2, -27],
      [23, 0, -30],
    ],
    [
      [-23, 4, 0],
      [-12, 4, 0],
      [-5, 4, 0],
      [-5, 4, -5],
      [0, 4, -5],
      [5, 4, -5],
      [5, 4, 0],
      [12, 4, 0],
      [23, 4, 0],
    ],
    [
      [-5, 4, 0],
      [-5, 4, 5],
      [0, 4, 9],
      [5, 4, 5],
      [5, 4, 0],
    ],
    [
      [-23, 4, 18],
      [-16, 4, 18],
      [0, 4, 18],
      [16, 4, 18],
      [20, 4, 18],
    ],
    [
      [-20, 4, -18],
      [-16, 4, -18],
      [0, 4, -18],
      [16, 4, -18],
      [23, 4, -18],
    ],
    [
      [0, 4, -18],
      [0, 4, -9],
      [0, 4, -5],
    ],
    [
      [0, 4, 18],
      [0, 4, 9],
      [0, 5.75, 6.25],
      [0, 7.5, 3.5],
      [0, 7.5, 0],
    ],
  ],
);
export const MAPS: ArenaMap[] = [foundry, aqueduct, citadel, orbital];
export function getMap(id?: string): ArenaMap {
  return MAPS.find((map) => map.id === id) ?? foundry;
}
