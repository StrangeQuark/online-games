export type Direction = "left" | "right" | "up" | "down";
export type Tile = { id: number; value: number; pos: number };
export type Snapshot = {
  tiles: Tile[];
  score: number;
  moves: number;
  seed: number;
  nextId: number;
};
export type MosaicState = Snapshot & {
  version: 1;
  id: string;
  size: 4 | 5;
  daily: string | null;
  undos: number;
  history: Snapshot[];
  ended: boolean;
  merged: number[];
  spawned: number;
  gain: number;
};
const KEY = "afterhours:mosaic-session-v1";
export const dayKey = () => new Date().toISOString().slice(0, 10);
export function seedFor(day: string) {
  let hash = 2166136261;
  for (const c of day) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}
function random(seed: number) {
  let n = seed;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  return n >>> 0 || 1;
}
function spawn(s: MosaicState) {
  const empty = Array.from({ length: s.size ** 2 }, (_, i) => i).filter(
    (p) => !s.tiles.some((t) => t.pos === p),
  );
  if (!empty.length) return;
  s.seed = random(s.seed);
  const pos = empty[s.seed % empty.length];
  s.seed = random(s.seed);
  const id = s.nextId++;
  s.tiles.push({ id, pos, value: s.seed % 10 === 0 ? 4 : 2 });
  s.spawned = id;
}
export function newMosaic(
  size: 4 | 5 = 4,
  daily: string | null = null,
  seed = Math.floor(Math.random() * 0xffffffff) || 1,
): MosaicState {
  const s: MosaicState = {
    version: 1,
    id: crypto.randomUUID(),
    size: daily ? 4 : size,
    daily,
    seed: daily ? seedFor(daily) : seed,
    tiles: [],
    score: 0,
    moves: 0,
    nextId: 1,
    undos: 3,
    history: [],
    ended: false,
    merged: [],
    spawned: 0,
    gain: 0,
  };
  spawn(s);
  spawn(s);
  return s;
}
export function snapshot(s: MosaicState): Snapshot {
  return {
    tiles: s.tiles.map((t) => ({ ...t })),
    score: s.score,
    moves: s.moves,
    seed: s.seed,
    nextId: s.nextId,
  };
}
export function slide(
  s: MosaicState,
  direction: Direction,
): MosaicState | null {
  if (s.ended) return null;
  const n = s.size,
    tiles: Tile[] = [],
    merged: number[] = [];
  let gain = 0;
  for (let line = 0; line < n; line++) {
    const indices = Array.from({ length: n }, (_, p) =>
      direction === "left"
        ? line * n + p
        : direction === "right"
          ? line * n + n - 1 - p
          : direction === "up"
            ? p * n + line
            : (n - 1 - p) * n + line,
    );
    const row = indices
      .map((pos) => s.tiles.find((t) => t.pos === pos))
      .filter((t): t is Tile => Boolean(t));
    let destination = 0;
    for (let i = 0; i < row.length; i++) {
      const tile = { ...row[i], pos: indices[destination++] };
      if (row[i + 1]?.value === tile.value) {
        tile.value *= 2;
        gain += tile.value;
        merged.push(tile.id);
        i++;
      }
      tiles.push(tile);
    }
  }
  if (
    !gain &&
    tiles.every((t) =>
      s.tiles.some((old) => old.id === t.id && old.pos === t.pos),
    )
  )
    return null;
  const next: MosaicState = {
    ...s,
    tiles,
    score: s.score + gain,
    moves: s.moves + 1,
    merged,
    gain,
    history: [...s.history, snapshot(s)].slice(-3),
  };
  spawn(next);
  return next;
}
export function canMove(s: Pick<MosaicState, "tiles" | "size">) {
  if (s.tiles.length < s.size ** 2) return true;
  const values = new Map(s.tiles.map((t) => [t.pos, t.value]));
  return s.tiles.some(
    (t) =>
      (t.pos % s.size < s.size - 1 && values.get(t.pos + 1) === t.value) ||
      (t.pos + s.size < s.size ** 2 && values.get(t.pos + s.size) === t.value),
  );
}
export function undoMosaic(s: MosaicState): MosaicState | null {
  if (s.ended || !s.undos || !s.history.length) return null;
  return {
    ...s,
    ...s.history.at(-1)!,
    history: s.history.slice(0, -1),
    undos: s.undos - 1,
    merged: [],
    spawned: 0,
    gain: 0,
  };
}
export const highest = (s: Pick<MosaicState, "tiles">) =>
  Math.max(2, ...s.tiles.map((t) => t.value));
function validSnapshot(s: Snapshot, size: number): boolean {
  return Boolean(
    s &&
    Array.isArray(s.tiles) &&
    s.tiles.length >= 2 &&
    s.tiles.length <= size ** 2 &&
    s.tiles.every(
      (t) =>
        t &&
        Number.isInteger(t.pos) &&
        t.pos >= 0 &&
        t.pos < size ** 2 &&
        Number.isInteger(t.id) &&
        t.id > 0 &&
        t.id < s.nextId &&
        Number.isInteger(t.value) &&
        t.value >= 2 &&
        t.value <= 2 ** 24 &&
        Number.isInteger(Math.log2(t.value)),
    ) &&
    new Set(s.tiles.map((t) => t.pos)).size === s.tiles.length &&
    new Set(s.tiles.map((t) => t.id)).size === s.tiles.length &&
    Number.isSafeInteger(s.score) &&
    s.score >= 0 &&
    Number.isInteger(s.moves) &&
    s.moves >= 0 &&
    s.moves < 1000000 &&
    Number.isInteger(s.seed) &&
    s.seed > 0 &&
    s.seed <= 0xffffffff &&
    Number.isInteger(s.nextId) &&
    s.nextId >= 3 &&
    s.nextId < 1000005,
  );
}
export function validMosaic(s: MosaicState): boolean {
  return Boolean(
    s &&
    s.version === 1 &&
    [4, 5].includes(s.size) &&
    typeof s.id === "string" &&
    /^[a-zA-Z0-9_-]{8,80}$/.test(s.id) &&
    (s.daily === null ||
      (typeof s.daily === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.daily))) &&
    typeof s.ended === "boolean" &&
    Number.isInteger(s.undos) &&
    s.undos >= 0 &&
    s.undos <= 3 &&
    validSnapshot(s, s.size) &&
    Array.isArray(s.history) &&
    s.history.length <= 3 &&
    s.history.every((h) => validSnapshot(h, s.size)),
  );
}
export function readMosaic(): MosaicState | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return validMosaic(s) && !s.ended
      ? { ...s, merged: [], spawned: 0, gain: 0 }
      : null;
  } catch {
    return null;
  }
}
export function saveMosaic(s: MosaicState) {
  try {
    if (s.ended) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
