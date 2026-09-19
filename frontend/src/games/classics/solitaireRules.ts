export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Card = { id: string; suit: Suit; rank: number; faceUp: boolean };
export type CardSource = {
  zone: "tableau" | "waste" | "foundation";
  pile: number;
  index: number;
};
export type CardTarget = { zone: "tableau" | "foundation"; pile: number };
export type SolitaireState = {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  moves: number;
  score: number;
  seed: number;
  won: boolean;
  drawCount?: 1 | 3;
};
export const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const isRed = (card: Card) =>
  card.suit === "hearts" || card.suit === "diamonds";
export const cardName = (card: Card) =>
  `${({ 1: "Ace", 11: "Jack", 12: "Queen", 13: "King" } as Record<number, string>)[card.rank] || card.rank} of ${card.suit}`;

export function newSolitaire(
  seed = Math.floor(Math.random() * 0x7fffffff),
  drawCount: 1 | 3 = 1,
): SolitaireState {
  let randomState = seed >>> 0;
  const random = () => {
    randomState += 0x6d2b79f5;
    let t = randomState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const deck: Card[] = suits.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 1}`,
      suit,
      rank: index + 1,
      faceUp: false,
    })),
  );
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  for (let pass = 0; pass < 7; pass++) {
    for (let pile = pass; pile < 7; pile++) {
      const card = deck.pop()!;
      tableau[pile].push({ ...card, faceUp: pile === pass });
    }
  }
  return {
    stock: deck,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    moves: 0,
    score: 0,
    seed,
    drawCount,
    won: false,
  };
}

export function drawStock(state: SolitaireState): SolitaireState | null {
  if (state.won) return null;
  if (state.stock.length) {
    const count = Math.min(state.drawCount ?? 1, state.stock.length);
    const cards = state.stock
      .slice(-count)
      .reverse()
      .map((card) => ({ ...card, faceUp: true }));
    return {
      ...state,
      stock: state.stock.slice(0, -count),
      waste: [...state.waste, ...cards],
      moves: state.moves + 1,
    };
  }
  if (state.waste.length)
    return {
      ...state,
      stock: state.waste
        .slice()
        .reverse()
        .map((card) => ({ ...card, faceUp: false })),
      waste: [],
      moves: state.moves + 1,
    };
  return null;
}

export function sourceCards(state: SolitaireState, source: CardSource): Card[] {
  if (
    !Number.isInteger(source.pile) ||
    !Number.isInteger(source.index) ||
    source.index < 0
  )
    return [];
  const pile =
    source.zone === "tableau"
      ? state.tableau[source.pile]
      : source.zone === "waste"
        ? state.waste
        : state.foundations[source.pile];
  if (!pile || source.index >= pile.length) return [];
  if (source.zone !== "tableau" && source.index !== pile.length - 1) return [];
  const cards = pile.slice(source.index);
  if (cards.some((c) => !c.faceUp)) return [];
  if (
    cards.some(
      (c, index) =>
        index > 0 &&
        (cards[index - 1].rank !== c.rank + 1 ||
          isRed(cards[index - 1]) === isRed(c)),
    )
  )
    return [];
  return cards;
}

export function canMoveCards(
  state: SolitaireState,
  source: CardSource,
  target: CardTarget,
): boolean {
  if (
    state.won ||
    !Number.isInteger(target.pile) ||
    (source.zone === "foundation" && target.zone === "foundation") ||
    (source.zone === target.zone && source.pile === target.pile)
  )
    return false;
  const cards = sourceCards(state, source),
    first = cards[0];
  if (!first) return false;
  const pile =
    target.zone === "tableau"
      ? state.tableau[target.pile]
      : state.foundations[target.pile];
  if (!pile) return false;
  const top = pile[pile.length - 1];
  if (target.zone === "foundation")
    return (
      cards.length === 1 &&
      (!top
        ? first.rank === 1
        : top.suit === first.suit && top.rank + 1 === first.rank)
    );
  return !top
    ? first.rank === 13
    : top.faceUp && top.rank === first.rank + 1 && isRed(top) !== isRed(first);
}

export function moveCards(
  state: SolitaireState,
  source: CardSource,
  target: CardTarget,
): SolitaireState | null {
  if (!canMoveCards(state, source, target)) return null;
  const cards = sourceCards(state, source);
  const next = {
    ...state,
    tableau: state.tableau.map((p) => p.slice()),
    foundations: state.foundations.map((p) => p.slice()),
    waste: state.waste.slice(),
    moves: state.moves + 1,
  };
  if (source.zone === "waste") next.waste.pop();
  else if (source.zone === "foundation") next.foundations[source.pile].pop();
  else {
    next.tableau[source.pile] = next.tableau[source.pile].slice(
      0,
      source.index,
    );
    const pile = next.tableau[source.pile],
      top = pile[pile.length - 1];
    if (top && !top.faceUp) {
      pile[pile.length - 1] = { ...top, faceUp: true };
      next.score += 5;
    }
  }
  if (target.zone === "foundation") {
    next.foundations[target.pile].push(...cards);
    next.score += 10;
  } else {
    next.tableau[target.pile].push(...cards);
    if (source.zone === "foundation") next.score = Math.max(0, next.score - 10);
  }
  next.won = next.foundations.every((p) => p.length === 13);
  return next;
}

export function foundationMove(
  state: SolitaireState,
  source?: CardSource,
  safeOnly = false,
): { source: CardSource; target: CardTarget } | null {
  const sources: CardSource[] = source
    ? [source]
    : [
        ...state.tableau.flatMap((pile, index) =>
          pile.length
            ? [
                {
                  zone: "tableau" as const,
                  pile: index,
                  index: pile.length - 1,
                },
              ]
            : [],
        ),
        ...(state.waste.length
          ? [{ zone: "waste" as const, pile: 0, index: state.waste.length - 1 }]
          : []),
      ];
  for (const s of sources) {
    if (s.zone === "foundation") continue;
    const card = sourceCards(state, s)[0];
    if (!card) continue;
    // Keep cards needed to support lower ranks in the tableau. Aces and twos
    // are always safe; higher cards wait for the other suits to catch up.
    if (
      safeOnly &&
      card.rank > 2 &&
      suits.some((suit) => {
        if (suit === card.suit) return false;
        const rank =
          state.foundations.find((pile) => pile[0]?.suit === suit)?.length || 0;
        return (
          rank < card.rank - (isRed({ ...card, suit }) === isRed(card) ? 2 : 1)
        );
      })
    )
      continue;
    for (let pile = 0; pile < 4; pile++) {
      const target = { zone: "foundation" as const, pile };
      if (canMoveCards(state, s, target)) return { source: s, target };
    }
  }
  return null;
}

export function canAutoFinish(state: SolitaireState): boolean {
  return (
    !state.won &&
    !state.stock.length &&
    !state.waste.length &&
    state.tableau.every((pile) => pile.every((card) => card.faceUp))
  );
}

export function solitaireHint(
  state: SolitaireState,
): { source: CardSource; target: CardTarget } | null {
  const foundation = foundationMove(state, undefined, true);
  if (foundation) return foundation;
  const sources: CardSource[] = [
    ...state.tableau.flatMap((pile, index) =>
      pile.flatMap((card, i) =>
        card.faceUp
          ? [{ zone: "tableau" as const, pile: index, index: i }]
          : [],
      ),
    ),
    ...(state.waste.length
      ? [{ zone: "waste" as const, pile: 0, index: state.waste.length - 1 }]
      : []),
  ];
  // Exposing hidden cards and using the waste makes measurable progress.
  sources.sort((a, b) => {
    const priority = (s: CardSource) =>
      s.zone === "waste"
        ? 2
        : s.index > 0 && !state.tableau[s.pile][s.index - 1].faceUp
          ? 3
          : 0;
    return priority(b) - priority(a);
  });
  for (const source of sources) {
    for (let pile = 0; pile < 7; pile++) {
      const target = { zone: "tableau" as const, pile };
      // Moving an entire king-led stack to another empty pile does not advance a deal.
      if (
        source.zone === "tableau" &&
        source.index === 0 &&
        !state.tableau[pile].length
      )
        continue;
      if (!canMoveCards(state, source, target)) continue;
      if (source.zone === "tableau") {
        const below = state.tableau[source.pile][source.index - 1];
        const waitingKing = sources.some(
          (s) =>
            !(s.zone === "tableau" && s.pile === source.pile) &&
            sourceCards(state, s)[0]?.rank === 13 &&
            (s.zone === "waste" || s.index > 0),
        );
        // Do not suggest shuttling an already exposed stack back and forth.
        // A useful transfer uncovers a card, releases a card to a foundation,
        // or frees a column for a king that is currently covering other cards.
        if (below?.faceUp) {
          const after = moveCards(state, source, target)!;
          if (
            !foundationMove(
              after,
              { zone: "tableau", pile: source.pile, index: source.index - 1 },
              true,
            )
          )
            continue;
        } else if (!below && !waitingKing) continue;
      }
      return { source, target };
    }
  }
  return foundationMove(state);
}
