import { afterEach, it, expect, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("guest history deduplicates run IDs, preserves bests and limits recent history", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const { readGuestBook, recordGuestRound } = await import("./guestScores");
  recordGuestRound("fourfold", 1240, "Won", "same");
  recordGuestRound("fourfold", 1240, "Won", "same");
  expect(readGuestBook().totalGames).toBe(1);
  for (let i = 0; i < 110; i++)
    recordGuestRound("fourfold", 100 + i, "Played", `run-${i}`);
  const book = readGuestBook();
  expect(book.totalGames).toBe(111);
  expect(book.history).toHaveLength(100);
  expect(book.highScores).toEqual([{ game: "fourfold", score: 1240 }]);
});
it("a session scorebook remains usable when persistent storage is unavailable", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  });
  const { readGuestBook, recordGuestRound } = await import("./guestScores");
  expect(recordGuestRound("lumen", 2000, "Solved", "one")).toBe(false);
  expect(readGuestBook().history[0].score).toBe(2000);
});
