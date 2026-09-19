import { COURSES, type CourseId, type Drive, type Trace } from "./engine";
export type RecordRun = { time: number; score: number; trace: Trace[] };
export type Records = Partial<Record<CourseId, RecordRun>>;
export function readRecords(): Records {
  try {
    const value = JSON.parse(
        localStorage.getItem("afterhours:driftline-records-v1") || "{}",
      ),
      out: Records = {};
    for (const c of COURSES) {
      const v = value[c.id];
      if (
        v &&
        Number.isFinite(v.time) &&
        v.time > 0 &&
        Number.isFinite(v.score) &&
        v.score >= 0 &&
        Array.isArray(v.trace) &&
        v.trace.length <= 3000 &&
        v.trace.every(
          (p: Trace, i: number) =>
            p &&
            Number.isFinite(p.t) &&
            Number.isFinite(p.z) &&
            Number.isFinite(p.x) &&
            p.z >= 0 &&
            Math.abs(p.x) <= 2 &&
            (i === 0 || p.t > v.trace[i - 1].t),
        )
      )
        out[c.id] = v;
    }
    return out;
  } catch {
    return {};
  }
}
export function recordDrive(records: Records, g: Drive) {
  if (g.phase !== "finished" || g.mode !== "trial") return records;
  const previous = records[g.course];
  if (previous && previous.time <= g.elapsed) return records;
  const next = {
    ...records,
    [g.course]: {
      time: g.elapsed,
      score: Math.floor(g.score),
      trace: g.trace.map((p) => ({ ...p })),
    },
  };
  try {
    localStorage.setItem(
      "afterhours:driftline-records-v1",
      JSON.stringify(next),
    );
  } catch {}
  return next;
}
