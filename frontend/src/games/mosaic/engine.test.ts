import { describe, it, expect } from "vitest";
import {
  newMosaic,
  slide,
  undoMosaic,
  canMove,
  highest,
  validMosaic,
  snapshot,
  seedFor,
  type MosaicState,
  type Direction,
} from "./engine";
function board(values: number[], size: 4 | 5 = 4): MosaicState {
  const s = newMosaic(size, null, 113);
  s.tiles = values.flatMap((value, pos) =>
    value ? [{ id: pos + 1, pos, value }] : [],
  );
  s.nextId = size ** 2 + 1;
  return s;
}
describe("Mosaic ceramic tile merging", () => {
  it("compresses gaps and merges each pair once, without merging its new tile again", () => {
    const s = board([2, 2, 2, 2]);
    const a = slide(s, "left")!;
    expect(
      a.tiles.filter((t) => t.id !== a.spawned).map((t) => [t.pos, t.value]),
    ).toEqual([
      [0, 4],
      [1, 4],
    ]);
    expect(a.score).toBe(8);
    expect(s.tiles.map((t) => t.value)).toEqual([2, 2, 2, 2]);
    const b = slide(board([2, 2, 4, 0]), "left")!;
    expect(
      b.tiles.filter((t) => t.id !== b.spawned).map((t) => t.value),
    ).toEqual([4, 4]);
    expect(b.score).toBe(4);
    const c = slide(board([2, 0, 0, 2]), "right")!;
    expect(c.tiles.find((t) => t.value === 4)?.pos).toBe(3);
  });
  it("moves and merges in all four directions, including the roomier board", () => {
    for (const size of [4, 5] as const)
      for (const dir of ["left", "right", "up", "down"] as const) {
        const s = board(Array(size ** 2).fill(2), size);
        const a = slide(s, dir)!;
        expect(a.score).toBe(size * Math.floor(size / 2) * 4);
        expect(a.tiles.filter((t) => t.value === 4)).toHaveLength(
          size * Math.floor(size / 2),
        );
        expect(validMosaic(a)).toBe(true);
        expect(new Set(a.tiles.map((t) => t.pos)).size).toBe(a.tiles.length);
      }
  });
  it("leaves an impossible move unchanged, with no extra tile or random roll", () => {
    const s = board([2, 4, 8, 16]);
    expect(slide(s, "left")).toBeNull();
    expect(s.moves).toBe(0);
    expect(s.tiles).toHaveLength(4);
  });
  it("rewinds exactly, including deterministic spawns, with only three rewinds", () => {
    let s = newMosaic(4, "2026-09-19");
    const before = snapshot(s);
    const dir = (["left", "right", "down", "up"] as Direction[]).find((d) =>
      slide(s, d),
    )!;
    const a = slide(s, dir)!;
    s = undoMosaic(a)!;
    expect(snapshot(s)).toEqual(before);
    expect(s.undos).toBe(2);
    expect(snapshot(slide(s, dir)!)).toEqual(snapshot(a));
    s = undoMosaic(slide(s, dir)!)!;
    s = undoMosaic(slide(s, dir)!)!;
    expect(s.undos).toBe(0);
    expect(undoMosaic(slide(s, dir)!)).toBeNull();
  });
  it("recognizes a blocked board, a last merge, and a banked result", () => {
    const s = board([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    expect(canMove(s)).toBe(false);
    for (const d of ["left", "right", "up", "down"] as const)
      expect(slide(s, d)).toBeNull();
    s.tiles[0].value = 4;
    expect(canMove(s)).toBe(true);
    s.ended = true;
    expect(slide(s, "left")).toBeNull();
    expect(undoMosaic(s)).toBeNull();
  });
  it("makes reproducible daily games and rejects damaged saved boards", () => {
    const a = newMosaic(4, "2026-09-19"),
      b = newMosaic(5, "2026-09-19");
    expect(snapshot(a)).toEqual(snapshot(b));
    expect(a.size).toBe(4);
    expect(seedFor("2026-09-20")).not.toBe(seedFor("2026-09-19"));
    expect(validMosaic(a)).toBe(true);
    const bad = structuredClone(a);
    bad.tiles[1].pos = bad.tiles[0].pos;
    expect(validMosaic(bad)).toBe(false);
    bad.tiles[1].pos = (bad.tiles[0].pos + 1) % 16;
    bad.tiles[0].value = 3;
    expect(validMosaic(bad)).toBe(false);
    expect(validMosaic(null as unknown as MosaicState)).toBe(false);
  });
  it("plays long legal games without losing tile mass, duplicating cells, or corrupting saves", () => {
    for (const size of [4, 5] as const) {
      let s = newMosaic(size, null, 1979);
      for (let i = 0; i < 1200; i++) {
        const candidates = (["left", "down", "right", "up"] as const)
          .map((d) => slide(s, d))
          .filter((x): x is MosaicState => Boolean(x));
        if (!candidates.length) break;
        const next = candidates.sort(
          (a, b) =>
            b.gain +
            25 * (size ** 2 - b.tiles.length) -
            (a.gain + 25 * (size ** 2 - a.tiles.length)),
        )[0];
        const mass = (g: MosaicState) =>
          g.tiles.reduce((sum, t) => sum + t.value, 0);
        expect(mass(next) - mass(s)).toBe(
          next.tiles.find((t) => t.id === next.spawned)!.value,
        );
        expect(validMosaic(next)).toBe(true);
        s = next;
      }
      expect(s.moves).toBeGreaterThan(60);
      expect(highest(s)).toBeGreaterThanOrEqual(64);
      expect(s.score).toBeGreaterThan(500);
    }
  });
});
