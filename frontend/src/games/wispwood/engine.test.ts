import { describe, it, expect } from "vitest";
import {
  newWisp,
  startWisp,
  updateWisp,
  pauseWisp,
  GROVES,
  groveOf,
} from "./engine";
const idle = { move: 0, jump: false, dash: false };
describe("Wispwood movement", () => {
  it("has responsive buffered jumps, a second jump, and a dash with a cooldown", () => {
    const g = newWisp();
    startWisp(g);
    updateWisp(g, { ...idle, jump: true }, 1 / 60);
    expect(g.vy).toBeLessThan(-500);
    updateWisp(g, idle, 0.05);
    updateWisp(g, { ...idle, jump: true }, 1 / 60);
    expect(g.jumps).toBe(2);
    updateWisp(g, { ...idle, dash: true }, 1 / 60);
    expect(g.dashTime).toBeGreaterThan(0);
    expect(g.vx).toBe(650);
    expect(g.dashCooldown).toBeGreaterThan(0.7);
  });
  it("a checkpoint retains collected lanterns when the player falls", () => {
    const g = newWisp();
    startWisp(g);
    g.checkpoint = { x: 1200, y: 530, platform: 3 };
    g.lanterns = [0];
    g.y = 900;
    updateWisp(g, idle, 1 / 60);
    expect(g.deaths).toBe(1);
    for (let i = 0; i < 40; i++) updateWisp(g, idle, 1 / 60);
    expect(g.x).toBe(1200);
    expect(g.lanterns).toEqual([0]);
  });
  it("pause freezes simulation and the timer", () => {
    const g = newWisp();
    startWisp(g);
    pauseWisp(g);
    updateWisp(g, { move: 1, jump: true, dash: true }, 0.05);
    expect(g.x).toBe(100);
    expect(g.time).toBe(0);
    pauseWisp(g);
    updateWisp(g, idle, 0.05);
    expect(g.time).toBeGreaterThan(0);
  });
  it("every route starts on safe ground and puts its lanterns on reachable platforms", () => {
    for (let i = 0; i < GROVES.length; i++) {
      const g = newWisp(i),
        level = groveOf(g);
      expect(level.lanterns).toHaveLength(3);
      for (const l of level.lanterns) {
        const p = level.platforms[l.platform];
        expect(l.x).toBeGreaterThan(p.x);
        expect(l.x).toBeLessThan(p.x + p.w);
        expect(l.y).toBe(p.y - 37);
      }
      for (let j = 1; j < level.platforms.length; j++) {
        const a = level.platforms[j - 1],
          b = level.platforms[j];
        expect(b.x - a.x - a.w).toBeLessThan(150);
        expect(a.y - b.y).toBeLessThan(a.spring ? 220 : 120);
      }
    }
  });
});
