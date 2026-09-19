import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acknowledgeScore,
  pendingScores,
  queueScore,
  type QueuedScore,
} from "./scoreOutbox";
const user = { id: 101, username: "OutboxTest" },
  other = { id: 102, username: "OtherPlayer" };
const row: QueuedScore = {
  game: "lumen",
  score: 500,
  outcome: "Circuit complete",
  runId: "lumen-round-123",
  expectedUserId: user.id,
};
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  for (const u of [user, other])
    for (const r of pendingScores(u)) acknowledgeScore(u, r.runId);
});
describe("account score recovery", () => {
  it("deduplicates a round, keeps accounts separate, and removes only acknowledged results", () => {
    queueScore(user, row);
    queueScore(user, row);
    queueScore(user, { ...row, runId: "lumen-round-456" });
    expect(pendingScores(user)).toHaveLength(2);
    expect(pendingScores(other)).toEqual([]);
    acknowledgeScore(user, row.runId);
    expect(pendingScores(user).map((r) => r.runId)).toEqual([
      "lumen-round-456",
    ]);
  });
  it("retains in-memory results when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
      removeItem: () => {
        throw Error("blocked");
      },
    });
    expect(queueScore(user, row)).toBe(false);
    expect(pendingScores(user)).toContainEqual(row);
    acknowledgeScore(user, row.runId);
    expect(pendingScores(user)).toEqual([]);
  });
});
