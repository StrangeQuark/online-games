import {
  newBreaker,
  makeBricks,
  STAGES,
  type Breaker,
  type Difficulty,
} from "./engine";
const KEY = "afterhours:neonbreak-run-v1";
export function saveBreaker(g: Breaker) {
  try {
    if (g.phase === "over" || g.phase === "won") localStorage.removeItem(KEY);
    else
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...g,
          particles: [],
          balls: g.balls.map((b) => ({ ...b, trail: [] })),
        }),
      );
  } catch {}
}
export function readBreaker(): Breaker | null {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) || "null") as Breaker | null;
    if (
      !g ||
      typeof g.id !== "string" ||
      !Number.isInteger(g.stage) ||
      g.stage < 0 ||
      g.stage >= STAGES.length ||
      !(["chill", "classic", "expert"] as Difficulty[]).includes(
        g.difficulty,
      ) ||
      !["ready", "playing", "paused", "between"].includes(g.phase)
    )
      return null;
    const numbers = [
      "score",
      "lives",
      "combo",
      "bestCombo",
      "paddle",
      "target",
      "paddleWidth",
      "wide",
      "slow",
      "laser",
      "shields",
      "laserClock",
      "time",
      "hits",
      "lost",
      "rng",
      "nextId",
    ] as const;
    if (
      numbers.some((k) => !Number.isFinite(g[k])) ||
      g.score < 0 ||
      g.score > 100000000 ||
      g.lives < 1 ||
      g.lives > 7 ||
      g.paddleWidth < 50 ||
      g.paddleWidth > 250 ||
      !Array.isArray(g.balls) ||
      g.balls.length > 6 ||
      !Array.isArray(g.bricks)
    )
      return null;
    const layout = makeBricks(g.stage);
    if (
      g.bricks.length !== layout.length ||
      g.bricks.some(
        (b, i) =>
          b.id !== layout[i].id ||
          !Number.isInteger(b.hp) ||
          b.hp < 0 ||
          b.hp > layout[i].maxHp,
      )
    )
      return null;
    if (
      g.balls.some(
        (b) =>
          !b ||
          [b.id, b.x, b.y, b.vx, b.vy].some((n) => !Number.isFinite(n)) ||
          Math.abs(b.vx) > 3000 ||
          Math.abs(b.vy) > 3000 ||
          b.x < -20 ||
          b.x > 920 ||
          b.y < -20 ||
          b.y > 650,
      )
    )
      return null;
    if (
      !Array.isArray(g.drops) ||
      g.drops.length > 200 ||
      g.drops.some(
        (d) =>
          !d ||
          ![d.id, d.x, d.y].every(Number.isFinite) ||
          !["wide", "multi", "slow", "shield", "laser"].includes(d.kind),
      )
    )
      return null;
    if (
      !Array.isArray(g.beams) ||
      g.beams.length > 200 ||
      g.beams.some((b) => !b || ![b.x, b.y].every(Number.isFinite))
    )
      return null;
    return {
      ...newBreaker(g.difficulty),
      ...g,
      bricks: layout.map((b, i) => ({ ...b, hp: g.bricks[i].hp })),
      balls: g.balls.map((b) => ({ ...b, trail: [] })),
      particles: [],
      phase: g.phase === "playing" ? "paused" : g.phase,
      shake: 0,
      flash: 0,
      notice: "Your sparks are right where you left them.",
      noticeTime: 3,
    };
  } catch {
    return null;
  }
}
