import { beforeEach, expect, it, vi } from "vitest";
import {
  newChess,
  moveChess,
  legalChessMoves,
  type ChessState,
} from "./chessRules";
import {
  newCheckers,
  moveChecker,
  legalCheckerMoves,
  type CheckersState,
} from "./checkersRules";
import { saveMatch, readChessMatch, readCheckersMatch } from "./matchSave";
const meta = {
  mode: "local" as const,
  flipped: true,
  roundId: "match-save-test-123",
};
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
});
it("replays saved chess moves with exact castling rights, en passant and takeback history", () => {
  let state = newChess();
  const history: ChessState[] = [];
  for (const [from, to] of [
    [52, 36],
    [8, 16],
    [36, 28],
    [11, 27],
  ]) {
    history.push(state);
    state = moveChess(state, { from, to })!;
  }
  expect(saveMatch("chess", meta, history, state, false)).toBe(true);
  const loaded = readChessMatch()!;
  expect(loaded.state).toEqual(state);
  expect(loaded.history).toEqual(history);
  expect(legalChessMoves(loaded.state, 28).some((m) => m.enPassant)).toBe(true);
  expect(loaded.flipped).toBe(true);
  expect(loaded.mode).toBe("local");
});
it("replays legal checkers movement and rejects a corrupted move trail", () => {
  let state = newCheckers();
  const history: CheckersState[] = [];
  for (let i = 0; i < 12; i++) {
    const m = legalCheckerMoves(state)[0];
    history.push(state);
    state = moveChecker(state, m.from, m.to)!;
  }
  saveMatch("checkers", meta, history, state, false);
  expect(readCheckersMatch()?.state).toEqual(state);
  expect(readCheckersMatch()?.history).toEqual(history);
  const packet = JSON.parse(storage.get("afterhours:checkers-match-v1")!);
  packet.moves[0] = { from: 0, to: 63 };
  storage.set("afterhours:checkers-match-v1", JSON.stringify(packet));
  expect(readCheckersMatch()).toBeNull();
});
it("clears finished rounds and treats disabled storage as optional", () => {
  const state = newChess(),
    next = moveChess(state, { from: 52, to: 36 })!;
  saveMatch("chess", meta, [state], next, false);
  expect(readChessMatch()).not.toBeNull();
  saveMatch("chess", meta, [state], next, true);
  expect(readChessMatch()).toBeNull();
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error();
    },
    setItem: () => {
      throw Error();
    },
  });
  expect(readChessMatch()).toBeNull();
  expect(saveMatch("chess", meta, [state], next, false)).toBe(false);
});
