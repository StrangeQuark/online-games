export const DIRECTIONS = [
  { bit: 1, opposite: 4, dx: 0, dy: -1, name: "north" },
  { bit: 2, opposite: 8, dx: 1, dy: 0, name: "east" },
  { bit: 4, opposite: 1, dx: 0, dy: 1, name: "south" },
  { bit: 8, opposite: 2, dx: -1, dy: 0, name: "west" },
];
export const CHAPTERS = [
  "A little spark",
  "First branches",
  "The conservatory",
  "Morning dew",
  "Copper leaves",
  "The observatory",
  "A quiet constellation",
  "Moonlit pathways",
  "The glasshouse",
  "A thousand fireflies",
  "The deep garden",
  "Everything, illuminated",
];
export const SIZES = [4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8];
export type Tile = {
  base: number;
  turns: number;
  solution: number;
  pinned: boolean;
};
export type Circuit = {
  id: string;
  size: number;
  root: number;
  tiles: Tile[];
  level: number;
  seed: number;
  daily: boolean;
  moves: number;
  hints: number;
  seconds: number;
  won: boolean;
  history: { index: number; turns: number }[];
};
export function rotate(mask: number, turns = 1) {
  const count = ((turns % 4) + 4) % 4;
  return ((mask << count) | (mask >> (4 - count))) & 15;
}
export function maskOf(tile: Tile) {
  return rotate(tile.base, tile.turns);
}
export function connections(g: Circuit) {
  const powered = new Set<number>([g.root]),
    queue = [g.root];
  let leaks = 0;
  while (queue.length) {
    const index = queue.shift()!,
      x = index % g.size,
      y = Math.floor(index / g.size),
      mask = maskOf(g.tiles[index]);
    for (const d of DIRECTIONS) {
      if (!(mask & d.bit)) continue;
      const nx = x + d.dx,
        ny = y + d.dy,
        next = ny * g.size + nx;
      if (
        nx < 0 ||
        nx >= g.size ||
        ny < 0 ||
        ny >= g.size ||
        !(maskOf(g.tiles[next]) & d.opposite)
      ) {
        leaks++;
        continue;
      }
      if (!powered.has(next)) {
        powered.add(next);
        queue.push(next);
      }
    }
  }
  return { powered, leaks };
}
export function newCircuit(
  level = 0,
  seed = 73013 + level * 7919,
  daily = false,
): Circuit {
  let rng = seed >>> 0;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const size = daily
      ? 6
      : SIZES[Math.max(0, Math.min(SIZES.length - 1, level))],
    root = Math.floor(size / 2) * size + Math.floor((size - 1) / 2),
    solution = Array(size * size).fill(0) as number[];
  const visited = new Set([root]),
    frontier: { from: number; to: number; bit: number; opposite: number }[] =
      [];
  function add(index: number) {
    const x = index % size,
      y = Math.floor(index / size);
    for (const d of DIRECTIONS) {
      const nx = x + d.dx,
        ny = y + d.dy;
      if (
        nx >= 0 &&
        nx < size &&
        ny >= 0 &&
        ny < size &&
        !visited.has(ny * size + nx)
      )
        frontier.push({
          from: index,
          to: ny * size + nx,
          bit: d.bit,
          opposite: d.opposite,
        });
    }
  }
  add(root);
  while (frontier.length) {
    const i = Math.floor(random() * frontier.length),
      edge = frontier.splice(i, 1)[0];
    if (visited.has(edge.to)) continue;
    visited.add(edge.to);
    solution[edge.from] |= edge.bit;
    solution[edge.to] |= edge.opposite;
    add(edge.to);
  }
  const tiles = solution.map((mask, i) => ({
    base: i === root ? mask : rotate(mask, Math.floor(random() * 4)),
    turns: 0,
    solution: mask,
    pinned: i === root,
  }));
  const g: Circuit = {
    id: crypto.randomUUID(),
    size,
    root,
    tiles,
    level,
    seed,
    daily,
    moves: 0,
    hints: 0,
    seconds: 0,
    won: false,
    history: [],
  };
  if (connections(g).powered.size === tiles.length) {
    const index = tiles.findIndex(
      (t, i) => i !== root && rotate(t.base) !== t.base,
    );
    if (index >= 0) tiles[index].base = rotate(tiles[index].base);
  }
  return g;
}
export function turnTile(g: Circuit, index: number, direction = 1): Circuit {
  if (
    g.won ||
    !Number.isInteger(index) ||
    !g.tiles[index] ||
    g.tiles[index].pinned
  )
    return g;
  const tiles = g.tiles.map((t, i) =>
    i === index ? { ...t, turns: t.turns + (direction < 0 ? -1 : 1) } : t,
  );
  const next = {
    ...g,
    tiles,
    moves: g.moves + 1,
    history: [...g.history, { index, turns: g.tiles[index].turns }],
  };
  const connected = connections(next);
  next.won = connected.powered.size === tiles.length && connected.leaks === 0;
  return next;
}
export function undoTurn(g: Circuit): Circuit {
  const last = g.history.at(-1);
  if (!last || g.won) return g;
  return {
    ...g,
    moves: Math.max(0, g.moves - 1),
    history: g.history.slice(0, -1),
    tiles: g.tiles.map((t, i) =>
      i === last.index ? { ...t, turns: last.turns } : t,
    ),
  };
}
export function pinTile(g: Circuit, index: number): Circuit {
  if (index === g.root || g.won) return g;
  return {
    ...g,
    tiles: g.tiles.map((t, i) =>
      i === index ? { ...t, pinned: !t.pinned } : t,
    ),
  };
}
export function hintTile(g: Circuit): number | null {
  if (g.won) return null;
  const { powered } = connections(g);
  // Extend the live network first, so the suggested correction has a visible effect.
  for (const index of powered) {
    const x = index % g.size,
      y = Math.floor(index / g.size);
    for (const d of DIRECTIONS) {
      if (!(g.tiles[index].solution & d.bit)) continue;
      const nx = x + d.dx,
        ny = y + d.dy;
      if (nx < 0 || nx >= g.size || ny < 0 || ny >= g.size) continue;
      const next = ny * g.size + nx;
      if (next !== g.root && maskOf(g.tiles[next]) !== g.tiles[next].solution)
        return next;
    }
  }
  const index = g.tiles.findIndex(
    (tile, i) => i !== g.root && maskOf(tile) !== tile.solution,
  );
  return index >= 0 ? index : null;
}
export function minimumTurns(g: Circuit) {
  return g.tiles.reduce((sum, t, i) => {
    if (i === g.root) return sum;
    let turns = 0;
    while (turns < 4 && rotate(t.base, turns) !== t.solution) turns++;
    return sum + Math.min(turns, 4 - turns);
  }, 0);
}
export function stars(g: Circuit) {
  const par = minimumTurns(g);
  return g.hints === 0 && g.moves <= par + g.size
    ? 3
    : g.hints <= 2 && g.moves <= par * 2 + g.size
      ? 2
      : 1;
}
export function circuitScore(g: Circuit) {
  return Math.max(
    100,
    1000 +
      g.size * 200 +
      stars(g) * 200 -
      g.moves * 5 -
      g.hints * 150 -
      Math.min(300, Math.floor(g.seconds)),
  );
}
export function tileName(g: Circuit, index: number, powered: Set<number>) {
  const mask = maskOf(g.tiles[index]);
  return `Row ${Math.floor(index / g.size) + 1}, column ${(index % g.size) + 1}, ${
    index === g.root
      ? "light source"
      : DIRECTIONS.filter((d) => mask & d.bit)
          .map((d) => d.name)
          .join(" and ")
  }, ${powered.has(index) ? "lit" : "unlit"}${g.tiles[index].pinned ? ", pinned" : ""}`;
}
