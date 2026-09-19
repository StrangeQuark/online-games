import { describe, it, expect } from "vitest";
import {
  newGarden,
  matches,
  legalSwaps,
  swapGarden,
  chooseSwap,
  GARDENS,
  SIZE,
  type Gem,
} from "./engine";
describe("Petal gardens", () => {
  it("every garden begins settled, with legal moves and distinct tokens", () => {
    for (let i = 0; i < GARDENS.length; i++) {
      const g = newGarden(i);
      expect(matches(g.board)).toHaveLength(0);
      expect(legalSwaps(g.board).length).toBeGreaterThan(0);
      expect(new Set(g.board.map((gem) => gem!.id)).size).toBe(SIZE * SIZE);
    }
  });
  it("rejects invalid swaps without consuming turns or changing the board", () => {
    const g = newGarden();
    expect(swapGarden(g, 0, 48).state).toBe(g);
    const legal = legalSwaps(g.board);
    let pair: [number, number] = [0, 1];
    for (let i = 0; i < 48; i++)
      if (
        i % SIZE !== 6 &&
        !legal.some((m) => m.from === i && m.to === i + 1)
      ) {
        pair = [i, i + 1];
        break;
      }
    const result = swapGarden(g, ...pair);
    expect(result.valid).toBe(false);
    expect(result.state).toBe(g);
    expect(result.frames.length).toBe(2);
  });
  it("a real match collects objectives, scores, falls, and settles without duplicate gems", () => {
    const g = newGarden(),
      move = chooseSwap(g)!;
    const result = swapGarden(g, move.from, move.to);
    expect(result.valid).toBe(true);
    expect(result.state.moves).toBe(g.moves - 1);
    expect(result.state.score).toBeGreaterThan(0);
    expect(matches(result.state.board)).toHaveLength(0);
    expect(result.state.board.every(Boolean)).toBe(true);
    expect(new Set(result.state.board.map((gem) => gem!.id)).size).toBe(49);
    expect(result.frames.some((f) => f.clear.length >= 3)).toBe(true);
  });
  it("matching four creates a special, which clears a complete row when triggered", () => {
    const g = newGarden();
    const board = g.board as Gem[];
    // A horizontal run of four is created by swapping the third flower upward.
    board[0] = { id: 101, kind: 0 };
    board[1] = { id: 102, kind: 0 };
    board[2] = { id: 103, kind: 1 };
    board[3] = { id: 104, kind: 0 };
    board[4] = { id: 105, kind: 2 };
    board[9] = { id: 110, kind: 0 };
    const result = swapGarden(g, 9, 2);
    expect(result.valid).toBe(true);
    expect(
      result.frames.some((f) => f.board.some((gem) => gem?.special === "row")),
    ).toBe(true);
    const b = newGarden();
    b.board[0] = { ...b.board[0]!, special: "row" };
    b.board[1] = { ...b.board[1]!, special: "column" };
    const cross = swapGarden(b, 0, 1);
    expect(cross.valid).toBe(true);
    expect(cross.frames.some((f) => f.clear.length >= 13)).toBe(true);
  });
  it("the opening garden is beatable through legal goal-seeking swaps", () => {
    let g = newGarden();
    while (!g.ended) {
      const move = chooseSwap(g)!;
      g = swapGarden(g, move.from, move.to).state;
    }
    expect(g.won).toBe(true);
    expect(g.score).toBeGreaterThan(1000);
  });
  it("zen keeps generating playable boards without a move limit", () => {
    let g = newGarden(0, true);
    for (let i = 0; i < 150; i++) {
      const move = chooseSwap(g)!;
      expect(move).not.toBeNull();
      g = swapGarden(g, move.from, move.to).state;
      expect(matches(g.board)).toHaveLength(0);
    }
    expect(g.ended).toBe(false);
    expect(g.turns).toBe(150);
    expect(g.score).toBeGreaterThan(10000);
  });
});

it("all eight authored gardens are winnable through legal goal-seeking swaps", () => {
  for (let level = 0; level < GARDENS.length; level++) {
    let g = newGarden(level);
    while (!g.ended) {
      const move = chooseSwap(g)!;
      g = swapGarden(g, move.from, move.to).state;
    }
    expect(g.won, `garden ${level + 1}`).toBe(true);
  }
});
