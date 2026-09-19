import { readFourMatch, saveFourMatch } from "./save";
import { useEffect, useId, useRef, useState } from "react";
import {
  Lightbulb,
  RotateCcw,
  Undo2,
  Trophy,
  ArrowDown,
  Users,
} from "lucide-react";
import type { GameProps } from "../../types";
import {
  BoardSettings,
  useBoardStyle,
  useBoardSound,
  type Difficulty,
} from "../classics/BoardSettings";
import { usePreference } from "../shared/preferences";
import {
  ROWS,
  COLS,
  newFour,
  dropDisc,
  chooseDrop,
  landing,
  validateFour,
  reconstruct,
  type Disc,
  type FourState,
} from "./engine";
import "../classics/classics.css";
import "../shared/arcade.css";
import "./fourfold.css";
const names = { 1: "Honey", 2: "Jade" };
export default function Fourfold({ onScore, network }: GameProps) {
  const roomSession = useRef(
    Boolean(new URLSearchParams(location.hash.split("?")[1]).get("room")),
  );
  const [restored] = useState(() =>
    roomSession.current ? null : readFourMatch(),
  );
  const [savedLocally, setSavedLocally] = useState(Boolean(restored));
  const [state, setState] = useState<FourState>(
      () => restored?.state ?? newFour(),
    ),
    [mode, setMode] = useState<"computer" | "local">(
      restored?.mode ?? "computer",
    ),
    [roundId, setRoundId] = useState(
      () => restored?.roundId ?? crypto.randomUUID(),
    ),
    [round, setRound] = useState(0),
    [hover, setHover] = useState<number | null>(null),
    [hint, setHint] = useState<number | null>(null),
    [notice, setNotice] = useState(
      "A small drop. A little plan. A line of four.",
    );
  const [theme, setTheme] = useBoardStyle(),
    [difficulty, setDifficulty] = usePreference<Difficulty>(
      "fourfold-difficulty",
      "club",
      ["relaxed", "club", "challenger"],
    ),
    [side, setSide] = usePreference("fourfold-side", "1", ["1", "2"] as const);
  const [sound, setSound] = useBoardSound(
    state.moves.length,
    false,
    Boolean(state.winner),
  );
  const stateRef = useRef(state),
    processedAction = useRef(-1),
    processedState = useRef(-1),
    scored = useRef(new Set<string>()),
    active = useRef(new Set<string>()),
    columnButtons = useRef<HTMLDivElement>(null);
  stateRef.current = state;
  if (network.room) roomSession.current = true;
  const online = Boolean(network.room && network.connected),
    myDisc: Disc = online
      ? network.isHost
        ? 1
        : 2
      : mode === "computer"
        ? (Number(side) as Disc)
        : 1,
    playerAllowed =
      !online || network.isHost || network.players[1]?.id === network.playerId;
  const canMove =
      !state.winner &&
      playerAllowed &&
      (online
        ? state.turn === myDisc
        : mode === "local" || state.turn === myDisc),
    maskId = useId(),
    woodId = useId();
  useEffect(() => {
    if (!online && !roomSession.current)
      setSavedLocally(saveFourMatch({ state, mode, roundId }));
  }, [state, mode, roundId, online]);
  useEffect(() => {
    setHint(null);
  }, [state]);
  useEffect(() => {
    if (online && network.isHost)
      network.sendState({ game: "fourfold", state, round, roundId });
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
      action?.game !== "fourfold" ||
      action.round !== round ||
      action.roundId !== roundId ||
      incoming.playerId !== network.players[1]?.id
    )
      return;
    if (action.type === "rematch") {
      setNotice(
        "Your opponent would love another round. Choose New round when you’re ready.",
      );
      return;
    }
    if (action.type !== "drop" || stateRef.current.turn !== 2) return;
    const next = dropDisc(stateRef.current, action.column);
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
    const data = incoming.state;
    if (
      data?.game !== "fourfold" ||
      !validateFour(data.state) ||
      !Number.isSafeInteger(data.round) ||
      typeof data.roundId !== "string" ||
      data.roundId.length > 80
    )
      return;
    setState(data.state);
    setRound(data.round);
    setRoundId(data.roundId);
  }, [network.lastState, online, network.isHost]);
  useEffect(() => {
    if (online || mode !== "computer" || state.turn === myDisc || state.winner)
      return;
    const timer = setTimeout(() => {
      const col = chooseDrop(
        state,
        { relaxed: 2, club: 4, challenger: 6 }[difficulty],
      );
      if (col !== null) {
        const next = dropDisc(state, col);
        if (next) setState(next);
      }
    }, 430);
    return () => clearTimeout(timer);
  }, [state, online, mode, myDisc, difficulty]);
  useEffect(() => {
    const observation = `${online ? network.room : "local"}:${roundId}`;
    if (!state.winner) {
      if (playerAllowed) active.current.add(observation);
      return;
    }
    if (
      !playerAllowed ||
      !active.current.has(observation) ||
      scored.current.has(roundId)
    )
      return;
    scored.current.add(roundId);
    const local = !online && mode === "local",
      won = state.winner === myDisc;
    onScore(
      state.winner === "draw"
        ? 250
        : local || won
          ? 900 + Math.max(0, 24 - state.moves.length) * 20
          : 0,
      state.winner === "draw"
        ? "A full-board draw"
        : local
          ? `Local ${names[state.winner]} won`
          : won
            ? "Fourfold victory"
            : "Fourfold well played",
      roundId,
    );
  }, [
    state.winner,
    roundId,
    online,
    network.room,
    playerAllowed,
    myDisc,
    mode,
    onScore,
  ]);
  function drop(column: number) {
    if (!canMove) return;
    if (online && !network.isHost)
      network.sendAction({
        game: "fourfold",
        type: "drop",
        column,
        round,
        roundId,
      });
    else {
      const next = dropDisc(stateRef.current, column);
      if (next) setState(next);
    }
    setHint(null);
    setNotice(
      "Look in every direction. The best line is sometimes the quiet one.",
    );
  }
  function restart() {
    if (online && !network.isHost) return;
    if (!online) roomSession.current = false;
    setSavedLocally(false);
    setState(newFour());
    setRoundId(crypto.randomUUID());
    setRound((r) => r + 1);
    setHint(null);
    setNotice("A fresh board. Make the first drop count.");
  }
  function undo() {
    if (online || !state.moves.length || state.winner) return;
    const count = mode === "computer" && state.turn === myDisc ? 2 : 1;
    setState(
      reconstruct(
        state.moves.slice(0, Math.max(0, state.moves.length - count)),
      ),
    );
    setNotice("Taken back. There’s another way to see it.");
  }
  function playerName(disc: Disc) {
    if (online) {
      const player = network.players[disc - 1];
      return player?.id === network.playerId
        ? "You"
        : player?.name || "Waiting for a friend";
    }
    return mode === "local"
      ? names[disc]
      : disc === myDisc
        ? "You"
        : "The Automaton";
  }
  const winning =
    state.winner && state.winner !== "draw"
      ? `${names[state.winner]} makes four.`
      : state.winner
        ? "A beautiful stalemate."
        : null;
  return (
    <div
      className={`arcade-game fourfold-game board-theme-${theme}`}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).matches("input,select,textarea") ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey
        )
          return;
        if (/^[1-7]$/.test(e.key)) {
          e.preventDefault();
          drop(Number(e.key) - 1);
        }
      }}
    >
      {!online && savedLocally && (
        <div className="classic-save-note">
          Match saved on this device · Leave and come back whenever you like.
        </div>
      )}
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">ONE DROP AHEAD</span>
          <h2>
            Fourfold <span>A familiar game. A fresh little rivalry.</span>
          </h2>
        </div>
        <div className="classic-mode">
          {online ? (
            <span className="classic-online">
              <i />
              Online · {names[myDisc]}
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
                  { value: "1", label: "Honey · first" },
                  { value: "2", label: "Jade · second" },
                ],
                onChange: (value) => {
                  setSide(value as "1" | "2");
                  restart();
                },
              }
            : undefined
        }
      />
      <div className="fourfold-layout">
        <div className="fourfold-board-column">
          <div className="fourfold-players">
            {([1, 2] as Disc[]).map((disc) => (
              <div
                key={disc}
                className={`fourfold-player disc-${disc}${state.turn === disc && !state.winner ? " active" : ""}`}
              >
                <i />
                <span>
                  <strong>{playerName(disc)}</strong>
                  <small>
                    {names[disc]}
                    {state.turn === disc && !state.winner
                      ? canMove
                        ? " · TO DROP"
                        : " · THINKING…"
                      : ""}
                  </small>
                </span>
                {state.turn === disc && !state.winner && (
                  <ArrowDown size={15} />
                )}
              </div>
            ))}
          </div>
          <div className="fourfold-board" onMouseLeave={() => setHover(null)}>
            <div
              className="fourfold-column-buttons"
              ref={columnButtons}
              onKeyDown={(e) => {
                const current = Number(
                  (e.target as HTMLElement).dataset.column,
                );
                if (!Number.isInteger(current)) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  drop(current);
                  return;
                }
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const direction = e.key === "ArrowRight" ? 1 : -1;
                for (let n = 1; n <= COLS; n++) {
                  const column = (current + direction * n + COLS * 2) % COLS;
                  const button =
                    columnButtons.current?.querySelector<HTMLButtonElement>(
                      `[data-column="${column}"]`,
                    );
                  if (button && !button.disabled) {
                    button.focus();
                    break;
                  }
                }
              }}
            >
              {Array.from({ length: COLS }, (_, column) => (
                <button
                  key={column}
                  data-column={column}
                  aria-label={`Drop in column ${column + 1}`}
                  disabled={!canMove || landing(state.board, column) < 0}
                  className={`${hover === column ? " hovered" : ""}${hint === column ? " hinted" : ""} disc-${state.turn}`}
                  onMouseEnter={() => setHover(column)}
                  onFocus={() => setHover(column)}
                  onClick={() => drop(column)}
                >
                  <span className="fourfold-ghost-disc" />
                  <small>{column + 1}</small>
                  <ArrowDown size={14} />
                </button>
              ))}
            </div>
            <div
              className="fourfold-well"
              role="img"
              aria-label={`Four-in-a-row board. ${state.moves.length} discs played. ${state.winner ? winning : `${names[state.turn]} to move.`}`}
            >
              <div className="fourfold-discs" aria-hidden="true">
                {state.board.map((disc, index) =>
                  disc ? (
                    <div
                      className={`fourfold-disc-wrap${state.last === index ? " just-dropped" : ""}`}
                      key={index}
                      style={
                        {
                          left: `${((index % COLS) / COLS) * 100}%`,
                          top: `${(Math.floor(index / COLS) / ROWS) * 100}%`,
                          "--fall-rows": Math.floor(index / COLS) + 1,
                        } as React.CSSProperties
                      }
                    >
                      <div
                        data-slot={index}
                        data-disc={disc}
                        className={`fourfold-disc disc-${disc}${state.line.includes(index) ? " winning" : ""}`}
                      >
                        <span>✧</span>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
              <svg
                className="fourfold-frame"
                viewBox="0 0 700 600"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={woodId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" className="fourfold-wood-light" />
                    <stop offset="50%" className="fourfold-wood-mid" />
                    <stop offset="100%" className="fourfold-wood-dark" />
                  </linearGradient>
                  <mask id={maskId}>
                    <rect width="700" height="600" fill="white" />
                    {Array.from({ length: 42 }, (_, i) => (
                      <circle
                        key={i}
                        cx={(i % 7) * 100 + 50}
                        cy={Math.floor(i / 7) * 100 + 50}
                        r="37"
                        fill="black"
                      />
                    ))}
                  </mask>
                </defs>
                <rect
                  width="700"
                  height="600"
                  fill={`url(#${woodId})`}
                  mask={`url(#${maskId})`}
                />
                {Array.from({ length: 42 }, (_, i) => (
                  <circle
                    key={i}
                    cx={(i % 7) * 100 + 50}
                    cy={Math.floor(i / 7) * 100 + 50}
                    r="38.5"
                    fill="none"
                    stroke="#e9d1a127"
                    strokeWidth="2"
                  />
                ))}
                {state.line.map((i) => (
                  <circle
                    key={i}
                    cx={(i % 7) * 100 + 50}
                    cy={Math.floor(i / 7) * 100 + 50}
                    r="41"
                    fill="none"
                    stroke="#fff0b1"
                    strokeWidth="3"
                    className="fourfold-win-ring"
                  />
                ))}
              </svg>
            </div>
            <div className="fourfold-stand">
              <span>THE AFTERHOURS TABLE CLUB</span>
            </div>
          </div>
          {state.winner && (
            <div className="fourfold-result-banner">
              <Trophy size={22} />
              <div>
                <span>{state.moves.length} DROPS · WELL PLAYED</span>
                <h3>{winning}</h3>
              </div>
            </div>
          )}
          <div className="fourfold-board-actions">
            {!online && (
              <>
                <button
                  className="arcade-button"
                  disabled={!canMove}
                  onClick={() => {
                    const column = chooseDrop(state, 4);
                    setHint(column);
                    setHover(column);
                    setNotice(
                      column === null
                        ? "The board is full."
                        : `Column ${column + 1} is worth a look. Try to build two threats at once.`,
                    );
                  }}
                >
                  <Lightbulb size={14} /> Hint
                </button>
                <button
                  className="arcade-button"
                  disabled={!state.moves.length || Boolean(state.winner)}
                  onClick={undo}
                >
                  <Undo2 size={14} /> Take back
                </button>
              </>
            )}
            <button
              className="arcade-button primary"
              onClick={
                online && !network.isHost
                  ? () => {
                      network.sendAction({
                        game: "fourfold",
                        type: "rematch",
                        round,
                        roundId,
                      });
                      setNotice(
                        "Rematch requested. Your host can start another round.",
                      );
                    }
                  : restart
              }
              disabled={online && !network.isHost && !state.winner}
            >
              <RotateCcw size={14} />
              {online && !network.isHost ? "Ask for rematch" : "New round"}
            </button>
          </div>
          <p className="fourfold-notice" role="status">
            {notice}
          </p>
        </div>
        <aside className="fourfold-sidebar">
          <div className="fourfold-guide">
            <span className="arcade-eyebrow">
              SIMPLE RULES. LOVELY TENSION.
            </span>
            <h3>Four is the magic number.</h3>
            <p>
              Drop a disc into any open column. The first line of four wins:
              across, up, or diagonally.
            </p>
            <div className="fourfold-example" aria-hidden="true">
              {[0, 1, 2, 3].map((n) => (
                <i key={n} />
              ))}
            </div>
            <p>
              Watch your opponent’s threes. Aim for the middle. And when you
              can, create two winning lines at once.
            </p>
            <div className="fourfold-guide-rule">
              <Users size={17} />
              <span>
                Play the computer, share a screen, or invite a friend into a
                private room.
              </span>
            </div>
          </div>
          <div className="fourfold-small-stats">
            <div>
              <strong>{state.moves.length}</strong>
              <span>DISCS DROPPED</span>
            </div>
            <div>
              <strong>{42 - state.moves.length}</strong>
              <span>OPEN SPACES</span>
            </div>
          </div>
          <p className="fourfold-keyboard">
            Use ← → to choose a column and Enter or ↓ to drop. Number keys 1–7
            work too.
          </p>
          <p className="fourfold-score-note">
            A win earns 900 points, plus a small bonus for a quick finish. A
            full-board draw earns 250.
          </p>
        </aside>
      </div>
    </div>
  );
}
