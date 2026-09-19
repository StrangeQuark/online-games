import {
  DIFFICULTIES,
  MODES,
  STRUCTURES,
  ENEMIES,
  newExpedition,
  type Expedition,
} from "./engine";

const KEY = "afterhours:starfall-checkpoint-v1";
export type Checkpoint = { version: 1; savedAt: number; game: Expedition };

export function readCheckpoint(): Checkpoint | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(KEY) || "null",
    ) as Checkpoint | null;
    const game = saved?.game;
    if (
      !saved ||
      saved.version !== 1 ||
      !Number.isFinite(saved.savedAt) ||
      !game ||
      !game.started ||
      game.ended ||
      typeof game.tag !== "string"
    )
      return null;
    if (
      !MODES.some((m) => m.id === game.mode) ||
      !(game.difficulty in DIFFICULTIES) ||
      !Number.isInteger(game.mission) ||
      game.mission < 0 ||
      game.mission > 8
    )
      return null;
    const template = newExpedition(game.mode, game.difficulty, game.mission);
    for (const key of Object.keys(template) as (keyof Expedition)[]) {
      const value = game[key],
        example = template[key];
      if (
        typeof example === "number" &&
        (typeof value !== "number" || !Number.isFinite(value))
      )
        return null;
      if (typeof example === "string" && typeof value !== "string") return null;
      if (typeof example === "boolean" && typeof value !== "boolean")
        return null;
      if (
        Array.isArray(example) &&
        (!Array.isArray(value) || value.length > 10000)
      )
        return null;
    }
    if (
      game.structures.some(
        (s) =>
          !s ||
          !(s.kind in STRUCTURES) ||
          !Number.isInteger(s.level) ||
          !STRUCTURES[s.kind].levels[s.level - 1] ||
          !Array.isArray(s.connections) ||
          ![s.x, s.y, s.hp, s.energy, s.progress].every(Number.isFinite),
      )
    )
      return null;
    if (
      game.enemies.some(
        (e) =>
          !e ||
          !(e.kind in ENEMIES) ||
          ![e.x, e.y, e.hp].every(Number.isFinite),
      )
    )
      return null;
    if (
      game.asteroids.some(
        (a) => !a || ![a.x, a.y, a.radius].every(Number.isFinite),
      )
    )
      return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveCheckpoint(game: Expedition): boolean {
  if (!game.started || game.ended) return false;
  try {
    // Keep full simulation precision, including the seeded random generator.
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, savedAt: Date.now(), game }),
    );
    return true;
  } catch {
    return false;
  }
}
export function clearCheckpoint(tag?: string) {
  try {
    if (
      !tag ||
      JSON.parse(localStorage.getItem(KEY) || "null")?.game?.tag === tag
    )
      localStorage.removeItem(KEY);
  } catch {
    /* Storage is optional. */
  }
}
