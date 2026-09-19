import { type Delivery, type Puzzle, solved } from "./engine";
export type ParcelSession = {
  level: number;
  daily: boolean;
  date: string;
  puzzle: Puzzle;
  state: Delivery;
  id: string;
  hints: number;
};
export type ParcelProgress = {
  unlocked: number;
  stars: Record<number, number>;
};
const KEY = "afterhours:parcel-session-v1";
export function saveParcel(session: ParcelSession) {
  try {
    if (session.state.won) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
}
export function readParcel(): ParcelSession | null {
  try {
    const s = JSON.parse(
      localStorage.getItem(KEY) || "null",
    ) as ParcelSession | null;
    if (
      !s ||
      typeof s.id !== "string" ||
      !Number.isInteger(s.level) ||
      s.level < 0 ||
      s.level >= 12 ||
      typeof s.daily !== "boolean" ||
      typeof s.date !== "string" ||
      !Number.isInteger(s.hints) ||
      s.hints < 0
    )
      return null;
    const p = s.puzzle,
      g = s.state;
    if (
      !p ||
      !g ||
      !Number.isInteger(p.width) ||
      !Number.isInteger(p.height) ||
      p.width < 4 ||
      p.width > 10 ||
      p.height < 4 ||
      p.height > 10 ||
      !Array.isArray(p.walls) ||
      !Array.isArray(p.goals) ||
      !Array.isArray(p.boxes) ||
      p.boxes.length !== p.goals.length ||
      p.boxes.length < 1 ||
      p.boxes.length > 5 ||
      !Number.isInteger(p.par) ||
      p.par < 0 ||
      typeof p.title !== "string" ||
      typeof p.note !== "string"
    )
      return null;
    const inside = (n: number) =>
        Number.isInteger(n) && n >= 0 && n < p.width * p.height,
      position = (v: { player: number; boxes: number[] }) =>
        v &&
        inside(v.player) &&
        !p.walls.includes(v.player) &&
        Array.isArray(v.boxes) &&
        v.boxes.length === p.goals.length &&
        new Set(v.boxes).size === v.boxes.length &&
        v.boxes.every(
          (n) => inside(n) && !p.walls.includes(n) && n !== v.player,
        );
    if (
      !p.walls.every(inside) ||
      !p.goals.every((n) => inside(n) && !p.walls.includes(n)) ||
      new Set(p.goals).size !== p.goals.length ||
      !position(p) ||
      !position(g) ||
      ![g.moves, g.pushes].every((n) => Number.isInteger(n) && n >= 0) ||
      g.pushes > g.moves ||
      !Array.isArray(g.history) ||
      g.history.length > 500 ||
      g.history.some((h) => !position(h) || typeof h.push !== "boolean") ||
      solved(p, g.boxes)
    )
      return null;
    return { ...s, state: { ...g, won: false } };
  } catch {
    return null;
  }
}
export function readParcelProgress(): ParcelProgress {
  try {
    const p = JSON.parse(
      localStorage.getItem("afterhours:parcel-progress") || "{}",
    );
    return {
      unlocked: Number.isInteger(p.unlocked)
        ? Math.max(0, Math.min(11, p.unlocked))
        : 0,
      stars: Object.fromEntries(
        Object.entries(p.stars ?? {}).filter(
          ([k, v]) =>
            Number.isInteger(Number(k)) &&
            Number(k) >= 0 &&
            Number(k) < 12 &&
            Number.isInteger(v) &&
            Number(v) >= 1 &&
            Number(v) <= 3,
        ),
      ) as Record<number, number>,
    };
  } catch {
    return { unlocked: 0, stars: {} };
  }
}
export function saveParcelProgress(p: ParcelProgress) {
  try {
    localStorage.setItem("afterhours:parcel-progress", JSON.stringify(p));
  } catch {}
}
