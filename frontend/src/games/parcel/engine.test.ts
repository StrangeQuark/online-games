import { describe, expect, it, vi } from "vitest";
import { DELIVERIES } from "./levels";
import {
  createDelivery,
  dailyParcel,
  moveParcel,
  solveParcel,
  undoParcel,
  walkPaths,
  scoreDelivery,
} from "./engine";
import { readParcel, saveParcel } from "./save";
describe("Parcel routes", () => {
  it("every authored courtyard can be completed with the advertised par pushes", () => {
    for (const p of DELIVERIES) {
      const route = solveParcel(p, p);
      expect(route, p.title).not.toBeNull();
      let g = createDelivery(p);
      for (const d of route!) g = moveParcel(p, g, d)!;
      expect(g.won, p.title).toBe(true);
      expect(g.pushes).toBe(p.par);
      expect(scoreDelivery(p, g, 0)).toBeGreaterThan(1000);
    }
  });
  it("rejects pushing two parcels or a wall, and undo restores the previous delivery state", () => {
    const p = {
      title: "Test",
      note: "",
      width: 6,
      height: 4,
      walls: [0, 1, 2, 3, 4, 5, 6, 11, 12, 17, 18, 19, 20, 21, 22, 23],
      goals: [15, 16],
      boxes: [8, 9],
      player: 7,
      par: 2,
    };
    const g = createDelivery(p);
    expect(moveParcel(p, g, "right")).toBeNull();
    expect(moveParcel(p, g, "left")).toBeNull();
    const next = moveParcel(p, g, "down")!;
    expect(next.moves).toBe(1);
    expect(undoParcel(p, next)).toEqual(g);
    expect(g.boxes).toEqual([8, 9]);
  });
  it("daily deliveries repeat for a date, vary across dates, and remain solvable", () => {
    const positions = new Set<string>();
    for (let day = 1; day <= 12; day++) {
      const date = `2026-09-${String(day).padStart(2, "0")}`,
        p = dailyParcel(DELIVERIES, date);
      expect(p).toEqual(dailyParcel(DELIVERIES, date));
      const path = solveParcel(p, p)!;
      let g = createDelivery(p);
      for (const d of path) g = moveParcel(p, g, d)!;
      expect(g.won).toBe(true);
      expect(g.pushes).toBe(p.par);
      positions.add(JSON.stringify([p.walls, p.goals, p.boxes, p.player]));
    }
    expect(positions.size).toBeGreaterThan(10);
  });
  it("walk-to paths avoid parcels and never push them", () => {
    const p = DELIVERIES[5],
      g = createDelivery(p);
    for (const [target, path] of walkPaths(p, g)) {
      let next = g;
      for (const d of path) next = moveParcel(p, next, d)!;
      expect(next.player).toBe(target);
      expect(next.pushes).toBe(0);
      expect(next.boxes).toEqual(g.boxes);
    }
  });
  it("keeps a valid route and its undo history across reload", () => {
    let value: string | null = null;
    vi.stubGlobal("localStorage", {
      getItem: () => value,
      setItem: (_: string, v: string) => (value = v),
      removeItem: () => (value = null),
    });
    const p = DELIVERIES[0],
      g = moveParcel(p, createDelivery(p), solveParcel(p, p)![0])!;
    const s = {
      puzzle: p,
      state: g,
      level: 0,
      daily: false,
      date: "2026-09-19",
      id: "test-run-parcel",
      hints: 1,
    };
    saveParcel(s);
    expect(readParcel()).toEqual(s);
    const corrupt = JSON.parse(value!);
    corrupt.state.boxes[0] = corrupt.state.player;
    value = JSON.stringify(corrupt);
    expect(readParcel()).toBeNull();
    vi.unstubAllGlobals();
  });
});
