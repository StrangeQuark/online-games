import { describe, it, expect } from "vitest";
import {
  newGolf,
  currentHole,
  putt,
  updateGolf,
  mulligan,
  nextHole,
  previewPutt,
  dailyOrder,
  HOLES,
  type Golf,
} from "./engine";
function settle(g: Golf) {
  for (let i = 0; i < 1500 && g.phase === "rolling"; i++) updateGolf(g, 1 / 60);
  return g;
}
function aim(g: Golf, target: { x: number; y: number }, power: number) {
  putt(g, Math.atan2(target.y - g.ball.y, target.x - g.ball.x), power);
  return settle(g);
}
describe("Pocket Putt physics", () => {
  it("rolls, slows to a stop, and permits a limited mulligan", () => {
    const g = newGolf();
    putt(g, 0, 0.1);
    expect(g.phase).toBe("rolling");
    settle(g);
    expect(g.phase).toBe("aiming");
    expect(g.ball.x).toBeGreaterThan(160);
    expect(g.strokes).toBe(1);
    expect(mulligan(g)).toBe(true);
    expect(g.ball).toEqual(currentHole(g).start);
    expect(g.strokes).toBe(0);
    expect(g.mulligans).toBe(2);
    expect(mulligan(g)).toBe(false);
  });
  it("solid rails and walls prevent tunneling at full power", () => {
    const g = newGolf();
    g.hole = 1;
    g.ball = { ...currentHole(g).start };
    putt(g, 0, 1);
    for (let i = 0; i < 8; i++) updateGolf(g, 0.05);
    expect(g.ball.x).toBeLessThan(420);
    settle(g);
    expect(g.ball.x).toBeGreaterThanOrEqual(58);
    expect(g.ball.x).toBeLessThanOrEqual(842);
  });
  it("a splash restores the previous lie with one penalty stroke", () => {
    const g = newGolf();
    g.hole = 3;
    g.ball = { ...currentHole(g).start };
    aim(g, currentHole(g).cup, 0.7);
    expect(g.waterPenalty).toBe(1);
    expect(g.strokes).toBe(2);
    expect(g.ball).toEqual(currentHole(g).start);
  });
  it("a slow putt is captured by the cup and advances with its score intact", () => {
    const g = newGolf(),
      h = currentHole(g);
    g.ball = { x: h.cup.x - 55, y: h.cup.y };
    aim(g, h.cup, 0.13);
    expect(g.phase).toBe("sunk");
    expect(g.results).toEqual([1]);
    expect(g.score).toBeGreaterThan(1000);
    nextHole(g);
    expect(g.hole).toBe(1);
    expect(g.strokes).toBe(0);
    expect(g.results).toEqual([1]);
  });
  it("preview follows real physics without changing the real ball, strokes, or score", () => {
    const g = newGolf(),
      before = structuredClone(g);
    expect(previewPutt(g, 0.3, 0.5).length).toBeGreaterThan(10);
    expect(g).toEqual(before);
  });
  it("daily order is stable and covers all nine gardens", () => {
    expect(dailyOrder(20260919)).toEqual(dailyOrder(20260919));
    expect(new Set(dailyOrder(20260919)).size).toBe(HOLES.length);
    expect(dailyOrder(20260919)).not.toEqual(dailyOrder(20260920));
  });
});

it("the same bank shot has the same outcome at 30, 60, and 144 Hz", () => {
  const shots = [30, 60, 144].map((hz) => {
    const g = newGolf();
    g.hole = 1;
    g.ball = { ...currentHole(g).start };
    putt(g, 0.5890486225480862, 0.7);
    for (let i = 0; i < hz * 15 && g.phase === "rolling"; i++)
      updateGolf(g, 1 / hz);
    return g;
  });
  for (const g of shots) {
    expect(g.phase).toBe("sunk");
    expect(g.ball).toEqual(currentHole(g).cup);
    expect(g.score).toBe(shots[0].score);
  }
});
