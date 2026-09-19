import type { GameId, User } from "./types";
import { games } from "./catalog";

export type QueuedScore = {
  game: GameId;
  score: number;
  outcome: string;
  runId: string;
  expectedUserId: number;
};
const memory = new Map<string, QueuedScore[]>();
const keyFor = (user: User) =>
  `afterhours:score-outbox-v1:${user.id}:${user.username}`;

export function pendingScores(user: User): QueuedScore[] {
  const key = keyFor(user);
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(value)) return memory.get(key) ?? [];
    const valid = value.filter(
      (row): row is QueuedScore =>
        row &&
        typeof row === "object" &&
        row.expectedUserId === user.id &&
        games.some((g) => g.id === row.game) &&
        Number.isInteger(row.score) &&
        row.score >= 0 &&
        row.score <= 100000000 &&
        typeof row.outcome === "string" &&
        /^[A-Za-z0-9 _-]{1,32}$/.test(row.outcome) &&
        typeof row.runId === "string" &&
        /^[A-Za-z0-9_-]{8,80}$/.test(row.runId),
    );
    const merged = new Map(
      [...valid, ...(memory.get(key) ?? [])].map((row) => [row.runId, row]),
    );
    return [...merged.values()];
  } catch {
    return memory.get(key) ?? [];
  }
}
function write(user: User, rows: QueuedScore[]) {
  const key = keyFor(user);
  memory.set(key, rows);
  try {
    if (rows.length) localStorage.setItem(key, JSON.stringify(rows));
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
export function queueScore(user: User, score: QueuedScore) {
  const pending = new Map(pendingScores(user).map((row) => [row.runId, row]));
  pending.set(score.runId, score);
  return write(user, [...pending.values()]);
}
export function acknowledgeScore(user: User, runId: string) {
  write(
    user,
    pendingScores(user).filter((row) => row.runId !== runId),
  );
}
