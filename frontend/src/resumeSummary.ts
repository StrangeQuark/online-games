import type { GameId } from "./types";
const keys: Partial<Record<GameId, string>> = {
  mosaic: "mosaic-session-v1",
  keepsake: "keepsake-session-v1",
  fourfold: "fourfold-session-v1",
  chess: "chess-match-v1",
  checkers: "checkers-match-v1",
  solitaire: "solitaire-session-v1",
  neonbreak: "neonbreak-run-v1",
  lumen: "lumen-v1",
  petal: "petal-session-v1",
  pocketputt: "pocketputt-session-v1",
  wispwood: "wispwood-checkpoint-v1",
  starfall: "starfall-checkpoint-v1",
  parcel: "parcel-session-v1",
};
const count = (v: unknown, max = 1000000): v is number =>
  Number.isInteger(v) && Number(v) >= 0 && Number(v) <= max;
/** Lightweight shelf metadata; each game still validates its full save when opened. */
export function resumeSummary(id: GameId): string | null {
  if (!keys[id]) return null;
  try {
    const s = JSON.parse(
      localStorage.getItem(`afterhours:${keys[id]}`) || "null",
    );
    if (!s || typeof s !== "object") return null;
    switch (id) {
      case "mosaic":
        return s.version === 1 && !s.ended && count(s.moves) && s.moves > 0
          ? `${s.daily ? "Daily mosaic" : s.size === 5 ? "Room to breathe" : "The little studio"} · ${Math.round(s.score || 0).toLocaleString()} points`
          : null;
      case "fourfold":
        return s.state &&
          !s.state.winner &&
          Array.isArray(s.state.moves) &&
          s.state.moves.length > 0
          ? `${s.mode === "local" ? "Pass & play" : "Vs. computer"} · ${s.state.moves.length} discs`
          : null;
      case "keepsake":
        return [12, 24, 48].includes(s.size) &&
          Array.isArray(s.placed) &&
          s.placed.length > 0 &&
          s.placed.length < s.size
          ? `${s.placed.length} of ${s.size} pieces together`
          : null;
      case "chess":
      case "checkers":
        return s.version === 1 && Array.isArray(s.moves) && s.moves.length > 0
          ? `${s.mode === "local" ? "Pass & play" : "Vs. computer"} · ${s.moves.length} ${s.moves.length === 1 ? "move" : "moves"}`
          : null;
      case "solitaire":
        return s.state &&
          !s.state.won &&
          count(s.state.moves) &&
          s.state.moves > 0
          ? `${s.state.drawCount === 3 ? "Draw three" : "Draw one"} · ${s.state.moves} moves`
          : null;
      case "neonbreak":
        return ["playing", "paused", "ready", "between"].includes(s.phase) &&
          count(s.stage, 7) &&
          s.time > 0
          ? `Sector ${s.stage + 1} · ${Math.max(0, Math.round(s.score || 0)).toLocaleString()} points`
          : null;
      case "lumen":
        return s.active && count(s.active.level, 11) && s.active.moves > 0
          ? `${s.active.daily ? "Daily circuit" : `Garden ${s.active.level + 1}`} · ${s.active.moves} turns`
          : null;
      case "petal":
        return !s.ended && !s.won && count(s.level, 7) && s.turns > 0
          ? `${s.zen ? "Zen garden" : `Garden ${s.level + 1}`} · ${s.turns} swaps`
          : null;
      case "pocketputt":
        return ["aiming", "sunk"].includes(s.phase) &&
          count(s.hole, 8) &&
          (s.strokes > 0 || s.results?.length > 0)
          ? `Hole ${s.hole + 1} · ${s.daily ? "Daily course" : "Garden round"}`
          : null;
      case "wispwood":
        return ["playing", "paused", "clear"].includes(s.phase) &&
          count(s.level, 7) &&
          s.totalTime > 0
          ? `Grove ${s.level + 1} · ${Array.isArray(s.lanterns) ? s.lanterns.length : 0} of 3 lights`
          : null;
      case "starfall":
        return s.version === 1 && s.game?.started && !s.game.ended
          ? `${s.game.mode === "campaign" && count(s.game.mission, 8) ? `Mission ${s.game.mission + 1}` : "Expedition"} · Outpost saved`
          : null;
      case "parcel":
        return s.state &&
          !s.state.won &&
          count(s.level, 11) &&
          s.state.moves > 0
          ? `${s.daily ? "Daily delivery" : `Delivery ${s.level + 1}`} · ${s.state.pushes} pushes`
          : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
