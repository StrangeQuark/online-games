import { it, expect } from "vitest";
import { newSolitaire, drawStock } from "./solitaireRules";
import { validDeal } from "./solitaireSave";
it("accepts actual deals and rejects duplicate cards or corrupt foundation sequences", () => {
  const g = drawStock(newSolitaire(42, 3))!;
  expect(validDeal(g)).toBe(true);
  const duplicate = structuredClone(g);
  duplicate.stock[0] = duplicate.stock[1];
  expect(validDeal(duplicate)).toBe(false);
  const invalid = structuredClone(g);
  invalid.foundations[0].push(invalid.waste.pop()!);
  expect(validDeal(invalid)).toBe(false);
  expect(validDeal({ stock: [] })).toBe(false);
});
