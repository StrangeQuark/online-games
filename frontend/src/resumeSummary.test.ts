import { expect, it, vi } from "vitest";
import { resumeSummary } from "./resumeSummary";
it("describes an unfinished run while hiding completed or malformed saves", () => {
  let value = '{"phase":"paused","stage":3,"score":12500,"time":90}';
  vi.stubGlobal("localStorage", { getItem: () => value });
  expect(resumeSummary("neonbreak")).toBe("Sector 4 · 12,500 points");
  value = '{"phase":"won","stage":7,"score":25000,"time":300}';
  expect(resumeSummary("neonbreak")).toBeNull();
  value = "broken";
  expect(resumeSummary("neonbreak")).toBeNull();
  expect(resumeSummary("rift")).toBeNull();
  vi.unstubAllGlobals();
});
