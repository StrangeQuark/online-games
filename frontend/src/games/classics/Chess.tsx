import { readChessMatch, saveMatch } from "./matchSave";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "../../types";
import Board from "./Board";
import { ChessPiece } from "./Pieces";
import {
  chooseChessMove,
  inCheck,
  legalChessMoves,
  moveChess,
  newChess,
  opposite,
  squareName,
  type ChessMove,
  type ChessState,
  type PieceKind,
} from "./chessRules";
import {
  BoardSettings,
  useBoardStyle,
  useBoardSound,
  difficultyDepth,
  type Difficulty,
} from "./BoardSettings";
import { usePreference } from "../shared/preferences";
import "./classics.css";

const names: Record<PieceKind, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
const draws: Record<string, string> = {
  stalemate: "Stalemate",
  repetition: "Threefold repetition",
  "fifty-move": "Fifty-move draw",
  insufficient: "Insufficient material",
};

export default function Chess({ onScore, network }: GameProps) {
  const roomSession = useRef(
    Boolean(new URLSearchParams(location.hash.split("?")[1]).get("room")),
  );
  const [restored] = useState(() =>
    roomSession.current ? null : readChessMatch(),
  );
  const [state, setState] = useState<ChessState>(
    () => restored?.state ?? newChess(),
  );
  const [savedLocally, setSavedLocally] = useState(Boolean(restored));
  const [theme, setTheme] = useBoardStyle();
  const [side, setSide] = usePreference("chess-side", "white", [
    "white",
    "black",
  ] as const);
  const [difficulty, setDifficulty] = usePreference<Difficulty>(
    "chess-difficulty",
    "club",
    ["relaxed", "club", "challenger"],
  );
  const [suggestion, setSuggestion] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [sound, setSound] = useBoardSound(
    state.lastMove,
    Boolean(state.moves.at(-1)?.includes("x")),
    state.result !== "playing",
  );
  useEffect(() => setSuggestion(null), [state]);
  const [selected, setSelected] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<ChessMove | null>(null);
  const [mode, setMode] = useState<"computer" | "local">(
    restored?.mode ?? "computer",
  );
  const [flipped, setFlipped] = useState(restored?.flipped ?? false);
  const [round, setRound] = useState(0);
  const [roundId, setRoundId] = useState(
    () => restored?.roundId ?? crypto.randomUUID(),
  );
  const [history, setHistory] = useState<ChessState[]>(restored?.history ?? []);
  const journalRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const processedAction = useRef(-1),
    processedState = useRef(-1);
  const activeRounds = useRef(new Set<string>()),
    scoredRounds = useRef(new Set<string>());
  const online = Boolean(network.room && network.connected);
  if (network.room) roomSession.current = true;
  useEffect(() => {
    if (online || roomSession.current) return;
    setSavedLocally(
      saveMatch(
        "chess",
        { mode, flipped, roundId },
        history,
        state,
        state.result !== "playing",
      ),
    );
  }, [state, history, mode, flipped, roundId, online]);
  const myColor = online
    ? network.isHost
      ? "white"
      : "black"
    : mode === "computer"
      ? side
      : "white";
  const playerAllowed =
    !online || network.isHost || network.players[1]?.id === network.playerId;
  const canMove =
    state.result === "playing" &&
    playerAllowed &&
    (online
      ? state.turn === myColor
      : mode === "local" || state.turn === myColor);
  const checked = inCheck(state);
  const legal = selected === null ? [] : legalChessMoves(state, selected);

  function commit(move: ChessMove) {
    if (!canMove) return;
    if (online && !network.isHost)
      network.sendAction({
        game: "chess",
        type: "move",
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        round,
        roundId,
      });
    else {
      const current = stateRef.current,
        next = moveChess(current, move);
      if (next) {
        if (!online) setHistory((previous) => [...previous, current]);
        setState(next);
      }
    }
    setSelected(null);
    setPromotion(null);
    if (promotion)
      window.requestAnimationFrame(() =>
        frameRef.current
          ?.querySelector<HTMLButtonElement>(`[data-square="${move.to}"]`)
          ?.focus(),
      );
  }

  function cancelPromotion() {
    const from = promotion?.from;
    setPromotion(null);
    window.requestAnimationFrame(() =>
      frameRef.current
        ?.querySelector<HTMLButtonElement>(`[data-square="${from}"]`)
        ?.focus(),
    );
  }

  useEffect(() => {
    if (online && network.isHost)
      network.sendState({ game: "chess", state, round, roundId });
  }, [state, round, roundId, online, network.isHost, network.players.length]);

  useEffect(() => {
    const incoming = network.lastAction;
    if (
      !online ||
      !network.isHost ||
      !incoming ||
      incoming.seq === processedAction.current
    )
      return;
    processedAction.current = incoming.seq;
    const action = incoming.action;
    if (
      action?.game !== "chess" ||
      action?.round !== round ||
      action?.roundId !== roundId ||
      action?.type !== "move" ||
      incoming.playerId !== network.players[1]?.id ||
      stateRef.current.turn !== "black"
    )
      return;
    if (
      !Number.isInteger(action.from) ||
      !Number.isInteger(action.to) ||
      action.from < 0 ||
      action.from > 63 ||
      action.to < 0 ||
      action.to > 63
    )
      return;
    const next = moveChess(stateRef.current, action);
    if (next) setState(next);
  }, [
    network.lastAction,
    online,
    network.isHost,
    round,
    roundId,
    network.players,
  ]);

  useEffect(() => {
    const incoming = network.lastState;
    if (
      !online ||
      network.isHost ||
      !incoming ||
      incoming.seq === processedState.current
    )
      return;
    processedState.current = incoming.seq;
    if (
      incoming.state?.game !== "chess" ||
      typeof incoming.state.roundId !== "string" ||
      !Array.isArray(incoming.state.state?.board) ||
      incoming.state.state.board.length !== 64
    )
      return;
    setState(incoming.state.state);
    setRound(incoming.state.round);
    setRoundId(incoming.state.roundId);
    setSelected(null);
  }, [network.lastState, online, network.isHost]);

  useEffect(() => {
    if (
      online ||
      mode !== "computer" ||
      state.turn === myColor ||
      state.result !== "playing"
    )
      return;
    const timer = window.setTimeout(() => {
      const move = chooseChessMove(state, difficultyDepth[difficulty]);
      if (move) {
        setHistory((previous) => [...previous, state]);
        setState(moveChess(state, move)!);
      }
    }, 430);
    return () => window.clearTimeout(timer);
  }, [state, mode, online, difficulty, myColor]);

  useEffect(() => {
    journalRef.current?.scrollTo({
      top: journalRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.moves.length]);

  function takeBack() {
    if (online || !history.length || state.result !== "playing") return;
    const count = mode === "computer" && state.turn === myColor ? 2 : 1;
    const index = Math.max(0, history.length - count);
    setState(history[index]);
    setHistory(history.slice(0, index));
    setSelected(null);
    setPromotion(null);
  }

  useEffect(() => {
    const observation = `${online ? network.room : "local"}:${roundId}`;
    if (state.result === "playing") {
      if (playerAllowed) activeRounds.current.add(observation);
      return;
    }
    if (
      !playerAllowed ||
      !activeRounds.current.has(observation) ||
      scoredRounds.current.has(roundId)
    )
      return;
    scoredRounds.current.add(roundId);
    const resultId = `chess-${roundId}`;
    if (state.result === "checkmate") {
      if (!online && mode === "local")
        onScore(
          1000,
          `Local ${opposite(state.turn)} won · Checkmate`,
          resultId,
        );
      else {
        const won = opposite(state.turn) === myColor;
        onScore(
          won ? 1000 : 0,
          won ? "Checkmate · victory" : "Checkmate · defeat",
          resultId,
        );
      }
    } else
      onScore(
        250,
        `${!online && mode === "local" ? "Local draw" : "Draw"} · ${draws[state.result]}`,
        resultId,
      );
  }, [
    state.result,
    state.turn,
    roundId,
    myColor,
    mode,
    online,
    network.room,
    playerAllowed,
    onScore,
  ]);

  function select(square: number) {
    if (!canMove) return;
    const move = legal.find((m) => m.to === square);
    if (move) {
      if (move.promotion) setPromotion(move);
      else commit(move);
    } else
      setSelected(
        state.board[square]?.color === state.turn && selected !== square
          ? square
          : null,
      );
  }

  function restart() {
    if (!online) roomSession.current = false;
    setSavedLocally(false);
    setState(newChess());
    setSelected(null);
    setPromotion(null);
    setHistory([]);
    setRound((r) => r + 1);
    setRoundId(crypto.randomUUID());
  }

  const result =
    state.result === "checkmate"
      ? `${opposite(state.turn) === "white" ? "Ivory" : "Obsidian"} wins by checkmate`
      : state.result !== "playing"
        ? `Draw · ${draws[state.result]}`
        : null;
  const boardFlipped = (myColor === "black") !== flipped;
  const bottomColor = boardFlipped ? "black" : "white",
    topColor = boardFlipped ? "white" : "black";
  function playerStrip(color: "white" | "black") {
    const name = color === "white" ? "Ivory" : "Obsidian";
    const owner = online ? network.players[color === "white" ? 0 : 1] : null;
    const human = color === myColor;
    const label = online
      ? owner?.id === network.playerId
        ? `You · ${name}`
        : owner?.name || "Waiting for a challenger"
      : mode === "computer"
        ? human
          ? `You · ${name}`
          : "The Automaton"
        : name;
    const caption =
      state.result !== "playing"
        ? "GAME COMPLETE"
        : state.turn === color
          ? !online && mode === "computer" && !human
            ? "THINKING…"
            : "TO MOVE"
          : !online && mode === "computer" && !human
            ? `COMPUTER · ${difficulty.toUpperCase()}`
            : name.toUpperCase();
    return (
      <div
        className={`board-player${state.turn === color ? " active-player" : ""}`}
      >
        <span
          className={`player-stone ${color === "white" ? "ivory" : "obsidian"}`}
        />
        <span>{label}</span>
        <span className="player-caption">{caption}</span>
      </div>
    );
  }
  const turnName = state.turn === "white" ? "Ivory" : "Obsidian";
  return (
    <div className={`classics-game chess-game board-theme-${theme}`}>
      {!online && savedLocally && (
        <div className="classic-save-note">
          Match saved on this device · Leave and come back whenever you like.
        </div>
      )}
      <div className="game-toolbar classic-toolbar">
        <div className="classic-mode">
          {online ? (
            <span className="classic-online">
              <i /> Online match · playing{" "}
              {myColor === "white" ? "Ivory" : "Obsidian"}
            </span>
          ) : (
            <>
              <button
                className={mode === "computer" ? "active" : ""}
                onClick={() => {
                  setMode("computer");
                  restart();
                }}
              >
                Vs. computer
              </button>
              <button
                className={mode === "local" ? "active" : ""}
                onClick={() => {
                  setMode("local");
                  restart();
                }}
              >
                Pass & play
              </button>
            </>
          )}
        </div>
        <div className="classic-toolbar-actions">
          {!online && (
            <button
              className="game-button"
              disabled={!canMove}
              onClick={() => {
                const move = chooseChessMove(state, 2);
                if (move) {
                  setSelected(move.from);
                  setSuggestion(move);
                }
              }}
            >
              ✧ Hint
            </button>
          )}
          {!online && (
            <button
              className="game-button"
              onClick={takeBack}
              disabled={!history.length || state.result !== "playing"}
            >
              ↶ Take back
            </button>
          )}
          <button
            className="game-button"
            onClick={() => setFlipped((v) => !v)}
            title="Rotate board"
          >
            ↻ Flip board
          </button>
          <button
            className="game-button"
            onClick={restart}
            disabled={online && !network.isHost}
          >
            New game
          </button>
        </div>
      </div>
      <BoardSettings
        theme={theme}
        setTheme={setTheme}
        sound={sound}
        setSound={setSound}
        difficulty={!online && mode === "computer" ? difficulty : undefined}
        setDifficulty={setDifficulty}
        side={
          !online && mode === "computer"
            ? {
                value: side,
                options: [
                  { value: "white", label: "Ivory" },
                  { value: "black", label: "Obsidian" },
                ],
                onChange: (value) => {
                  setSide(value as "white" | "black");
                  setFlipped(false);
                  restart();
                },
              }
            : undefined
        }
      />
      <div className="classic-play-layout">
        <div className="classic-board-column">
          {playerStrip(topColor)}
          <div className="board-frame" ref={frameRef}>
            <Board
              key={roundId}
              flipped={boardFlipped}
              selected={selected}
              destinations={legal.map((m) => m.to)}
              lastMove={state.lastMove}
              suggestion={suggestion}
              checked={
                checked
                  ? state.board.findIndex(
                      (p) => p?.kind === "k" && p.color === state.turn,
                    )
                  : undefined
              }
              pieces={state.board.flatMap((p, square) =>
                p
                  ? [
                      {
                        square,
                        id: p.id,
                        element: <ChessPiece kind={p.kind} color={p.color} />,
                      },
                    ]
                  : [],
              )}
              labels={state.board.map((p) =>
                p ? `${p.color} ${names[p.kind]}` : "",
              )}
              movable={
                canMove
                  ? [
                      ...new Set(
                        legalChessMoves(state).map((move) => move.from),
                      ),
                    ]
                  : []
              }
              onMove={(from, to) => {
                if (!canMove) return;
                const move = legalChessMoves(state, from).find(
                  (move) => move.to === to,
                );
                if (!move) return;
                if (move.promotion) setPromotion(move);
                else commit(move);
              }}
              onSquare={select}
              onClear={() => {
                setSelected(null);
                setPromotion(null);
              }}
            />
            {promotion && (
              <div
                className="promotion-overlay"
                role="dialog"
                aria-modal="true"
                aria-label="Choose promotion piece"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    cancelPromotion();
                    event.stopPropagation();
                  }
                  if (event.key === "Tab") {
                    const options = [
                      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                        "button",
                      ),
                    ];
                    const current = options.indexOf(
                      document.activeElement as HTMLButtonElement,
                    );
                    options[
                      (current + (event.shiftKey ? options.length - 1 : 1)) %
                        options.length
                    ]?.focus();
                    event.preventDefault();
                  }
                }}
              >
                <div>
                  <p>Choose your promotion</p>
                  <div className="promotion-options">
                    {(["q", "r", "b", "n"] as PieceKind[]).map((kind) => (
                      <button
                        key={kind}
                        autoFocus={kind === "q"}
                        aria-label={`Promote to ${names[kind]}`}
                        onClick={() =>
                          commit({ ...promotion, promotion: kind })
                        }
                      >
                        <ChessPiece kind={kind} color={state.turn} />
                        <span>{names[kind]}</span>
                      </button>
                    ))}
                  </div>
                  <button className="game-button" onClick={cancelPromotion}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {playerStrip(bottomColor)}
          <p className="classic-selection-note" role="status">
            {suggestion
              ? `Try ${squareName(suggestion.from)} → ${squareName(suggestion.to)}. The arrow shows a suggested move.`
              : selected !== null && state.board[selected]
                ? `${names[state.board[selected]!.kind].replace(/^./, (c) => c.toUpperCase())} on ${squareName(selected)} · ${new Set(legal.map((m) => m.to)).size} legal ${new Set(legal.map((m) => m.to)).size === 1 ? "square" : "squares"}${!legal.length ? " — choose another piece" : ". Dots move; rings capture."}`
                : checked && !result
                  ? `${turnName} is in check — protect the king.`
                  : "Arrow keys navigate · Enter selects · Esc clears"}
          </p>
        </div>
        <aside className="classic-sidebar">
          <div
            className={`classic-status-card ${result ? "finished" : ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="classic-eyebrow">
              {result ? "THE FINAL POSITION" : `MOVE ${state.fullmove}`}
            </span>
            <h3>{result || `${turnName} to move`}</h3>
            <p>
              {result
                ? "Every ending is another beginning. Start a new game when you’re ready."
                : checked
                  ? "Your king is in check. Find a safe reply."
                  : online && network.players.length < 2
                    ? "Share your room code to invite a friend."
                    : canMove
                      ? "Select a piece to see its legal moves."
                      : "Planning the next move…"}
            </p>
          </div>
          <div className="capture-record">
            <div className="classic-section-heading">
              <span>Captured pieces</span>
            </div>
            {(["black", "white"] as const).map((color) => (
              <div
                className="captured-tray"
                key={color}
                aria-label={`${color === "black" ? "Ivory" : "Obsidian"} captured ${(state.captured || []).filter((p) => p.color === color).length} pieces`}
              >
                <small>{color === "black" ? "IVORY" : "OBSIDIAN"}</small>
                {(state.captured || [])
                  .filter((p) => p.color === color)
                  .map((p) => (
                    <ChessPiece key={p.id} kind={p.kind} color={p.color} />
                  ))}
                {!(state.captured || []).some((p) => p.color === color) && (
                  <span>—</span>
                )}
              </div>
            ))}
          </div>
          <div className="move-record">
            <div className="classic-section-heading">
              <span>Move journal</span>
              <span>{state.moves.length} plies</span>
            </div>
            <div className="moves-scroll" ref={journalRef}>
              {state.moves.length ? (
                Array.from(
                  { length: Math.ceil(state.moves.length / 2) },
                  (_, i) => (
                    <div className="move-row" key={i}>
                      <span>{i + 1}.</span>
                      <span>{state.moves[i * 2]}</span>
                      <span>{state.moves[i * 2 + 1] || "—"}</span>
                    </div>
                  ),
                )
              ) : (
                <div className="empty-journal">
                  <span>♜</span>
                  <p>
                    A blank page.
                    <br />
                    Your opening awaits.
                  </p>
                </div>
              )}
            </div>
          </div>
          <details className="classic-rules">
            <summary>
              How to play <span>＋</span>
            </summary>
            <p>
              Protect your king and checkmate your opponent. Click a piece, then
              a highlighted square. Ivory moves first. The Automaton is a casual
              opponent that considers replies, captures, and king safety.
            </p>
            <p>
              Castling, en passant, and all four promotions are supported.
              Threefold repetition and the fifty-move rule are automatically
              drawn. Use arrow keys to navigate the board and Enter to select.
            </p>
            <p>
              Victory: 1,000 points. Draw: 250 points. Pass & play awards
              completion points and records the winning side as a local match
              result. Create a room above to play online.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
