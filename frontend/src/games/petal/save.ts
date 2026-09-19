import { GARDENS, SIZE, matches, legalSwaps, type Garden } from "./engine";
const KEY = "afterhours:petal-session-v1";
export function readGarden(): Garden | null {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) || "null") as Garden | null;
    if (
      !g ||
      typeof g.id !== "string" ||
      !Number.isInteger(g.level) ||
      !GARDENS[g.level] ||
      typeof g.zen !== "boolean" ||
      g.ended ||
      g.won
    )
      return null;
    const numbers = [
      g.seed,
      g.rng,
      g.nextId,
      g.score,
      g.moves,
      g.turns,
      g.bestCascade,
      g.shuffles,
    ];
    if (
      numbers.some((n) => !Number.isSafeInteger(n) || n < 0) ||
      g.nextId < 50 ||
      g.turns < 1 ||
      g.rng > 4294967295
    )
      return null;
    if (
      !Array.isArray(g.board) ||
      g.board.length !== SIZE * SIZE ||
      g.board.some(
        (gem) =>
          !gem ||
          !Number.isInteger(gem.id) ||
          gem.id < 1 ||
          gem.id >= g.nextId ||
          !Number.isInteger(gem.kind) ||
          gem.kind < 0 ||
          gem.kind > 5 ||
          (gem.special !== undefined &&
            !["row", "column", "bloom", "prism"].includes(gem.special)),
      )
    )
      return null;
    if (
      new Set(g.board.map((gem) => gem!.id)).size !== SIZE * SIZE ||
      matches(g.board).length ||
      !legalSwaps(g.board).length
    )
      return null;
    const goals = GARDENS[g.level].goals;
    if (
      !Array.isArray(g.goals) ||
      g.goals.length !== goals.length ||
      g.goals.some(
        (goal, i) =>
          goal.kind !== goals[i][0] ||
          goal.target !== goals[i][1] ||
          !Number.isSafeInteger(goal.collected) ||
          goal.collected < 0,
      )
    )
      return null;
    return g;
  } catch {
    return null;
  }
}
export function saveGarden(g: Garden) {
  try {
    if (g.ended || !g.turns) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    /* Play continues when storage is unavailable. */
  }
}
