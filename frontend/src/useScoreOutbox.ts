import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "./types";
import { api } from "./api";
import {
  acknowledgeScore,
  pendingScores,
  queueScore,
  type QueuedScore,
} from "./scoreOutbox";

export function useScoreOutbox(user: User | null) {
  const [status, setStatus] = useState(""),
    [failed, setFailed] = useState(false),
    [count, setCount] = useState(0);
  const current = useRef(user),
    saving = useRef(new Set<number>()),
    durable = useRef(true);
  current.current = user;
  const save = useCallback(async () => {
    const owner = current.current;
    if (!owner || saving.current.has(owner.id)) return;
    const rows = pendingScores(owner);
    if (!rows.length) return;
    saving.current.add(owner.id);
    setFailed(false);
    setCount(rows.length);
    setStatus("Saving your round…");
    let message = "";
    try {
      const attempted = new Set<string>();
      for (;;) {
        const row = pendingScores(owner).find(
          (item) => !attempted.has(item.runId),
        );
        if (!row) break;
        attempted.add(row.runId);
        if (current.current?.id !== owner.id) break;
        try {
          await api("/scores", row);
          acknowledgeScore(owner, row.runId);
        } catch (error) {
          message = (error as Error).message;
        }
      }
      if (current.current?.id !== owner.id) return;
      const left = pendingScores(owner).length;
      setCount(left);
      setFailed(left > 0);
      setStatus(
        left
          ? `${message} ${left} round(s) waiting to save. ${durable.current ? "Kept on this device until you reconnect." : "Keep this tab open to retry."}`
          : "Round saved to your player page.",
      );
    } finally {
      saving.current.delete(owner.id);
    }
  }, []);
  const enqueue = useCallback(
    (row: Omit<QueuedScore, "expectedUserId">) => {
      const owner = current.current;
      if (!owner) return;
      durable.current = queueScore(owner, { ...row, expectedUserId: owner.id });
      void save();
    },
    [save],
  );
  useEffect(() => {
    setStatus("");
    setFailed(false);
    setCount(user ? pendingScores(user).length : 0);
    if (user) void save();
    const retry = () => {
      if (navigator.onLine) void save();
    };
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [user?.id, save]);
  return { status, failed, count, save, enqueue };
}
export type ScoreOutbox = ReturnType<typeof useScoreOutbox>;
