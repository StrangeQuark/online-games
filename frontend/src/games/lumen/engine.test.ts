import { describe, it, expect } from "vitest";
import {
  newCircuit,
  connections,
  turnTile,
  maskOf,
  rotate,
  undoTurn,
  pinTile,
  hintTile,
  minimumTurns,
  circuitScore,
  SIZES,
} from "./engine";
describe("Lumen circuit puzzles", () => {
  it("generates twelve distinct solvable networks with no off-board connections", () => {
    const seeds = new Set<number>();
    for (let level = 0; level < 12; level++) {
      let g = newCircuit(level);
      expect(g.size).toBe(SIZES[level]);
      expect(connections(g).powered.size).toBeLessThan(g.tiles.length);
      seeds.add(g.seed);
      for (let i = 0; i < g.tiles.length; i++)
        for (
          let turns = 0;
          turns < 4 && maskOf(g.tiles[i]) !== g.tiles[i].solution;
          turns++
        )
          g = turnTile(g, i);
      expect(g.won, `level ${level + 1}`).toBe(true);
      expect(connections(g).leaks).toBe(0);
      expect(connections(g).powered.size).toBe(g.size * g.size);
      expect(circuitScore(g)).toBeGreaterThan(0);
    }
    expect(seeds.size).toBe(12);
  });
  it("rotates ports clockwise and counter-clockwise and preserves four-way symmetry", () => {
    expect(rotate(1)).toBe(2);
    expect(rotate(1, -1)).toBe(8);
    expect(rotate(5)).toBe(10);
    expect(rotate(15, 3)).toBe(15);
    expect(rotate(11, 4)).toBe(11);
  });
  it("undo restores the prior rotation and a pinned tile cannot be changed", () => {
    let g = newCircuit();
    const before = maskOf(g.tiles[0]);
    g = turnTile(g, 0);
    expect(g.moves).toBe(1);
    g = undoTurn(g);
    expect(g.moves).toBe(0);
    expect(maskOf(g.tiles[0])).toBe(before);
    g = pinTile(g, 0);
    expect(turnTile(g, 0)).toBe(g);
    expect(turnTile(g, g.root)).toBe(g);
  });
  it("a daily seed repeats the same puzzle and hints identify a correction", () => {
    const a = newCircuit(0, 20260919, true),
      b = newCircuit(0, 20260919, true);
    expect(a.tiles).toEqual(b.tiles);
    expect(a.size).toBe(6);
    const i = hintTile(a)!;
    expect(maskOf(a.tiles[i])).not.toBe(a.tiles[i].solution);
    expect(minimumTurns(a)).toBeGreaterThan(0);
  });
});
