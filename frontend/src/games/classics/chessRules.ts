export type Color = "white" | "black";
export type PieceKind = "p" | "n" | "b" | "r" | "q" | "k";
export type Piece = { color: Color; kind: PieceKind; id: string };
export type ChessMove = {
  from: number;
  to: number;
  promotion?: PieceKind;
  enPassant?: boolean;
  castle?: "king" | "queen";
};
export type ChessState = {
  board: (Piece | null)[];
  turn: Color;
  castling: Record<Color, { king: boolean; queen: boolean }>;
  enPassant: number | null;
  halfmove: number;
  fullmove: number;
  lastMove: ChessMove | null;
  moves: string[];
  captured: Piece[];
  positions: string[];
  result:
    | "playing"
    | "checkmate"
    | "stalemate"
    | "repetition"
    | "fifty-move"
    | "insufficient";
};

export const opposite = (color: Color): Color =>
  color === "white" ? "black" : "white";
export const squareName = (square: number) =>
  `${"abcdefgh"[square % 8]}${8 - Math.floor(square / 8)}`;
const row = (square: number) => Math.floor(square / 8);
const col = (square: number) => square % 8;
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function newChess(): ChessState {
  const order: PieceKind[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: (Piece | null)[] = Array(64).fill(null);
  for (let c = 0; c < 8; c++) {
    board[c] = { color: "black", kind: order[c], id: `b${c}` };
    board[8 + c] = { color: "black", kind: "p", id: `bp${c}` };
    board[48 + c] = { color: "white", kind: "p", id: `wp${c}` };
    board[56 + c] = { color: "white", kind: order[c], id: `w${c}` };
  }
  const state: ChessState = {
    board,
    turn: "white",
    castling: {
      white: { king: true, queen: true },
      black: { king: true, queen: true },
    },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    lastMove: null,
    moves: [],
    captured: [],
    positions: [],
    result: "playing",
  };
  state.positions = [positionKey(state)];
  return state;
}

export function attacked(
  board: (Piece | null)[],
  square: number,
  by: Color,
): boolean {
  const r = row(square),
    c = col(square);
  const pawnSourceRow = r + (by === "white" ? 1 : -1);
  for (const dc of [-1, 1]) {
    if (inside(pawnSourceRow, c + dc)) {
      const p = board[pawnSourceRow * 8 + c + dc];
      if (p?.color === by && p.kind === "p") return true;
    }
  }
  for (const [dr, dc] of [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ]) {
    if (inside(r + dr, c + dc)) {
      const p = board[(r + dr) * 8 + c + dc];
      if (p?.color === by && p.kind === "n") return true;
    }
  }
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]) {
    let nr = r + dr,
      nc = c + dc,
      distance = 1;
    while (inside(nr, nc)) {
      const p = board[nr * 8 + nc];
      if (p) {
        if (
          p.color === by &&
          (p.kind === "q" ||
            (distance === 1 && p.kind === "k") ||
            (dr !== 0 && dc !== 0 ? p.kind === "b" : p.kind === "r"))
        )
          return true;
        break;
      }
      nr += dr;
      nc += dc;
      distance++;
    }
  }
  return false;
}

export function inCheck(state: ChessState, color = state.turn): boolean {
  const king = state.board.findIndex(
    (p) => p?.kind === "k" && p.color === color,
  );
  return king < 0 || attacked(state.board, king, opposite(color));
}

function pseudoMoves(state: ChessState, from: number): ChessMove[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  const r = row(from),
    c = col(from),
    moves: ChessMove[] = [];
  const add = (to: number, extra: Partial<ChessMove> = {}) => {
    if (state.board[to]?.kind === "k") return;
    if (piece.kind === "p" && (row(to) === 0 || row(to) === 7)) {
      for (const promotion of ["q", "r", "b", "n"] as PieceKind[])
        moves.push({ from, to, promotion, ...extra });
    } else moves.push({ from, to, ...extra });
  };
  if (piece.kind === "p") {
    const dr = piece.color === "white" ? -1 : 1;
    if (inside(r + dr, c) && !state.board[(r + dr) * 8 + c]) {
      add((r + dr) * 8 + c);
      if (
        r === (piece.color === "white" ? 6 : 1) &&
        !state.board[(r + 2 * dr) * 8 + c]
      )
        add((r + 2 * dr) * 8 + c);
    }
    for (const dc of [-1, 1]) {
      if (!inside(r + dr, c + dc)) continue;
      const to = (r + dr) * 8 + c + dc;
      if (state.board[to] && state.board[to]?.color !== piece.color) add(to);
      else if (
        to === state.enPassant &&
        state.board[r * 8 + c + dc]?.kind === "p" &&
        state.board[r * 8 + c + dc]?.color === opposite(piece.color)
      )
        add(to, { enPassant: true });
    }
  } else if (piece.kind === "n") {
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      if (
        inside(r + dr, c + dc) &&
        state.board[(r + dr) * 8 + c + dc]?.color !== piece.color
      )
        add((r + dr) * 8 + c + dc);
    }
  } else {
    const dirs =
      piece.kind === "b"
        ? [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]
        : piece.kind === "r"
          ? [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ]
          : [
              [-1, -1],
              [-1, 0],
              [-1, 1],
              [0, -1],
              [0, 1],
              [1, -1],
              [1, 0],
              [1, 1],
            ];
    for (const [dr, dc] of dirs) {
      let nr = r + dr,
        nc = c + dc;
      while (inside(nr, nc)) {
        const target = state.board[nr * 8 + nc];
        if (target?.color === piece.color) break;
        add(nr * 8 + nc);
        if (target || piece.kind === "k") break;
        nr += dr;
        nc += dc;
      }
    }
    if (
      piece.kind === "k" &&
      from === (piece.color === "white" ? 60 : 4) &&
      !inCheck(state)
    ) {
      const enemy = opposite(piece.color),
        rights = state.castling[piece.color];
      if (
        rights.king &&
        state.board[from + 3]?.kind === "r" &&
        state.board[from + 3]?.color === piece.color &&
        !state.board[from + 1] &&
        !state.board[from + 2] &&
        !attacked(state.board, from + 1, enemy) &&
        !attacked(state.board, from + 2, enemy)
      )
        add(from + 2, { castle: "king" });
      if (
        rights.queen &&
        state.board[from - 4]?.kind === "r" &&
        state.board[from - 4]?.color === piece.color &&
        !state.board[from - 1] &&
        !state.board[from - 2] &&
        !state.board[from - 3] &&
        !attacked(state.board, from - 1, enemy) &&
        !attacked(state.board, from - 2, enemy)
      )
        add(from - 2, { castle: "queen" });
    }
  }
  return moves;
}

export function applyChessMove(state: ChessState, move: ChessMove): ChessState {
  const board = state.board.slice(),
    piece = board[move.from]!;
  const captured = board[move.to];
  board[move.to] = { ...piece, kind: move.promotion || piece.kind };
  board[move.from] = null;
  if (move.enPassant)
    board[move.to + (piece.color === "white" ? 8 : -8)] = null;
  if (move.castle) {
    const rookFrom = move.from + (move.castle === "king" ? 3 : -4);
    const rookTo = move.from + (move.castle === "king" ? 1 : -1);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  const castling = {
    white: { ...state.castling.white },
    black: { ...state.castling.black },
  };
  if (piece.kind === "k") castling[piece.color] = { king: false, queen: false };
  for (const [square, color, side] of [
    [0, "black", "queen"],
    [7, "black", "king"],
    [56, "white", "queen"],
    [63, "white", "king"],
  ] as const) {
    if (move.from === square || move.to === square)
      castling[color][side] = false;
  }
  return {
    ...state,
    board,
    castling,
    turn: opposite(state.turn),
    enPassant:
      piece.kind === "p" && Math.abs(move.to - move.from) === 16
        ? (move.to + move.from) / 2
        : null,
    halfmove:
      piece.kind === "p" || captured || move.enPassant ? 0 : state.halfmove + 1,
    fullmove: state.fullmove + (state.turn === "black" ? 1 : 0),
    lastMove: move,
  };
}

export function legalChessMoves(state: ChessState, from?: number): ChessMove[] {
  const squares =
    from === undefined ? Array.from({ length: 64 }, (_, i) => i) : [from];
  return squares
    .flatMap((square) => pseudoMoves(state, square))
    .filter((move) => !inCheck(applyChessMove(state, move), state.turn));
}

export function positionKey(state: ChessState): string {
  // An en-passant square only distinguishes positions if a legal capture exists.
  const ep =
    state.enPassant !== null && legalChessMoves(state).some((m) => m.enPassant)
      ? state.enPassant
      : "-";
  return (
    state.board
      .map((p) =>
        p ? (p.color === "white" ? p.kind.toUpperCase() : p.kind) : ".",
      )
      .join("") +
    state.turn +
    JSON.stringify(state.castling) +
    ep
  );
}

function insufficientMaterial(state: ChessState): boolean {
  const pieces = state.board
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p && p.kind !== "k");
  if (!pieces.length) return true;
  if (
    pieces.length === 1 &&
    (pieces[0].p!.kind === "b" || pieces[0].p!.kind === "n")
  )
    return true;
  if (pieces.every(({ p }) => p!.kind === "b"))
    return new Set(pieces.map(({ i }) => (row(i) + col(i)) % 2)).size === 1;
  return false;
}

export function moveChess(
  state: ChessState,
  request: Pick<ChessMove, "from" | "to" | "promotion">,
): ChessState | null {
  if (state.result !== "playing") return null;
  const move = legalChessMoves(state, request.from).find(
    (m) =>
      m.to === request.to &&
      (m.promotion || "q") === (request.promotion || "q"),
  );
  if (!move) return null;
  const next = applyChessMove(state, move);
  const piece = state.board[move.from]!,
    capture = Boolean(state.board[move.to] || move.enPassant);
  const taken =
    state.board[
      move.enPassant ? move.to + (piece.color === "white" ? 8 : -8) : move.to
    ];
  next.captured = taken
    ? [...(state.captured || []), taken]
    : state.captured || [];
  let notation = move.castle
    ? move.castle === "king"
      ? "O-O"
      : "O-O-O"
    : `${piece.kind === "p" ? (capture ? squareName(move.from)[0] : "") : piece.kind.toUpperCase()}${piece.kind !== "p" && legalChessMoves(state).some((m) => m.from !== move.from && m.to === move.to && state.board[m.from]?.kind === piece.kind) ? squareName(move.from) : ""}${capture ? "x" : ""}${squareName(move.to)}${move.promotion ? "=" + move.promotion.toUpperCase() : ""}`;
  const key = positionKey(next);
  next.positions = [...state.positions, key];
  const available = legalChessMoves(next);
  if (!available.length)
    next.result = inCheck(next) ? "checkmate" : "stalemate";
  else if (insufficientMaterial(next)) next.result = "insufficient";
  else if (next.halfmove >= 100) next.result = "fifty-move";
  else if (next.positions.filter((p) => p === key).length >= 3)
    next.result = "repetition";
  if (inCheck(next)) notation += next.result === "checkmate" ? "#" : "+";
  next.moves = [...state.moves, notation];
  return next;
}

const values: Record<PieceKind, number> = {
  p: 100,
  n: 320,
  b: 335,
  r: 500,
  q: 900,
  k: 20000,
};
function evaluate(state: ChessState, color: Color): number {
  return state.board.reduce((sum, p, i) => {
    if (!p) return sum;
    const center = 3.5 - Math.abs(3.5 - col(i)) + 3.5 - Math.abs(3.5 - row(i));
    const advance = p.color === "white" ? 6 - row(i) : row(i) - 1;
    const developed =
      (p.kind === "b" || p.kind === "n") && advance > -1 ? 12 : 0;
    const castleSafety =
      p.kind === "k" &&
      row(i) === (p.color === "white" ? 7 : 0) &&
      [2, 6].includes(col(i))
        ? 35
        : 0;
    return (
      sum +
      (p.color === color ? 1 : -1) *
        (values[p.kind] +
          center * (p.kind === "k" ? -4 : p.kind === "n" ? 9 : 4) +
          (p.kind === "p" ? advance * 9 : 0) +
          developed +
          castleSafety)
    );
  }, 0);
}

export function chooseChessMove(
  state: ChessState,
  depth = 3,
): ChessMove | null {
  if (state.result !== "playing") return null;
  // Three plies with capture ordering and a short capture extension keeps the
  // casual opponent responsive while avoiding the old one-reply horizon trap.
  const order = (position: ChessState, moves: ChessMove[]) =>
    moves.sort((a, b) => {
      const priority = (m: ChessMove) =>
        (position.board[m.to]
          ? values[position.board[m.to]!.kind] * 10 -
            values[position.board[m.from]!.kind]
          : m.enPassant
            ? 900
            : 0) +
        (m.promotion ? values[m.promotion] * 10 : 0) +
        (m.castle ? 60 : 0);
      return priority(b) - priority(a);
    });
  let nodes = 0;
  function search(
    position: ChessState,
    depth: number,
    alpha: number,
    beta: number,
    ply: number,
    extension = 2,
  ): number {
    nodes++;
    const legal = legalChessMoves(position),
      checked = inCheck(position);
    if (!legal.length) return checked ? -100000 + ply : 0;
    if (position.halfmove >= 100 || insufficientMaterial(position)) return 0;
    const score = evaluate(position, position.turn);
    if (nodes > (depth >= 3 ? 18000 : 6500) || (depth <= 0 && extension <= 0))
      return score;
    let candidates = legal;
    if (depth <= 0 && !checked) {
      if (score >= beta) return score;
      alpha = Math.max(alpha, score);
      candidates = legal.filter(
        (m) => position.board[m.to] || m.enPassant || m.promotion,
      );
    }
    for (const move of order(position, candidates)) {
      const score = -search(
        applyChessMove(position, move),
        depth - 1,
        -beta,
        -alpha,
        ply + 1,
        depth <= 0 ? extension - 1 : extension,
      );
      if (score >= beta) return score;
      alpha = Math.max(alpha, score);
    }
    return alpha;
  }
  let best: ChessMove | null = null,
    bestScore = -Infinity;
  for (const move of order(state, legalChessMoves(state))) {
    const score = -search(
      applyChessMove(state, move),
      Math.max(0, Math.min(3, depth) - 1),
      -Infinity,
      -bestScore,
      1,
    );
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}
