export const ROWS = 6,
  COLS = 7;
export type Disc = 1 | 2;
export type FourState = {
  board: (Disc | 0)[];
  turn: Disc;
  winner: Disc | "draw" | null;
  line: number[];
  moves: number[];
  last: number | null;
};
export const other = (disc: Disc): Disc => (disc === 1 ? 2 : 1);
export function newFour(): FourState {
  return {
    board: Array(ROWS * COLS).fill(0),
    turn: 1,
    winner: null,
    line: [],
    moves: [],
    last: null,
  };
}
export function landing(board: FourState["board"], column: number) {
  if (!Number.isInteger(column) || column < 0 || column >= COLS) return -1;
  for (let row = ROWS - 1; row >= 0; row--)
    if (!board[row * COLS + column]) return row * COLS + column;
  return -1;
}
export function winningLine(
  board: FourState["board"],
  index: number,
): number[] {
  const who = board[index];
  if (!who) return [];
  const row = Math.floor(index / COLS),
    col = index % COLS;
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const line = [index];
    for (const sign of [-1, 1])
      for (let step = 1; step < 4; step++) {
        const r = row + dr * step * sign,
          c = col + dc * step * sign;
        if (
          r < 0 ||
          r >= ROWS ||
          c < 0 ||
          c >= COLS ||
          board[r * COLS + c] !== who
        )
          break;
        line.push(r * COLS + c);
      }
    if (line.length >= 4) return line;
  }
  return [];
}
export function dropDisc(state: FourState, column: number): FourState | null {
  if (state.winner) return null;
  const index = landing(state.board, column);
  if (index < 0) return null;
  const board = state.board.slice();
  board[index] = state.turn;
  const line = winningLine(board, index);
  return {
    board,
    turn: other(state.turn),
    winner: line.length ? state.turn : board.every(Boolean) ? "draw" : null,
    line,
    moves: [...state.moves, column],
    last: index,
  };
}
const order = [3, 2, 4, 1, 5, 0, 6];
function evaluate(board: FourState["board"], me: Disc) {
  let score = 0;
  const opponent = other(me);
  for (let row = 0; row < ROWS; row++) {
    if (board[row * COLS + 3] === me) score += 7;
    if (board[row * COLS + 3] === opponent) score -= 7;
  }
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const lastRow = row + dr * 3,
          lastCol = col + dc * 3;
        if (lastRow < 0 || lastRow >= ROWS || lastCol < 0 || lastCol >= COLS)
          continue;
        let mine = 0,
          theirs = 0,
          empty = 0;
        for (let i = 0; i < 4; i++) {
          const v = board[(row + dr * i) * COLS + col + dc * i];
          if (v === me) mine++;
          else if (v === opponent) theirs++;
          else empty++;
        }
        if (!theirs) {
          score += mine === 3 ? 95 : mine === 2 ? 13 : mine === 1 ? 1 : 0;
        }
        if (!mine) {
          score -=
            theirs === 3 ? 115 : theirs === 2 ? 15 : theirs === 1 ? 1 : 0;
        }
        if (!empty) score += mine === 4 ? 100000 : theirs === 4 ? -100000 : 0;
      }
  return score;
}
export function chooseDrop(state: FourState, depth = 5): number | null {
  if (state.winner) return null;
  const me = state.turn,
    board = state.board.slice(),
    heights = Array.from({ length: COLS }, (_, c) => landing(board, c));
  let nodes = 0;
  // In-place search avoids allocating boards for every branch. A fixed node cap keeps input responsive.
  function search(
    turn: Disc,
    left: number,
    alpha: number,
    beta: number,
    last: number | null,
  ): number {
    nodes++;
    if (last !== null && winningLine(board, last).length)
      return board[last] === me ? 100000 + left * 100 : -100000 - left * 100;
    if (!left || nodes > 70000) return evaluate(board, me);
    let best = turn === me ? -Infinity : Infinity,
      moved = false;
    for (const col of order) {
      const at = heights[col];
      if (at < 0) continue;
      moved = true;
      board[at] = turn;
      heights[col] -= COLS;
      const value = search(other(turn), left - 1, alpha, beta, at);
      board[at] = 0;
      heights[col] += COLS;
      if (turn === me) {
        best = Math.max(best, value);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, value);
        beta = Math.min(beta, best);
      }
      if (beta <= alpha) break;
    }
    return moved ? best : 0;
  }
  let bestColumn: number | null = null,
    best = -Infinity;
  for (const col of order) {
    const at = heights[col];
    if (at < 0) continue;
    board[at] = me;
    heights[col] -= COLS;
    const value = search(
      other(me),
      Math.max(0, Math.min(7, depth) - 1),
      best,
      Infinity,
      at,
    );
    board[at] = 0;
    heights[col] += COLS;
    if (value > best) {
      best = value;
      bestColumn = col;
    }
  }
  return bestColumn;
}
export function validateFour(value: unknown): value is FourState {
  if (!value || typeof value !== "object") return false;
  const state = value as FourState;
  if (!Array.isArray(state.moves) || state.moves.length > 42) return false;
  let rebuilt = newFour();
  for (const column of state.moves) {
    const next = dropDisc(rebuilt, column);
    if (!next) return false;
    rebuilt = next;
  }
  return (
    JSON.stringify(rebuilt.board) === JSON.stringify(state.board) &&
    rebuilt.turn === state.turn &&
    rebuilt.winner === state.winner &&
    JSON.stringify(rebuilt.line) === JSON.stringify(state.line) &&
    rebuilt.last === state.last
  );
}
export function reconstruct(moves: number[]) {
  let state = newFour();
  for (const col of moves) {
    const next = dropDisc(state, col);
    if (!next) break;
    state = next;
  }
  return state;
}
