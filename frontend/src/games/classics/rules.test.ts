import { describe, expect, it } from "vitest";
import {
  applyChessMove,
  chooseChessMove,
  inCheck,
  legalChessMoves,
  moveChess,
  newChess,
  type ChessState,
  type Piece,
} from "./chessRules";
import {
  legalCheckerMoves,
  chooseCheckerMove,
  moveChecker,
  newCheckers,
  type CheckersState,
} from "./checkersRules";
import {
  canMoveCards,
  canAutoFinish,
  drawStock,
  foundationMove,
  moveCards,
  newSolitaire,
  solitaireHint,
  sourceCards,
  suits,
  type Card,
  type SolitaireState,
  type Suit,
} from "./solitaireRules";

function chessPosition(
  pieces: [number, Piece["color"], Piece["kind"]][],
  turn: ChessState["turn"] = "white",
): ChessState {
  const state = newChess();
  state.board = Array(64).fill(null);
  pieces.forEach(([square, color, kind]) => {
    state.board[square] = { color, kind, id: String(square) };
  });
  state.turn = turn;
  state.castling = {
    white: { king: false, queen: false },
    black: { king: false, queen: false },
  };
  state.positions = [];
  return state;
}

describe("chess rules", () => {
  it("matches standard opening move-tree counts through three plies", () => {
    function perft(state: ChessState, depth: number): number {
      return depth === 0
        ? 1
        : legalChessMoves(state).reduce(
            (sum, move) => sum + perft(applyChessMove(state, move), depth - 1),
            0,
          );
    }
    expect(perft(newChess(), 1)).toBe(20);
    expect(perft(newChess(), 2)).toBe(400);
    expect(perft(newChess(), 3)).toBe(8902);
  });

  it("recognizes Fool’s Mate and prevents further moves", () => {
    let state = newChess();
    for (const [from, to] of [
      [53, 45],
      [12, 28],
      [54, 38],
      [3, 39],
    ])
      state = moveChess(state, { from, to })!;
    expect(state.result).toBe("checkmate");
    expect(state.turn).toBe("white");
    expect(inCheck(state)).toBe(true);
    expect(state.moves).toEqual(["f3", "e5", "g4", "Qh4#"]);
    expect(moveChess(state, { from: 48, to: 40 })).toBeNull();
  });

  it("allows castling only with safe king transit squares and moves the rook", () => {
    const state = chessPosition([
      [60, "white", "k"],
      [63, "white", "r"],
      [4, "black", "k"],
    ]);
    state.castling.white.king = true;
    expect(legalChessMoves(state, 60).some((m) => m.castle === "king")).toBe(
      true,
    );
    const next = moveChess(state, { from: 60, to: 62 })!;
    expect(next.board[61]?.kind).toBe("r");
    expect(next.board[63]).toBeNull();
    state.board[5] = { kind: "r", color: "black", id: "attacker" };
    expect(legalChessMoves(state, 60).some((m) => m.castle)).toBe(false);
  });

  it("removes an en-passant pawn and rejects a discovered check en passant", () => {
    const state = chessPosition([
      [60, "white", "k"],
      [4, "black", "k"],
      [28, "white", "p"],
      [27, "black", "p"],
    ]);
    state.enPassant = 19;
    const next = moveChess(state, { from: 28, to: 19 })!;
    expect(next.board[27]).toBeNull();
    expect(next.board[19]?.kind).toBe("p");
    const pinned = chessPosition([
      [31, "white", "k"],
      [4, "black", "k"],
      [30, "white", "p"],
      [29, "black", "p"],
      [24, "black", "r"],
    ]);
    pinned.enPassant = 21;
    expect(legalChessMoves(pinned, 30).some((m) => m.enPassant)).toBe(false);
  });

  it("offers all promotions, including a knight underpromotion", () => {
    const state = chessPosition([
      [60, "white", "k"],
      [7, "black", "k"],
      [8, "white", "p"],
    ]);
    expect(
      legalChessMoves(state, 8)
        .map((m) => m.promotion)
        .sort(),
    ).toEqual(["b", "n", "q", "r"]);
    expect(
      moveChess(state, { from: 8, to: 0, promotion: "n" })?.board[0]?.kind,
    ).toBe("n");
  });

  it("never allows a pinned piece to expose its own king", () => {
    const state = chessPosition([
      [60, "white", "k"],
      [52, "white", "r"],
      [4, "black", "r"],
      [0, "black", "k"],
    ]);
    expect(legalChessMoves(state, 52).every((m) => m.to % 8 === 4)).toBe(true);
  });

  it("declares threefold repetition after the same knight cycle twice", () => {
    let state = newChess();
    for (let cycle = 0; cycle < 2; cycle++)
      for (const [from, to] of [
        [62, 45],
        [6, 21],
        [45, 62],
        [21, 6],
      ])
        state = moveChess(state, { from, to })!;
    expect(state.result).toBe("repetition");
  });

  it("recognizes stalemate without confusing it with checkmate", () => {
    const state = chessPosition([
      [18, "white", "k"],
      [25, "white", "q"],
      [0, "black", "k"],
    ]);
    const next = moveChess(state, { from: 25, to: 17 })!;
    expect(next.result).toBe("stalemate");
    expect(inCheck(next)).toBe(false);
  });

  it("the Automaton finds mate and escapes a hanging queen without exposing its king", () => {
    let mate = newChess();
    for (const [from, to] of [
      [53, 45],
      [12, 28],
      [54, 38],
    ])
      mate = moveChess(mate, { from, to })!;
    const finish = chooseChessMove(mate)!;
    expect(moveChess(mate, finish)?.result).toBe("checkmate");
    const threatened = chessPosition([
      [60, "white", "k"],
      [35, "white", "q"],
      [26, "black", "p"],
      [4, "black", "k"],
      [0, "black", "r"],
    ]);
    const reply = chooseChessMove(threatened)!;
    expect(reply.from).toBe(35);
    expect(legalChessMoves(threatened)).toContainEqual(reply);
    expect(inCheck(applyChessMove(threatened, reply), "white")).toBe(false);
  });

  it("records the actual captured piece including en passant and promoted pieces", () => {
    const position = chessPosition([
      [60, "white", "k"],
      [4, "black", "k"],
      [28, "white", "p"],
      [27, "black", "p"],
    ]);
    position.enPassant = 19;
    expect(moveChess(position, { from: 28, to: 19 })?.captured).toEqual([
      position.board[27],
    ]);
    const promoted = chessPosition([
      [60, "white", "k"],
      [4, "black", "k"],
      [8, "white", "p"],
      [1, "black", "r"],
    ]);
    const next = moveChess(promoted, { from: 8, to: 0, promotion: "q" })!;
    expect(moveChess(next, { from: 1, to: 0 })?.captured[0].kind).toBe("q");
  });
});

function checkerPosition(
  pieces: [number, "red" | "black", boolean][],
): CheckersState {
  const state = newCheckers();
  state.board = Array(64).fill(null);
  pieces.forEach(([square, color, king]) => {
    state.board[square] = { color, king, id: String(square) };
  });
  return state;
}

describe("American checkers rules", () => {
  it("starts with twelve pieces per side and seven legal opening moves", () => {
    const state = newCheckers();
    expect(state.board.filter((p) => p?.color === "red")).toHaveLength(12);
    expect(state.board.filter((p) => p?.color === "black")).toHaveLength(12);
    expect(legalCheckerMoves(state)).toHaveLength(7);
  });

  it("forces a capture, then keeps the turn and piece for a chained jump", () => {
    const state = checkerPosition([
      [42, "red", false],
      [46, "red", false],
      [33, "black", false],
      [17, "black", false],
      [7, "black", false],
    ]);
    expect(legalCheckerMoves(state)).toEqual([
      { from: 42, to: 24, capture: 33 },
    ]);
    const next = moveChecker(state, 42, 24)!;
    expect(next.turn).toBe("red");
    expect(next.forcedFrom).toBe(24);
    expect(legalCheckerMoves(next)).toEqual([
      { from: 24, to: 10, capture: 17 },
    ]);
    const finished = moveChecker(next, 24, 10)!;
    expect(finished.turn).toBe("black");
    expect(finished.forcedFrom).toBeNull();
    expect(finished.board[33]).toBeNull();
    expect(finished.board[17]).toBeNull();
  });

  it("ends the turn on crowning even if the new king could capture backward", () => {
    const state = checkerPosition([
      [17, "red", false],
      [10, "black", false],
      [12, "black", false],
      [1, "black", false],
    ]);
    const next = moveChecker(state, 17, 3)!;
    expect(next.board[3]?.king).toBe(true);
    expect(next.turn).toBe("black");
    expect(next.forcedFrom).toBeNull();
  });

  it("does not let men capture backwards, while kings can", () => {
    const state = checkerPosition([
      [26, "red", false],
      [35, "black", false],
    ]);
    expect(legalCheckerMoves(state).some((m) => m.to === 44)).toBe(false);
    state.board[26]!.king = true;
    expect(legalCheckerMoves(state)).toEqual([
      { from: 26, to: 44, capture: 35 },
    ]);
  });

  it("wins by capturing the final opposing checker", () => {
    const state = checkerPosition([
      [42, "red", false],
      [33, "black", false],
    ]);
    expect(moveChecker(state, 42, 24)?.winner).toBe("red");
  });

  it("the Automaton evaluates a complete forced chain instead of a single jump", () => {
    const position = checkerPosition([
      [42, "red", false],
      [33, "black", false],
      [35, "black", false],
      [17, "black", false],
      [7, "black", false],
    ]);
    expect(chooseCheckerMove(position)).toEqual({
      from: 42,
      to: 24,
      capture: 33,
    });
    const next = moveChecker(position, 42, 24)!;
    expect(chooseCheckerMove(next)).toEqual({ from: 24, to: 10, capture: 17 });
  });
});

const card = (suit: Suit, rank: number, faceUp = true): Card => ({
  suit,
  rank,
  faceUp,
  id: `${suit}-${rank}`,
});
function solitairePosition(): SolitaireState {
  return {
    ...newSolitaire(1),
    stock: [],
    tableau: [[], [], [], [], [], [], []],
    waste: [],
    foundations: [[], [], [], []],
  };
}
const allCards = (state: SolitaireState) => [
  ...state.stock,
  ...state.waste,
  ...state.tableau.flat(),
  ...state.foundations.flat(),
];

describe("Klondike rules", () => {
  it("deals a reproducible, complete deck with only tableau tops face up", () => {
    const state = newSolitaire(2009);
    expect(state).toEqual(newSolitaire(2009));
    expect(state).not.toEqual(newSolitaire(2010));
    expect(state.stock).toHaveLength(24);
    expect(new Set(allCards(state).map((c) => c.id)).size).toBe(52);
    state.tableau.forEach((pile, i) => {
      expect(pile).toHaveLength(i + 1);
      expect(pile.filter((c) => c.faceUp)).toHaveLength(1);
      expect(pile[pile.length - 1].faceUp).toBe(true);
    });
  });

  it("recycles the stock in its original draw order without losing cards", () => {
    let state = newSolitaire(7);
    const first = state.stock[state.stock.length - 1].id;
    for (let i = 0; i < 24; i++) state = drawStock(state)!;
    expect(state.stock).toHaveLength(0);
    state = drawStock(state)!;
    expect(state.waste).toHaveLength(0);
    state = drawStock(state)!;
    expect(state.waste[0].id).toBe(first);
    expect(new Set(allCards(state).map((c) => c.id)).size).toBe(52);
  });

  it("moves a descending alternating sequence and reveals the exposed card", () => {
    const state = solitairePosition();
    state.tableau[0] = [
      card("clubs", 1, false),
      card("hearts", 7),
      card("clubs", 6),
    ];
    state.tableau[1] = [card("spades", 8)];
    const next = moveCards(
      state,
      { zone: "tableau", pile: 0, index: 1 },
      { zone: "tableau", pile: 1 },
    )!;
    expect(next.tableau[1].map((c) => c.rank)).toEqual([8, 7, 6]);
    expect(next.tableau[0][0].faceUp).toBe(true);
    expect(next.score).toBe(5);
    expect(state.tableau[0][0].faceUp).toBe(false);
  });

  it("requires kings on empty columns and rejects invalid sequences", () => {
    const state = solitairePosition();
    state.waste = [card("hearts", 12)];
    expect(
      canMoveCards(
        state,
        { zone: "waste", pile: 0, index: 0 },
        { zone: "tableau", pile: 0 },
      ),
    ).toBe(false);
    state.waste = [card("hearts", 13)];
    expect(
      canMoveCards(
        state,
        { zone: "waste", pile: 0, index: 0 },
        { zone: "tableau", pile: 0 },
      ),
    ).toBe(true);
    state.tableau[0] = [card("hearts", 13), card("diamonds", 12)];
    expect(sourceCards(state, { zone: "tableau", pile: 0, index: 0 })).toEqual(
      [],
    );
  });

  it("builds foundations by suit and rank, one exposed card at a time", () => {
    const state = solitairePosition();
    state.waste = [card("hearts", 1), card("hearts", 2)];
    expect(
      moveCards(
        state,
        { zone: "waste", pile: 0, index: 0 },
        { zone: "foundation", pile: 0 },
      ),
    ).toBeNull();
    state.foundations[0] = [card("diamonds", 1)];
    expect(
      moveCards(
        state,
        { zone: "waste", pile: 0, index: 1 },
        { zone: "foundation", pile: 0 },
      ),
    ).toBeNull();
    state.foundations[0] = [card("hearts", 1)];
    const next = moveCards(
      state,
      { zone: "waste", pile: 0, index: 1 },
      { zone: "foundation", pile: 0 },
    )!;
    expect(next.foundations[0].map((c) => c.rank)).toEqual([1, 2]);
    expect(next.score).toBe(10);
  });

  it("recognizes completion on the fifty-second foundation card", () => {
    const state = solitairePosition();
    state.foundations = suits.map((suit, i) =>
      Array.from({ length: i === 3 ? 12 : 13 }, (_, rank) =>
        card(suit, rank + 1),
      ),
    );
    state.waste = [card("spades", 13)];
    const next = moveCards(
      state,
      { zone: "waste", pile: 0, index: 0 },
      { zone: "foundation", pile: 3 },
    )!;
    expect(next.won).toBe(true);
    expect(drawStock(next)).toBeNull();
  });

  it("cannot farm foundation points by moving the same ace between slots", () => {
    const state = solitairePosition();
    state.foundations[0] = [card("hearts", 1)];
    expect(
      moveCards(
        state,
        { zone: "foundation", pile: 0, index: 0 },
        { zone: "foundation", pile: 1 },
      ),
    ).toBeNull();
  });

  it("Auto-home keeps a high card needed by lower opposite suits and allows it once safe", () => {
    const state = solitairePosition();
    state.foundations[0] = [card("hearts", 1), card("hearts", 2)];
    state.tableau[0] = [card("hearts", 3)];
    expect(foundationMove(state)).not.toBeNull();
    expect(foundationMove(state, undefined, true)).toBeNull();
    state.foundations[1] = [card("diamonds", 1)];
    state.foundations[2] = [card("clubs", 1), card("clubs", 2)];
    state.foundations[3] = [card("spades", 1), card("spades", 2)];
    expect(foundationMove(state, undefined, true)?.source).toEqual({
      zone: "tableau",
      pile: 0,
      index: 0,
    });
  });

  it("finishes all remaining face-up sequences without losing cards or changing the deal", () => {
    let state = solitairePosition();
    state.foundations = suits.map((suit) =>
      Array.from({ length: 9 }, (_, i) => card(suit, i + 1)),
    );
    state.tableau = [
      [
        card("hearts", 13),
        card("clubs", 12),
        card("diamonds", 11),
        card("spades", 10),
      ],
      [
        card("clubs", 13),
        card("diamonds", 12),
        card("spades", 11),
        card("hearts", 10),
      ],
      [
        card("diamonds", 13),
        card("spades", 12),
        card("hearts", 11),
        card("clubs", 10),
      ],
      [
        card("spades", 13),
        card("hearts", 12),
        card("clubs", 11),
        card("diamonds", 10),
      ],
      [],
      [],
      [],
    ];
    expect(canAutoFinish(state)).toBe(true);
    const seed = state.seed;
    for (let i = 0; i < 16; i++) {
      const next = foundationMove(state)!;
      expect(next).not.toBeNull();
      state = moveCards(state, next.source, next.target)!;
    }
    expect(state.won).toBe(true);
    expect(state.seed).toBe(seed);
    expect(state.moves).toBe(16);
    expect(new Set(allCards(state).map((c) => c.id)).size).toBe(52);
    expect(state.score).toBe(160);
  });

  it("returns a legal hint and maintains 52 unique cards through many valid actions", () => {
    let state = newSolitaire(1729);
    for (let i = 0; i < 150; i++) {
      const hint = solitaireHint(state);
      if (hint) {
        expect(canMoveCards(state, hint.source, hint.target)).toBe(true);
        state = moveCards(state, hint.source, hint.target)!;
      } else {
        const next = drawStock(state);
        if (!next) break;
        state = next;
      }
      expect(allCards(state)).toHaveLength(52);
      expect(new Set(allCards(state).map((c) => c.id)).size).toBe(52);
    }
  });
});
