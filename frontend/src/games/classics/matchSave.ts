import {
  moveChess,
  newChess,
  type ChessMove,
  type ChessState,
} from "./chessRules";
import {
  moveChecker,
  newCheckers,
  type CheckersState,
  type CheckerMove,
} from "./checkersRules";
type Mode = "computer" | "local";
type SavedMatch<T> = {
  state: T;
  history: T[];
  mode: Mode;
  flipped: boolean;
  roundId: string;
};
type Packet = {
  version: 1;
  mode: Mode;
  flipped: boolean;
  roundId: string;
  moves: ChessMove[];
};
function read(kind: "chess" | "checkers"): Packet | null {
  try {
    const p = JSON.parse(
      localStorage.getItem(`afterhours:${kind}-match-v1`) || "null",
    );
    if (
      !p ||
      p.version !== 1 ||
      !["computer", "local"].includes(p.mode) ||
      typeof p.flipped !== "boolean" ||
      typeof p.roundId !== "string" ||
      !/^[A-Za-z0-9_-]{8,80}$/.test(p.roundId) ||
      !Array.isArray(p.moves) ||
      !p.moves.length ||
      p.moves.length > 1024 ||
      p.moves.some(
        (m: ChessMove) =>
          !m ||
          !Number.isInteger(m.from) ||
          !Number.isInteger(m.to) ||
          m.from < 0 ||
          m.from > 63 ||
          m.to < 0 ||
          m.to > 63 ||
          (m.promotion && !["q", "r", "b", "n"].includes(m.promotion)),
      )
    )
      return null;
    return p;
  } catch {
    return null;
  }
}
export function readChessMatch(): SavedMatch<ChessState> | null {
  const packet = read("chess");
  if (!packet) return null;
  let state = newChess();
  const history: ChessState[] = [];
  for (const move of packet.moves) {
    const next = moveChess(state, move);
    if (!next) return null;
    history.push(state);
    state = next;
  }
  return state.result === "playing" ? { ...packet, state, history } : null;
}
export function readCheckersMatch(): SavedMatch<CheckersState> | null {
  const packet = read("checkers");
  if (!packet) return null;
  let state = newCheckers();
  const history: CheckersState[] = [];
  for (const move of packet.moves) {
    const next = moveChecker(state, move.from, move.to);
    if (!next) return null;
    history.push(state);
    state = next;
  }
  return !state.winner ? { ...packet, state, history } : null;
}
export function saveMatch(
  kind: "chess" | "checkers",
  options: { mode: Mode; flipped: boolean; roundId: string },
  history: { lastMove: ChessMove | CheckerMove | null }[],
  state: { lastMove: ChessMove | CheckerMove | null },
  finished: boolean,
) {
  try {
    const moves = [...history.slice(1), state]
        .map((s) => s.lastMove)
        .filter((m): m is ChessMove | CheckerMove => m !== null),
      key = `afterhours:${kind}-match-v1`;
    if (finished || !history.length || moves.length > 1024) {
      localStorage.removeItem(key);
      return false;
    }
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        ...options,
        moves: moves.map((m) => ({
          from: m.from,
          to: m.to,
          ...("promotion" in m && m.promotion
            ? { promotion: m.promotion }
            : {}),
        })),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
