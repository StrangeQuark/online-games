import { HOLES, type Golf } from "./engine";
const KEY = "afterhours:pocketputt-session-v1";
export function readGolf(): Golf | null {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) || "null") as Golf | null;
    if (
      !g ||
      typeof g.id !== "string" ||
      typeof g.daily !== "boolean" ||
      !Number.isInteger(g.hole) ||
      g.hole < 0 ||
      g.hole >= HOLES.length ||
      !["aiming", "sunk"].includes(g.phase)
    )
      return null;
    if (
      !Array.isArray(g.order) ||
      g.order.length !== 9 ||
      new Set(g.order).size !== 9 ||
      g.order.some((n) => !Number.isInteger(n) || n < 0 || n >= 9)
    )
      return null;
    if (
      !g.ball ||
      !g.lastLie ||
      [g.ball, g.lastLie].some(
        (p) =>
          !Number.isFinite(p.x) ||
          !Number.isFinite(p.y) ||
          p.x < 58 ||
          p.x > 842 ||
          p.y < 58 ||
          p.y > 562,
      )
    )
      return null;
    if (
      [g.strokes, g.score, g.lastStrokes, g.waterPenalty, g.mulligans].some(
        (n) => !Number.isSafeInteger(n) || n < 0,
      ) ||
      g.mulligans > 3 ||
      !Number.isFinite(g.time) ||
      g.time < 0
    )
      return null;
    if (
      !Array.isArray(g.results) ||
      g.results.length > 9 ||
      g.results.some((n) => !Number.isInteger(n) || n < 1)
    )
      return null;
    return {
      ...g,
      remainder: 0,
      vx: 0,
      vy: 0,
      trail: [],
      events: [],
      portalCooldown: 0,
      rollTime: 0,
    };
  } catch {
    return null;
  }
}
export function saveGolf(g: Golf) {
  try {
    if (g.phase === "finished") localStorage.removeItem(KEY);
    else if (g.phase === "aiming" || g.phase === "sunk")
      localStorage.setItem(KEY, JSON.stringify(g));
  } catch {}
}
export type GolfRecord = { strokes: number; score: number };
export function readGolfRecord(): GolfRecord | null {
  try {
    const v = JSON.parse(
      localStorage.getItem("afterhours:pocketputt-best") || "null",
    );
    return v &&
      Number.isSafeInteger(v.strokes) &&
      v.strokes > 0 &&
      Number.isSafeInteger(v.score) &&
      v.score >= 0
      ? v
      : null;
  } catch {
    return null;
  }
}
export function saveGolfRecord(record: GolfRecord) {
  try {
    localStorage.setItem("afterhours:pocketputt-best", JSON.stringify(record));
  } catch {}
}
