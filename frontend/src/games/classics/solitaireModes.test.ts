import { describe, expect, it } from "vitest";
import { drawStock, newSolitaire } from "./solitaireRules";

describe("draw-three solitaire", () => {
  it("turns three cards in stock order and recycles the exact deck without losing cards", () => {
    let state = newSolitaire(42, 3);
    const stock = state.stock.map((c) => c.id);
    state = drawStock(state)!;
    expect(state.waste.map((c) => c.id)).toEqual(stock.slice(-3).reverse());
    expect(state.stock).toHaveLength(21);
    for (let i = 0; i < 7; i++) state = drawStock(state)!;
    expect(state.stock).toHaveLength(0);
    expect(state.waste).toHaveLength(24);
    state = drawStock(state)!;
    expect(state.stock.map((c) => c.id)).toEqual(stock);
    expect(state.waste).toHaveLength(0);
    expect(state.stock.every((c) => !c.faceUp)).toBe(true);
    expect(
      new Set([...state.stock, ...state.tableau.flat()].map((c) => c.id)).size,
    ).toBe(52);
  });
  it("draws a short final packet and keeps default draw-one behavior", () => {
    const state = newSolitaire(42, 3);
    const short = { ...state, stock: state.stock.slice(0, 2) };
    expect(drawStock(short)!.waste).toHaveLength(2);
    expect(drawStock(newSolitaire(42))!.waste).toHaveLength(1);
  });
});
