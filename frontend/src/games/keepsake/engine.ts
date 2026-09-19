export const SCENES = [
  {
    id: "driftline",
    title: "The golden coast",
    caption: "A little ocean air, kept for later.",
  },
  {
    id: "wispwood",
    title: "Where the light lives",
    caption: "A quiet corner of the forest.",
  },
  {
    id: "parcel",
    title: "Special delivery",
    caption: "Something lovely is on its way.",
  },
  {
    id: "pocketputt",
    title: "The putting garden",
    caption: "An afternoon with nowhere else to be.",
  },
  {
    id: "lumen",
    title: "The glasshouse",
    caption: "A small collection of beautiful connections.",
  },
] as const;
export type PieceCount = 12 | 24 | 48;
export const SIZES: PieceCount[] = [12, 24, 48];
export const dimensions = (size: PieceCount) =>
  size === 12
    ? { cols: 4, rows: 3 }
    : size === 24
      ? { cols: 6, rows: 4 }
      : { cols: 8, rows: 6 };
export type KeepsakeState = {
  id: string;
  scene: number;
  size: PieceCount;
  placed: number[];
  order: number[];
  mistakes: number;
  seconds: number;
  contributions: Record<string, number>;
  last: { piece: number; by: string } | null;
};
export function shuffled(size: number, seed: number) {
  let rng = seed >>> 0;
  const a = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((rng / 4294967296) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function newKeepsake(
  scene = 0,
  size: PieceCount = 12,
  seed = Date.now(),
): KeepsakeState {
  return {
    id: crypto.randomUUID(),
    scene,
    size,
    placed: [],
    order: shuffled(size, seed),
    mistakes: 0,
    seconds: 0,
    contributions: {},
    last: null,
  };
}
export const complete = (g: KeepsakeState) => g.placed.length === g.size;
export function placeKeepsake(
  g: KeepsakeState,
  piece: number,
  target: number,
  by = "solo",
): KeepsakeState | null {
  if (
    !Number.isInteger(piece) ||
    !Number.isInteger(target) ||
    piece < 0 ||
    piece >= g.size ||
    target < 0 ||
    target >= g.size ||
    g.placed.includes(piece) ||
    complete(g)
  )
    return null;
  if (piece !== target) return { ...g, mistakes: g.mistakes + 1 };
  return {
    ...g,
    placed: [...g.placed, piece],
    contributions: { ...g.contributions, [by]: (g.contributions[by] ?? 0) + 1 },
    last: { piece, by },
  };
}
export const keepsakeScore = (g: KeepsakeState) =>
  Math.max(500, 1000 + g.size * 60 - Math.min(800, g.mistakes * 15));
export function edgePiece(size: PieceCount, piece: number) {
  const { cols, rows } = dimensions(size),
    r = Math.floor(piece / cols),
    c = piece % cols;
  return r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
}
export function pieceEdges(size: PieceCount, piece: number) {
  const { cols, rows } = dimensions(size),
    r = Math.floor(piece / cols),
    c = piece % cols,
    h = (row: number, col: number) =>
      (row * 17 + col * 13 + 3) % 5 < 3 ? 1 : -1,
    v = (row: number, col: number) =>
      (row * 11 + col * 7 + 1) % 5 < 3 ? 1 : -1;
  return {
    top: r === 0 ? 0 : -v(r - 1, c),
    right: c === cols - 1 ? 0 : h(r, c),
    bottom: r === rows - 1 ? 0 : v(r, c),
    left: c === 0 ? 0 : -h(r, c - 1),
  };
}
/** Clockwise, symmetric knobs make neighboring edges exact complements. */
export function piecePath(size: PieceCount, piece: number) {
  const { cols, rows } = dimensions(size),
    w = 600 / cols,
    h = 400 / rows,
    a = Math.min(w, h) * 0.18,
    edges = pieceEdges(size, piece);
  let path = "M0 0";
  const edge = (
    sx: number,
    sy: number,
    dx: number,
    dy: number,
    nx: number,
    ny: number,
    sign: number,
  ) => {
    const p = (t: number, v = 0) =>
      `${(sx + dx * t + nx * v * sign).toFixed(2)} ${(sy + dy * t + ny * v * sign).toFixed(2)}`;
    if (!sign) {
      path += ` L${p(1)}`;
      return;
    }
    path += ` L${p(0.37)} C${p(0.4)} ${p(0.42, a * 0.1)} ${p(0.4, a * 0.45)} C${p(0.31, a * 1.15)} ${p(0.69, a * 1.15)} ${p(0.6, a * 0.45)} C${p(0.58, a * 0.1)} ${p(0.6)} ${p(0.63)} L${p(1)}`;
  };
  edge(0, 0, w, 0, 0, -1, edges.top);
  edge(w, 0, 0, h, 1, 0, edges.right);
  edge(w, h, -w, 0, 0, 1, edges.bottom);
  edge(0, h, 0, -h, -1, 0, edges.left);
  return path + " Z";
}
export function validKeepsake(value: unknown): value is KeepsakeState {
  if (!value || typeof value !== "object") return false;
  const g = value as KeepsakeState,
    indices = (v: unknown) =>
      Array.isArray(v) &&
      v.every((n) => Number.isInteger(n) && n >= 0 && n < g.size) &&
      new Set(v).size === v.length;
  if (
    typeof g.id !== "string" ||
    !/^[A-Za-z0-9_-]{8,80}$/.test(g.id) ||
    !Number.isInteger(g.scene) ||
    !SCENES[g.scene] ||
    !SIZES.includes(g.size) ||
    !indices(g.placed) ||
    !indices(g.order) ||
    g.order.length !== g.size ||
    !Number.isSafeInteger(g.mistakes) ||
    g.mistakes < 0 ||
    g.mistakes > 100000 ||
    !Number.isFinite(g.seconds) ||
    g.seconds < 0 ||
    g.seconds > 1000000 ||
    !g.contributions ||
    typeof g.contributions !== "object" ||
    Array.isArray(g.contributions)
  )
    return false;
  const entries = Object.entries(g.contributions);
  if (
    entries.length > 100 ||
    entries.some(
      ([id, n]) =>
        id.length > 80 || !Number.isInteger(n) || n < 0 || n > g.size,
    ) ||
    entries.reduce((n, [, v]) => n + v, 0) !== g.placed.length
  )
    return false;
  return g.last === null
    ? g.placed.length === 0
    : Boolean(
        g.last &&
        g.placed.includes(g.last.piece) &&
        typeof g.last.by === "string" &&
        g.contributions[g.last.by] > 0,
      );
}
const KEY = "afterhours:keepsake-session-v1";
export function readKeepsake() {
  try {
    const g: unknown = JSON.parse(localStorage.getItem(KEY) || "null");
    return validKeepsake(g) && !complete(g) && g.placed.length > 0 ? g : null;
  } catch {
    return null;
  }
}
export function saveKeepsake(g: KeepsakeState) {
  try {
    if (complete(g) || !g.placed.length) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(g));
  } catch {}
}
