import { readCheckersMatch, saveMatch } from "./matchSave";
import { useEffect, useRef, useState } from "react";
import type { GameProps } from "../../types";
import Board from "./Board";
import { CheckerPiece } from "./Pieces";
import { squareName } from "./chessRules";
import {
  chooseCheckerMove,
  legalCheckerMoves,
  moveChecker,
  newCheckers,
  type CheckersState,
  type CheckerMove,
} from "./checkersRules";
import {
  BoardSettings,
  useBoardStyle,
  useBoardSound,
  difficultyDepth,
  type Difficulty,
} from "./BoardSettings";
import { usePreference } from "../shared/preferences";
import "./classics.css";

export default function Checkers({ onScore, network }: GameProps) {
  const roomSession = useRef(
    Boolean(new URLSearchParams(location.hash.split("?")[1]).get("room")),
  );
  const [restored] = useState(() =>
    roomSession.current ? null : readCheckersMatch(),
  );
  const [state, setState] = useState<CheckersState>(
    () => restored?.state ?? newCheckers(),
  );
  const [savedLocally, setSavedLocally] = useState(Boolean(restored));
  const [theme, setTheme] = useBoardStyle();
  const [side, setSide] = usePreference("checkers-side", "red", [
    "red",
    "black",
  ] as const);
  const [difficulty, setDifficulty] = usePreference<Difficulty>(
    "checkers-difficulty",
    "club",
    ["relaxed", "club", "challenger"],
  );
  const [suggestion, setSuggestion] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [sound, setSound] = useBoardSound(
    state.lastMove,
    Boolean(
      state.lastMove &&
      Math.abs(
        Math.floor(state.lastMove.from / 8) - Math.floor(state.lastMove.to / 8),
      ) === 2,
    ),
    Boolean(state.winner),
  );
  useEffect(() => setSuggestion(null), [state]);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<"computer" | "local">(
    restored?.mode ?? "computer",
  );
  const [flipped, setFlipped] = useState(restored?.flipped ?? false);
  const [round, setRound] = useState(0);
  const [roundId, setRoundId] = useState(
    () => restored?.roundId ?? crypto.randomUUID(),
  );
  const [history, setHistory] = useState<CheckersState[]>(
    restored?.history ?? [],
  );
  const [notice, setNotice] = useState("");
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
        "checkers",
        { mode, flipped, roundId },
        history,
        state,
        Boolean(state.winner),
      ),
    );
  }, [state, history, mode, flipped, roundId, online]);
  const myColor = online
    ? network.isHost
      ? "red"
      : "black"
    : mode === "computer"
      ? side
      : "red";
  const playerAllowed =
    !online || network.isHost || network.players[1]?.id === network.playerId;
  const canMove =
    !state.winner &&
    playerAllowed &&
    (online
      ? state.turn === myColor
      : mode === "local" || state.turn === myColor);
  const moves = legalCheckerMoves(state),
    available = moves.filter((m) => m.from === (state.forcedFrom ?? selected));
  const red = state.board.filter((p) => p?.color === "red"),
    black = state.board.filter((p) => p?.color === "black");

  useEffect(() => {
    if (online && network.isHost)
      network.sendState({ game: "checkers", state, round, roundId });
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
      action?.game !== "checkers" ||
      action?.round !== round ||
      action?.roundId !== roundId ||
      action?.type !== "move" ||
      incoming.playerId !== network.players[1]?.id ||
      stateRef.current.turn !== "black"
    )
      return;
    if (!Number.isInteger(action.from) || !Number.isInteger(action.to)) return;
    const next = moveChecker(stateRef.current, action.from, action.to);
    if (next) setState(next);
  }, [
    network.lastAction,
    online,
    network.isHost,
    network.players,
    round,
    roundId,
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
      incoming.state?.game !== "checkers" ||
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
    if (online || mode !== "computer" || state.turn === myColor || state.winner)
      return;
    const timer = window.setTimeout(() => {
      const move = chooseCheckerMove(state, difficultyDepth[difficulty] + 1);
      if (move) {
        setHistory((previous) => [...previous, state]);
        setState(moveChecker(state, move.from, move.to)!);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, mode, online, difficulty, myColor]);

  useEffect(() => {
    const observation = `${online ? network.room : "local"}:${roundId}`;
    if (!state.winner) {
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
    const resultId = `checkers-${roundId}`;
    if (!online && mode === "local")
      onScore(
        state.winner === "draw" ? 200 : 800,
        state.winner === "draw"
          ? "Local draw · forty quiet turns"
          : `Local ${state.winner === "red" ? "copper" : "jade"} won`,
        resultId,
      );
    else
      onScore(
        state.winner === "draw" ? 200 : state.winner === myColor ? 800 : 0,
        state.winner === "draw"
          ? "Draw · forty quiet turns"
          : state.winner === myColor
            ? "Victory · board conquered"
            : "Defeat · well played",
        resultId,
      );
  }, [
    state.winner,
    roundId,
    myColor,
    mode,
    online,
    network.room,
    playerAllowed,
    onScore,
  ]);

  function commitMove(move: CheckerMove) {
    if (!canMove) return;
    if (online && !network.isHost)
      network.sendAction({
        game: "checkers",
        type: "move",
        from: move.from,
        to: move.to,
        round,
        roundId,
      });
    else {
      const current = stateRef.current,
        next = moveChecker(current, move.from, move.to);
      if (next) {
        if (!online) setHistory((previous) => [...previous, current]);
        setState(next);
      }
    }
    setSelected(null);
    setNotice("");
  }

  function select(square: number) {
    if (!canMove) return;
    const move = available.find((m) => m.to === square);
    if (move) {
      commitMove(move);
    } else if (state.forcedFrom === null) {
      if (
        state.board[square]?.color === state.turn &&
        !moves.some((m) => m.from === square)
      )
        setNotice(
          moves.some((m) => m.capture !== null)
            ? "A jump is mandatory. Choose a checker marked ! to capture."
            : "This checker has no legal move. Choose another piece.",
        );
      else setNotice("");
      setSelected(
        selected !== square && moves.some((m) => m.from === square)
          ? square
          : null,
      );
    } else
      setNotice(
        `Continue jumping with the checker on ${squareName(state.forcedFrom)}.`,
      );
  }

  function takeBack() {
    if (online || !history.length || state.winner) return;
    let index = history.length - 1;
    // Return to the beginning of the human turn, including all forced jumps.
    while (
      index > 0 &&
      (history[index].forcedFrom !== null ||
        (mode === "computer" && history[index].turn !== myColor))
    )
      index--;
    setState(history[index]);
    setHistory(history.slice(0, index));
    setSelected(null);
    setNotice("Move taken back. Try another line.");
  }

  function restart() {
    if (!online) roomSession.current = false;
    setSavedLocally(false);
    setState(newCheckers());
    setSelected(null);
    setHistory([]);
    setNotice("");
    setRound((r) => r + 1);
    setRoundId(crypto.randomUUID());
  }
  const title =
    state.winner === "draw"
      ? "A hard-fought draw"
      : state.winner
        ? `${state.winner === "red" ? "Copper" : "Jade"} takes the board`
        : `${state.turn === "red" ? "Copper" : "Jade"} to move`;
  const boardFlipped = (myColor === "black") !== flipped;
  const bottomColor = boardFlipped ? "black" : "red",
    topColor = boardFlipped ? "red" : "black";
  function playerStrip(color: "red" | "black") {
    const name = color === "red" ? "Copper" : "Jade";
    const owner = online ? network.players[color === "red" ? 0 : 1] : null;
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
    const caption = Boolean(state.winner)
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
          className={`player-stone ${color === "red" ? "copper" : "jade"}`}
        />
        <span>{label}</span>
        <span className="player-caption">{caption}</span>
      </div>
    );
  }
  return (
    <div className={`classics-game checkers-game board-theme-${theme}`}>
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
              {myColor === "red" ? "Copper" : "Jade"}
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
                const move = chooseCheckerMove(state, 4);
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
              disabled={!history.length || Boolean(state.winner)}
            >
              ↶ Take back
            </button>
          )}
          <button
            className="game-button"
            onClick={() => setFlipped((value) => !value)}
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
                  { value: "red", label: "Copper" },
                  { value: "black", label: "Jade" },
                ],
                onChange: (value) => {
                  setSide(value as "red" | "black");
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
          <div className="board-frame">
            <Board
              key={roundId}
              kind="checkers"
              flipped={boardFlipped}
              selected={state.forcedFrom ?? selected}
              destinations={available.map((m) => m.to)}
              lastMove={state.lastMove}
              suggestion={suggestion}
              pieces={state.board.flatMap((p, square) =>
                p
                  ? [
                      {
                        square,
                        id: p.id,
                        element: (
                          <CheckerPiece king={p.king} red={p.color === "red"} />
                        ),
                      },
                    ]
                  : [],
              )}
              labels={state.board.map((p) =>
                p
                  ? `${p.color === "red" ? "copper" : "jade"} ${p.king ? "king" : "checker"}`
                  : "",
              )}
              movable={
                canMove ? [...new Set(moves.map((move) => move.from))] : []
              }
              onMove={(from, to) => {
                const move = moves.find(
                  (move) => move.from === from && move.to === to,
                );
                if (move) commitMove(move);
              }}
              onSquare={select}
              onClear={() => {
                setSelected(null);
                setNotice("");
              }}
              emphasized={
                canMove
                  ? [
                      ...new Set(
                        moves
                          .filter((m) => m.capture !== null)
                          .map((m) => m.from),
                      ),
                    ]
                  : []
              }
            />
          </div>
          {playerStrip(bottomColor)}
          <p className="classic-selection-note" role="status">
            {suggestion
              ? `Try ${squareName(suggestion.from)} → ${squareName(suggestion.to)}. The arrow shows a suggested move.`
              : notice ||
                (state.forcedFrom !== null
                  ? `Continue from ${squareName(state.forcedFrom)} — the capture sequence is still your turn.`
                  : selected !== null
                    ? `${squareName(selected)} selected · ${available.length} legal ${available.length === 1 ? "square" : "squares"}`
                    : "Arrow keys navigate · Enter selects · Esc clears")}
          </p>
        </div>
        <aside className="classic-sidebar">
          <div
            className={`classic-status-card ${state.winner ? "finished" : ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="classic-eyebrow">
              {state.winner
                ? "THE FINAL POSITION"
                : `TURN ${Math.floor(state.moves / 2) + 1}`}
            </span>
            <h3>{title}</h3>
            <p>
              {state.winner
                ? "Well played. The board is ready for another story."
                : state.forcedFrom !== null
                  ? "Keep jumping! Complete the capture with the same piece."
                  : moves.some((m) => m.capture !== null)
                    ? "A capture is available. In this house, jumps are mandatory."
                    : canMove
                      ? "Select a checker, then a highlighted square."
                      : online && network.players.length < 2
                        ? "Share the room code to invite a friend."
                        : "Considering the possibilities…"}
            </p>
          </div>
          <div className="checker-scoreboard">
            <div>
              <CheckerPiece king={false} red />
              <strong>{red.length}</strong>
              <span>COPPER</span>
              <small>{red.filter((p) => p?.king).length} kings</small>
            </div>
            <div>
              <CheckerPiece king={false} red={false} />
              <strong>{black.length}</strong>
              <span>JADE</span>
              <small>{black.filter((p) => p?.king).length} kings</small>
            </div>
          </div>
          <div className="classic-tip">
            <span>THE LONG GAME</span>
            <p>
              Own the center. Guard your back row. And never underestimate a
              quiet little checker.
            </p>
          </div>
          <details className="classic-rules">
            <summary>
              How to play <span>＋</span>
            </summary>
            <p>
              American checkers, on an 8 × 8 board. Copper moves first. Men move
              and capture diagonally forward. Reach the far edge to become a
              king, able to move and capture in either direction.
            </p>
            <p>
              Jumps are mandatory, and a capture sequence must be completed. A
              newly crowned king ends its turn. Take every opposing piece, or
              leave your opponent without a legal move, to win. Forty turns
              without a capture or promotion are a draw.
            </p>
            <p>
              Victory: 800 points. Draw: 200 points. Pass & play awards
              completion points and records the winning side as a local match
              result. Play the computer or invite a friend to an online room.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
