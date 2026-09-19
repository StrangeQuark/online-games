import { expect, it, vi } from "vitest";
import { newBreaker, launch, stepBreaker } from "./engine";
import { readBreaker, saveBreaker } from "./save";
it("resumes the precise balls, bricks, powers and score while paused, rejecting corrupted saves", () => {
  let value: string | null = null;
  vi.stubGlobal("localStorage", {
    getItem: () => value,
    setItem: (_: string, v: string) => (value = v),
    removeItem: () => (value = null),
  });
  const g = newBreaker("chill", 87);
  launch(g);
  for (let i = 0; i < 100; i++) stepBreaker(g, 1 / 60);
  saveBreaker(g);
  const loaded = readBreaker()!;
  expect(loaded.phase).toBe("paused");
  expect(loaded.balls.map((b) => [b.x, b.y, b.vx, b.vy])).toEqual(
    g.balls.map((b) => [b.x, b.y, b.vx, b.vy]),
  );
  expect(loaded.bricks.map((b) => b.hp)).toEqual(g.bricks.map((b) => b.hp));
  value = value!.replace('"lives":5', '"lives":-1');
  expect(readBreaker()).toBeNull();
  g.phase = "over";
  saveBreaker(g);
  expect(readBreaker()).toBeNull();
  vi.unstubAllGlobals();
});
