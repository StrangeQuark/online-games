import { games } from "./catalog";
import type { GameId } from "./types";
export type GuestRound = {
  id: number;
  runId: string;
  game: GameId;
  score: number;
  outcome: string;
  playedAt: string;
};
export type GuestBook = {
  totalGames: number;
  history: GuestRound[];
  highScores: { game: GameId; score: number }[];
  recentIds: string[];
};
const KEY = "afterhours:guest-scorebook-v1";
let memory: GuestBook = {
  totalGames: 0,
  history: [],
  highScores: [],
  recentIds: [],
};
const known = (value: unknown): value is GameId =>
  games.some((g) => g.id === value);
export function readGuestBook(): GuestBook {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!value) return memory;
    if (
      !Number.isSafeInteger(value.totalGames) ||
      value.totalGames < 0 ||
      !Array.isArray(value.history) ||
      !Array.isArray(value.highScores) ||
      !Array.isArray(value.recentIds)
    )
      return memory;
    const history = value.history
      .filter(
        (row: GuestRound) =>
          row &&
          known(row.game) &&
          Number.isSafeInteger(row.id) &&
          row.id > 0 &&
          Number.isSafeInteger(row.score) &&
          row.score >= 0 &&
          typeof row.runId === "string" &&
          typeof row.outcome === "string" &&
          typeof row.playedAt === "string" &&
          Number.isFinite(Date.parse(row.playedAt)),
      )
      .slice(0, 100);
    const highScores = value.highScores.filter(
      (row: { game: unknown; score: number }) =>
        row &&
        known(row.game) &&
        Number.isSafeInteger(row.score) &&
        row.score >= 0,
    );
    memory = {
      totalGames: value.totalGames,
      history,
      highScores,
      recentIds: value.recentIds
        .filter((id: unknown) => typeof id === "string")
        .slice(-1000),
    };
    return memory;
  } catch {
    return memory;
  }
}
export function recordGuestRound(
  game: GameId,
  score: number,
  outcome: string,
  runId: string,
): boolean {
  const book = readGuestBook();
  if (book.recentIds.includes(runId)) return true;
  const safeScore = Math.max(0, Math.round(score)),
    best = book.highScores.find((row) => row.game === game);
  const highScores = book.highScores.filter((row) => row.game !== game);
  highScores.push({ game, score: Math.max(safeScore, best?.score ?? 0) });
  memory = {
    totalGames: book.totalGames + 1,
    history: [
      {
        id: book.totalGames + 1,
        runId,
        game,
        score: safeScore,
        outcome: outcome.slice(0, 100),
        playedAt: new Date().toISOString(),
      },
      ...book.history,
    ].slice(0, 100),
    highScores,
    recentIds: [...book.recentIds, runId].slice(-1000),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
    return true;
  } catch {
    return false;
  }
}
