export type CheckerColor = "red" | "black";
export type Checker = { color: CheckerColor; king: boolean; id: string };
export type CheckerMove = { from: number; to: number; capture: number | null };
export type CheckersState = {
  board: (Checker | null)[];
  turn: CheckerColor;
  forcedFrom: number | null;
  lastMove: CheckerMove | null;
  moves: number;
  quietMoves: number;
  winner: CheckerColor | "draw" | null;
};
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opposite = (color: CheckerColor): CheckerColor =>
  color === "red" ? "black" : "red";

export function newCheckers(): CheckersState {
  return {
    board: Array.from({ length: 64 }, (_, square) => {
      const row = Math.floor(square / 8),
        col = square % 8;
      return (row + col) % 2 === 1 && (row < 3 || row > 4)
        ? {
            color: row < 3 ? "black" : "red",
            king: false,
            id: `disk-${square}`,
          }
        : null;
    }),
    turn: "red",
    forcedFrom: null,
    lastMove: null,
    moves: 0,
    quietMoves: 0,
    winner: null,
  };
}

function movesFrom(state: CheckersState, from: number): CheckerMove[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  const row = Math.floor(from / 8),
    col = from % 8,
    moves: CheckerMove[] = [];
  for (const dr of piece.king ? [-1, 1] : piece.color === "red" ? [-1] : [1]) {
    for (const dc of [-1, 1]) {
      const nr = row + dr,
        nc = col + dc;
      if (!inside(nr, nc)) continue;
      const target = nr * 8 + nc,
        occupant = state.board[target];
      if (!occupant && state.forcedFrom === null)
        moves.push({ from, to: target, capture: null });
      else if (
        occupant &&
        occupant.color !== piece.color &&
        inside(row + dr * 2, col + dc * 2) &&
        !state.board[(row + dr * 2) * 8 + col + dc * 2]
      )
        moves.push({
          from,
          to: (row + dr * 2) * 8 + col + dc * 2,
          capture: target,
        });
    }
  }
  return moves;
}

export function legalCheckerMoves(state: CheckersState): CheckerMove[] {
  if (state.winner) return [];
  const available =
    state.forcedFrom === null
      ? state.board.flatMap((_, from) => movesFrom(state, from))
      : movesFrom(state, state.forcedFrom);
  const captures = available.filter((m) => m.capture !== null);
  return captures.length ? captures : available;
}

export function moveChecker(
  state: CheckersState,
  from: number,
  to: number,
): CheckersState | null {
  const move = legalCheckerMoves(state).find(
    (m) => m.from === from && m.to === to,
  );
  if (!move) return null;
  const board = state.board.slice(),
    piece = board[from]!;
  const crowned =
    !piece.king && Math.floor(to / 8) === (piece.color === "red" ? 0 : 7);
  board[from] = null;
  board[to] = { ...piece, king: piece.king || crowned };
  if (move.capture !== null) board[move.capture] = null;
  const next: CheckersState = {
    ...state,
    board,
    lastMove: move,
    forcedFrom: null,
    quietMoves: move.capture !== null || crowned ? 0 : state.quietMoves + 1,
  };
  // In American checkers a newly crowned man ends its turn immediately.
  if (move.capture !== null && !crowned) {
    next.forcedFrom = to;
    if (movesFrom(next, to).some((m) => m.capture !== null)) return next;
  }
  next.forcedFrom = null;
  next.turn = opposite(state.turn);
  next.moves++;
  if (!legalCheckerMoves(next).length) next.winner = state.turn;
  else if (next.quietMoves >= 80) next.winner = "draw";
  return next;
}

export function chooseCheckerMove(
  state: CheckersState,
  depth = 4,
): CheckerMove | null {
  const color = state.turn;
  let nodes = 0;
  const evaluate = (position: CheckersState) =>
    position.board.reduce((score, p, square) => {
      if (!p) return score;
      const row = Math.floor(square / 8),
        advance = p.color === "red" ? 7 - row : row;
      const center = 3.5 - Math.abs(3.5 - (square % 8));
      return (
        score +
        (p.color === color ? 1 : -1) *
          (p.king
            ? 180 + center * 4
            : 100 + advance * 5 + center * 2 + (advance === 0 ? 8 : 0))
      );
    }, 0);
  function search(
    position: CheckersState,
    depth: number,
    alpha: number,
    beta: number,
  ): number {
    if (position.winner)
      return position.winner === "draw"
        ? 0
        : position.winner === color
          ? 10000 + depth
          : -10000 - depth;
    // A multi-jump is a single turn: search the whole sequence before evaluating.
    if ((depth <= 0 && position.forcedFrom === null) || ++nodes > 9000)
      return evaluate(position);
    const maximize = position.turn === color;
    let score = maximize ? -Infinity : Infinity;
    for (const move of legalCheckerMoves(position)) {
      const next = moveChecker(position, move.from, move.to)!;
      const value = search(
        next,
        depth - (next.turn !== position.turn ? 1 : 0),
        alpha,
        beta,
      );
      score = maximize ? Math.max(score, value) : Math.min(score, value);
      if (maximize) alpha = Math.max(alpha, score);
      else beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
    return score;
  }
  let best: CheckerMove | null = null,
    bestScore = -Infinity;
  for (const move of legalCheckerMoves(state)) {
    const next = moveChecker(state, move.from, move.to)!;
    const score = search(
      next,
      next.turn === state.turn ? depth : depth - 1,
      bestScore,
      Infinity,
    );
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}
