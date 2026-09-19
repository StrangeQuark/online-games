import { describe, it, expect } from "vitest";
import {
  newBreaker,
  launch,
  stepBreaker,
  collectPower,
  nextStage,
  togglePause,
  makeBricks,
  STAGES,
  PADDLE_Y,
} from "./engine";

describe("Neon Break", () => {
  it("starts every authored sector with bounded destructible bricks", () => {
    const layouts = new Set<string>();
    for (let stage = 0; stage < STAGES.length; stage++) {
      const bricks = makeBricks(stage);
      expect(bricks.length).toBeGreaterThan(25);
      expect(
        bricks.every(
          (b) =>
            b.x > 0 &&
            b.x + b.w < 900 &&
            b.y > 40 &&
            b.y + b.h < 400 &&
            b.hp > 0,
        ),
      ).toBe(true);
      layouts.add(JSON.stringify(bricks.map((b) => [b.x, b.y, b.hp, b.blast])));
    }
    expect(layouts.size).toBe(STAGES.length);
  });
  it("launches, reflects off a brick without tunneling, and adds score", () => {
    const g = newBreaker("classic", 123);
    launch(g);
    const brick = g.bricks[0];
    const b = g.balls[0];
    b.x = brick.x + brick.w / 2;
    b.y = brick.y + brick.h + 10;
    b.vx = 0;
    b.vy = -500;
    stepBreaker(g, 0.05);
    expect(brick.hp).toBe(0);
    expect(g.score).toBeGreaterThan(0);
    expect(b.vy).toBeGreaterThan(0);
  });
  it("paddle edge changes direction and a miss consumes exactly one life", () => {
    const g = newBreaker();
    launch(g);
    const b = g.balls[0];
    b.x = g.paddle + 40;
    b.y = PADDLE_Y - 12;
    b.vx = 0;
    b.vy = 400;
    stepBreaker(g, 0.04);
    expect(b.vx).toBeGreaterThan(100);
    expect(b.vy).toBeLessThan(0);
    b.y = 650;
    stepBreaker(g, 0.016);
    expect(g.lives).toBe(2);
    expect(g.phase).toBe("ready");
    stepBreaker(g, 0.05);
    expect(g.lives).toBe(2);
    expect(g.balls).toHaveLength(1);
  });
  it("powerups add bounded multiball and a safety net intercepts a miss", () => {
    const g = newBreaker();
    launch(g);
    collectPower(g, "multi");
    expect(g.balls).toHaveLength(3);
    for (let i = 0; i < 10; i++) collectPower(g, "multi");
    expect(g.balls).toHaveLength(6);
    collectPower(g, "shield");
    const b = g.balls[0];
    b.y = 601;
    b.vy = 400;
    stepBreaker(g, 0.01);
    expect(g.shields).toBe(0);
    expect(b.vy).toBeLessThan(0);
    expect(g.lives).toBe(3);
  });
  it("pause freezes physics and a cleared sector grants progression", () => {
    const g = newBreaker();
    launch(g);
    togglePause(g);
    const position = g.balls[0].y;
    stepBreaker(g, 0.05);
    expect(g.balls[0].y).toBe(position);
    togglePause(g);
    for (const b of g.bricks) b.hp = 0;
    stepBreaker(g, 0.01);
    expect(g.phase).toBe("between");
    nextStage(g);
    expect(g.stage).toBe(1);
    expect(g.lives).toBe(4);
    expect(g.phase).toBe("ready");
    expect(g.bricks.some((b) => b.blast)).toBe(true);
  });
  it("sustained auto-paddle play clears a real sector through physics", () => {
    const g = newBreaker("chill", 86);
    launch(g);
    for (
      let i = 0;
      i < 60 * 300 &&
      g.stage === 0 &&
      g.phase !== "between" &&
      g.phase !== "over";
      i++
    ) {
      const b = g.balls[0];
      if (b) g.target = b.x + Math.sin(g.time * 0.7) * 27;
      if (g.phase === "ready") launch(g);
      stepBreaker(g, 1 / 60);
    }
    expect(g.phase).toBe("between");
    expect(g.score).toBeGreaterThan(4000);
  });
});

it.each(["chill", "classic", "expert"] as const)(
  "a complete %s campaign clears all eight sectors through legal paddle movement",
  (difficulty) => {
    const g = newBreaker(difficulty, 86);
    launch(g);
    for (
      let frame = 0;
      frame < 60 * 1200 && g.phase !== "won" && g.phase !== "over";
      frame++
    ) {
      const b =
        g.balls.filter((b) => b.vy > 0).sort((a, b) => b.y - a.y)[0] ??
        g.balls[0];
      if (b) g.target = b.x + Math.sin(g.time * 0.7) * 27;
      if (g.phase === "ready") launch(g);
      if (g.phase === "between") {
        nextStage(g);
        launch(g);
      }
      stepBreaker(g, 1 / 60);
    }
    expect(g.phase).toBe("won");
    expect(g.stage).toBe(7);
    expect(g.score).toBeGreaterThan(70000);
  },
);
