import { describe, it, expect } from "vitest";
import {
  newFour,
  dropDisc,
  chooseDrop,
  landing,
  validateFour,
  reconstruct,
} from "./engine";
describe("Fourfold rules and opponent", () => {
  it("drops into the lowest empty slot and rejects full columns", () => {
    let g = newFour();
    for (let i = 0; i < 6; i++) g = dropDisc(g, 2)!;
    expect(landing(g.board, 2)).toBe(-1);
    expect(dropDisc(g, 2)).toBeNull();
    expect(dropDisc(g, -1)).toBeNull();
    expect(g.moves.length).toBe(6);
  });
  it("detects horizontal and vertical lines without allowing play after a win", () => {
    for (const sequence of [
      [0, 6, 1, 6, 2, 5, 3],
      [0, 1, 0, 1, 0, 2, 0],
    ]) {
      const g = reconstruct(sequence);
      expect(g.winner).toBe(1);
      expect(g.line.length).toBeGreaterThanOrEqual(4);
      expect(dropDisc(g, 4)).toBeNull();
    }
  });
  it("detects a diagonal and preserves the original state on a move", () => {
    const original = newFour(),
      g = reconstruct([0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3]);
    expect(g.winner).toBe(1);
    expect(g.line).toContain(17);
    dropDisc(original, 3);
    expect(original.board.every((v) => v === 0)).toBe(true);
  });
  it("the computer takes wins and blocks immediate losses", () => {
    const winning = reconstruct([0, 6, 1, 6, 2, 5]);
    expect(chooseDrop(winning, 3)).toBe(3);
    const threatened = reconstruct([6, 0, 6, 1, 5, 2]);
    expect(chooseDrop(threatened, 3)).toBe(3);
  });
  it("incoming state must reconstruct from its actual legal move history", () => {
    const g = reconstruct([3, 2, 3, 2]);
    expect(validateFour(g)).toBe(true);
    expect(validateFour({ ...g, turn: 2 })).toBe(false);
    expect(validateFour({ ...g, board: Array(42).fill(1) })).toBe(false);
    expect(validateFour({ moves: [8] })).toBe(false);
  });
  it("two computer players finish a legal game without mutating their inputs", () => {
    let g = newFour();
    for (let move = 0; move < 42 && !g.winner; move++) {
      const before = structuredClone(g),
        column = chooseDrop(g, 3)!;
      expect(g).toEqual(before);
      g = dropDisc(g, column)!;
    }
    expect(g.winner).not.toBeNull();
    expect(validateFour(g)).toBe(true);
  });
});
