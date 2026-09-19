import { describe, expect, it, vi } from "vitest";
import {
  SCENES,
  SIZES,
  newKeepsake,
  placeKeepsake,
  complete,
  keepsakeScore,
  pieceEdges,
  dimensions,
  validKeepsake,
  readKeepsake,
  saveKeepsake,
} from "./engine";
describe("Keepsake jigsaws", () => {
  it("every picture and size assembles exactly once in a shuffled order", () => {
    for (let scene = 0; scene < SCENES.length; scene++)
      for (const size of SIZES) {
        let g = newKeepsake(scene, size, 123);
        expect(g.order).not.toEqual([...g.order].sort((a, b) => a - b));
        for (const piece of g.order) {
          g = placeKeepsake(g, piece, piece, "courier")!;
          expect(validKeepsake(g)).toBe(true);
        }
        expect(complete(g)).toBe(true);
        expect(g.contributions.courier).toBe(size);
        expect(keepsakeScore(g)).toBe(1000 + size * 60);
        expect(placeKeepsake(g, 0, 0)).toBeNull();
      }
  });
  it("neighboring shapes are complementary and outside borders stay flat", () => {
    for (const size of SIZES) {
      const { cols, rows } = dimensions(size);
      for (let i = 0; i < size; i++) {
        const e = pieceEdges(size, i);
        if (i % cols === 0) expect(e.left).toBe(0);
        else expect(e.left).toBe(-pieceEdges(size, i - 1).right);
        if (i < cols) expect(e.top).toBe(0);
        else expect(e.top).toBe(-pieceEdges(size, i - cols).bottom);
        if (i % cols === cols - 1) expect(e.right).toBe(0);
        if (Math.floor(i / cols) === rows - 1) expect(e.bottom).toBe(0);
      }
    }
  });
  it("wrong drops never place a piece; independent peers can contribute without duplicate credit", () => {
    let g = newKeepsake();
    g = placeKeepsake(g, 3, 4, "a")!;
    expect(g.placed).toEqual([]);
    expect(g.mistakes).toBe(1);
    g = placeKeepsake(g, 3, 3, "a")!;
    expect(placeKeepsake(g, 3, 3, "b")).toBeNull();
    g = placeKeepsake(g, 4, 4, "b")!;
    expect(g.contributions).toEqual({ a: 1, b: 1 });
    expect(validKeepsake({ ...g, placed: [3, 3] })).toBe(false);
  });
  it("saves only unfinished puzzles and rejects malformed snapshots", () => {
    let value: string | null = null;
    vi.stubGlobal("localStorage", {
      getItem: () => value,
      setItem: (_: string, v: string) => (value = v),
      removeItem: () => (value = null),
    });
    let g = newKeepsake();
    g = placeKeepsake(g, 0, 0)!;
    saveKeepsake(g);
    expect(readKeepsake()).toEqual(g);
    value = '{"size":999}';
    expect(readKeepsake()).toBeNull();
    for (let i = 1; i < g.size; i++) g = placeKeepsake(g, i, i)!;
    saveKeepsake(g);
    expect(readKeepsake()).toBeNull();
    vi.unstubAllGlobals();
  });
});
