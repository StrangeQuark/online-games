import { GROVES, type Wisp } from "./engine";
const KEY = "afterhours:wispwood-checkpoint-v1";
export function readWisp(): Wisp | null {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) || "null") as Wisp | null;
    if (
      !g ||
      typeof g.id !== "string" ||
      !Number.isInteger(g.level) ||
      !GROVES[g.level] ||
      !["playing", "paused", "clear", "intro"].includes(g.phase) ||
      !Array.isArray(g.lanterns) ||
      g.lanterns.some((n) => !Number.isInteger(n) || n < 0 || n > 2) ||
      new Set(g.lanterns).size !== g.lanterns.length
    )
      return null;
    if (
      [g.time, g.totalTime, g.score, g.deaths, g.totalDeaths, g.cleared].some(
        (n) => !Number.isFinite(n) || n < 0,
      ) ||
      g.cleared > 8 ||
      !g.checkpoint ||
      !Number.isInteger(g.checkpoint.platform)
    )
      return null;
    const p = GROVES[g.level].platforms[g.checkpoint.platform];
    if (!p) return null;
    const checkpoint = {
      x: g.checkpoint.platform === 0 ? 100 : p.x + 38,
      y: p.y - 20,
      platform: g.checkpoint.platform,
    };
    return {
      ...g,
      checkpoint,
      x: g.phase === "clear" ? GROVES[g.level].exit.x : checkpoint.x,
      y: g.phase === "clear" ? GROVES[g.level].exit.y - 20 : checkpoint.y,
      vx: 0,
      vy: 0,
      ground: checkpoint.platform,
      jumps: 0,
      coyote: 0.12,
      jumpBuffer: 0,
      wasJump: false,
      wasDash: false,
      dashTime: 0,
      dashCooldown: 0,
      respawn: 0,
      remainder: 0,
      events: [],
      phase: g.phase === "clear" ? "clear" : "paused",
      notice: "Your little lights are right where you left them.",
      noticeTime: 4,
    };
  } catch {
    return null;
  }
}
export function saveWisp(g: Wisp) {
  try {
    if (g.phase === "complete") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(g));
  } catch {}
}
export function readWispProgress() {
  try {
    const p = JSON.parse(
      localStorage.getItem("afterhours:wispwood-progress") || "{}",
    );
    return {
      unlocked: Number.isInteger(p.unlocked)
        ? Math.max(0, Math.min(7, p.unlocked))
        : 0,
      best: Number.isFinite(p.best) && p.best > 0 ? Math.floor(p.best) : 0,
    };
  } catch {
    return { unlocked: 0, best: 0 };
  }
}
export function saveWispProgress(p: { unlocked: number; best: number }) {
  try {
    localStorage.setItem("afterhours:wispwood-progress", JSON.stringify(p));
  } catch {}
}
