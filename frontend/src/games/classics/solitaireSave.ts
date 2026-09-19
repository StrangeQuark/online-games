import { suits, type SolitaireState } from "./solitaireRules";
export type SavedDeal = {
  state: SolitaireState;
  undo: SolitaireState[];
  seconds: number;
  dealId: string;
  daily: boolean;
};
const KEY = "afterhours:solitaire-session-v1";
export function validDeal(value: unknown): value is SolitaireState {
  if (!value || typeof value !== "object") return false;
  const s = value as SolitaireState;
  if (
    !Number.isSafeInteger(s.seed) ||
    !Number.isSafeInteger(s.moves) ||
    s.moves < 0 ||
    !Number.isSafeInteger(s.score) ||
    s.score < 0 ||
    typeof s.won !== "boolean" ||
    (s.drawCount !== undefined && s.drawCount !== 1 && s.drawCount !== 3)
  )
    return false;
  if (
    !Array.isArray(s.stock) ||
    !Array.isArray(s.waste) ||
    !Array.isArray(s.foundations) ||
    s.foundations.length !== 4 ||
    !s.foundations.every(Array.isArray) ||
    !Array.isArray(s.tableau) ||
    s.tableau.length !== 7 ||
    !s.tableau.every(Array.isArray)
  )
    return false;
  const cards = [
    ...s.stock,
    ...s.waste,
    ...s.foundations.flat(),
    ...s.tableau.flat(),
  ];
  if (
    cards.length !== 52 ||
    cards.some(
      (card) =>
        !card ||
        !suits.includes(card.suit) ||
        !Number.isInteger(card.rank) ||
        card.rank < 1 ||
        card.rank > 13 ||
        card.id !== `${card.suit}-${card.rank}` ||
        typeof card.faceUp !== "boolean",
    ) ||
    new Set(cards.map((card) => card.id)).size !== 52
  )
    return false;
  if (
    s.stock.some((card) => card.faceUp) ||
    s.waste.some((card) => !card.faceUp) ||
    s.foundations.some((pile) =>
      pile.some(
        (card, i) =>
          !card.faceUp || card.rank !== i + 1 || card.suit !== pile[0].suit,
      ),
    )
  )
    return false;
  return true;
}
export function readDeal(): SavedDeal | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(KEY) || "null",
    ) as SavedDeal | null;
    if (
      !saved ||
      !validDeal(saved.state) ||
      saved.state.won ||
      saved.state.moves === 0 ||
      typeof saved.dealId !== "string" ||
      !saved.dealId ||
      typeof saved.daily !== "boolean" ||
      !Number.isSafeInteger(saved.seconds) ||
      saved.seconds < 0 ||
      !Array.isArray(saved.undo)
    )
      return null;
    return { ...saved, undo: saved.undo.slice(-30).filter(validDeal) };
  } catch {
    return null;
  }
}
export function saveDeal(deal: SavedDeal, ended = false) {
  try {
    if (ended || deal.state.won || !deal.state.moves)
      localStorage.removeItem(KEY);
    else
      localStorage.setItem(
        KEY,
        JSON.stringify({ ...deal, undo: deal.undo.slice(-30) }),
      );
  } catch {
    /* Storage is optional. */
  }
}
