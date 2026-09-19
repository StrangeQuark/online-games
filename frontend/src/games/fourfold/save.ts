import { validateFour, type FourState } from "./engine";
const KEY = "afterhours:fourfold-session-v1";
type Match = { state: FourState; mode: "computer" | "local"; roundId: string };
export function readFourMatch(): Match | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s &&
      validateFour(s.state) &&
      !s.state.winner &&
      s.state.moves.length > 0 &&
      ["computer", "local"].includes(s.mode) &&
      typeof s.roundId === "string" &&
      /^[A-Za-z0-9_-]{8,80}$/.test(s.roundId)
      ? s
      : null;
  } catch {
    return null;
  }
}
export function saveFourMatch(match: Match) {
  try {
    if (match.state.winner || !match.state.moves.length) {
      localStorage.removeItem(KEY);
      return false;
    }
    localStorage.setItem(KEY, JSON.stringify(match));
    return true;
  } catch {
    return false;
  }
}
