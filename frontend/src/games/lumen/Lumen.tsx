import MusicButton from "../shared/MusicButton";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Star,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePreference } from "../shared/preferences";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import {
  CHAPTERS,
  DIRECTIONS,
  connections,
  newCircuit,
  maskOf,
  rotate,
  turnTile,
  undoTurn,
  pinTile,
  hintTile,
  circuitScore,
  stars,
  tileName,
  minimumTurns,
  type Circuit,
} from "./engine";
import "../shared/arcade.css";
import "./lumen.css";

const SAVE_KEY = "afterhours:lumen-v1";
type Progress = Record<string, number>;
function readProgress(): { completed: Progress; game: Circuit } {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    const completed: Progress = {};
    for (const [key, value] of Object.entries(saved?.completed ?? {}))
      if (
        Number(key) >= 0 &&
        Number(key) < 12 &&
        [1, 2, 3].includes(Number(value))
      )
        completed[key] = Number(value);
    if (new URLSearchParams(location.hash.split("?")[1]).get("daily") === "1")
      return {
        completed,
        game: newCircuit(
          0,
          Number(new Date().toISOString().slice(0, 10).replaceAll("-", "")),
          true,
        ),
      };
    const next = Math.min(
      11,
      Math.max(-1, ...Object.keys(completed).map(Number)) + 1,
    );
    const active = saved?.active;
    if (
      active &&
      Number.isInteger(active.level) &&
      active.level >= 0 &&
      active.level < 12 &&
      Number.isInteger(active.seed) &&
      typeof active.daily === "boolean"
    ) {
      const g = newCircuit(active.level, active.seed, active.daily);
      if (
        Array.isArray(active.turns) &&
        active.turns.length === g.tiles.length &&
        active.turns.every(
          (v: unknown) => Number.isInteger(v) && Math.abs(Number(v)) < 100000,
        ) &&
        Number.isFinite(active.moves) &&
        active.moves >= 0 &&
        Number.isFinite(active.hints) &&
        active.hints >= 0 &&
        Number.isFinite(active.seconds) &&
        active.seconds >= 0
      ) {
        g.tiles = g.tiles.map((t, i) => ({
          ...t,
          turns: i === g.root ? 0 : active.turns[i],
          pinned: i === g.root || active.pinned?.[i] === true,
        }));
        g.moves = active.moves;
        g.hints = active.hints;
        g.seconds = active.seconds;
        if (connections(g).powered.size < g.tiles.length)
          return { completed, game: g };
      }
    }
    return { completed, game: newCircuit(next) };
  } catch {
    return { completed: {}, game: newCircuit() };
  }
}
function Trace({
  tile,
  source,
  powered,
}: {
  tile: Circuit["tiles"][number];
  source: boolean;
  powered: boolean;
}) {
  return (
    <svg className="lumen-tile-art" viewBox="0 0 100 100" aria-hidden="true">
      <circle className="lumen-rivet" cx="8" cy="8" r="1.3" />
      <circle className="lumen-rivet" cx="92" cy="92" r="1.3" />
      <g
        className="lumen-traces"
        style={{ transform: `rotate(${tile.turns * 90}deg)` }}
      >
        {DIRECTIONS.filter((d) => tile.base & d.bit).map((d) => (
          <g key={d.bit}>
            <path
              className="trace-channel"
              d={`M50 50 L${50 + d.dx * 50} ${50 + d.dy * 50}`}
            />
            <path
              className="trace-copper"
              d={`M50 50 L${50 + d.dx * 50} ${50 + d.dy * 50}`}
            />
            {powered && (
              <path
                className="trace-flow"
                d={`M${50 + d.dx * 50} ${50 + d.dy * 50} L50 50`}
              />
            )}
          </g>
        ))}
      </g>
      {source ? (
        <g className="lumen-source">
          <circle cx="50" cy="50" r="20" />
          <circle cx="50" cy="50" r="12" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M50 23V18" transform={`rotate(${i * 45} 50 50)`} />
          ))}
        </g>
      ) : (
        <>
          <circle className="lumen-socket" cx="50" cy="50" r="12" />
          <circle className="lumen-bulb" cx="50" cy="50" r="5.5" />
        </>
      )}
      {tile.pinned && !source && (
        <path
          className="lumen-pin"
          d="M78 12h10v8H78zM80 12V9a3 3 0 0 1 6 0v3"
        />
      )}
    </svg>
  );
}
export default function Lumen({ onScore }: GameProps) {
  const [theme, setTheme] = usePreference("lumen-theme", "porcelain", [
    "porcelain",
    "midnight",
  ] as const);
  const [showVictory, setShowVictory] = useState(true);
  const [initial] = useState(readProgress),
    [game, setGame] = useState(initial.game),
    [completed, setCompleted] = useState(initial.completed);
  const [pinMode, setPinMode] = useState(false),
    [sound, setSound] = useState(false),
    [hint, setHint] = useState<number | null>(null),
    [notice, setNotice] = useState(
      "Rotate a tile. Follow the light. Bring every little lamp home.",
    );
  const audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    scored = useRef(new Set<string>()),
    board = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(0);
  const { powered, leaks } = connections(game),
    percent = Math.round((powered.size / game.tiles.length) * 100),
    earned = stars(game);
  const unlocked = Math.min(
    11,
    Math.max(-1, ...Object.keys(completed).map(Number)) + 1,
  );
  useEffect(() => {
    audio.current = createArcadeAudio();
    return () => audio.current?.dispose();
  }, []);
  useEffect(() => {
    if (!game.moves || game.won) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setGame((g) => ({ ...g, seconds: g.seconds + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [game.moves > 0, game.won, game.id]);
  useEffect(() => {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          completed,
          active: game.won
            ? null
            : {
                level: game.level,
                seed: game.seed,
                daily: game.daily,
                turns: game.tiles.map((t) => t.turns),
                pinned: game.tiles.map((t) => t.pinned),
                moves: game.moves,
                hints: game.hints,
                seconds: game.seconds,
              },
        }),
      );
    } catch {}
  }, [game, completed]);
  useEffect(() => {
    if (!game.won || scored.current.has(game.id)) return;
    scored.current.add(game.id);
    audio.current?.play("win");
    onScore(
      circuitScore(game),
      game.daily
        ? "Daily circuit complete"
        : `Garden ${game.level + 1} - ${earned} stars`,
      game.id,
    );
    if (!game.daily)
      setCompleted((previous) => ({
        ...previous,
        [game.level]: Math.max(previous[game.level] ?? 0, earned),
      }));
  }, [game.won, game.id, onScore]);
  function open(level: number, daily = false) {
    const date = Number(
      new Date().toISOString().slice(0, 10).replaceAll("-", ""),
    );
    setGame(newCircuit(level, daily ? date : undefined, daily));
    setShowVictory(true);
    setHint(null);
    setPinMode(false);
    setNotice(
      daily
        ? "A shared puzzle for today. The same little spark, wherever you are."
        : "A new garden of light. Start at the glowing source.",
    );
    setFocus(0);
  }
  function turn(index: number, direction = 1) {
    if (pinMode) {
      setGame((g) => pinTile(g, index));
      return;
    }
    const next = turnTile(game, index, direction);
    if (next !== game) {
      audio.current?.play(next.won ? "clear" : "move");
      setGame(next);
      setHint(null);
      setNotice(
        "Follow the glowing paths. Every lamp belongs to the same network.",
      );
    }
  }
  function showHint() {
    const index = hintTile(game);
    if (index === null) return;
    setHint(index);
    setGame((g) => ({ ...g, hints: g.hints + 1 }));
    let turns = 0;
    while (
      turns < 4 &&
      rotate(maskOf(game.tiles[index]), turns) !== game.tiles[index].solution
    )
      turns++;
    setNotice(
      `${game.tiles[index].pinned ? "Unpin, then rotate" : "Rotate"} row ${Math.floor(index / game.size) + 1}, column ${(index % game.size) + 1} ${turns === 3 ? "once counter-clockwise" : turns === 2 ? "twice clockwise" : "once clockwise"}. Each hint costs 150 points.`,
    );
    board.current
      ?.querySelector<HTMLButtonElement>(`[data-tile="${index}"]`)
      ?.focus();
  }
  return (
    <div className={`arcade-game lumen-game lumen-${theme}`}>
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">
            A SMALL PUZZLE. A LITTLE LIGHT.
          </span>
          <h2>
            Lumen <span>No rush. Just a brighter world.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="courtyard" />
          <button
            className="arcade-button"
            onClick={() =>
              setTheme(theme === "porcelain" ? "midnight" : "porcelain")
            }
          >
            {theme === "porcelain" ? "Midnight tiles" : "Porcelain tiles"}
          </button>
          <button
            className="arcade-button icon"
            aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
            onClick={() => setSound(audio.current?.setEnabled(!sound) ?? false)}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button className="arcade-button" onClick={() => open(0, true)}>
            <CalendarDays size={14} /> Daily puzzle
          </button>
        </div>
      </div>
      <div className="lumen-layout">
        <div className="lumen-board-column">
          <div className="lumen-board-heading">
            <span>
              {game.daily
                ? "TODAY’S CIRCUIT"
                : `GARDEN ${String(game.level + 1).padStart(2, "0")} / 12`}
            </span>
            <strong>
              {game.daily
                ? new Date().toISOString().slice(0, 10)
                : CHAPTERS[game.level]}
            </strong>
            <span>
              {game.size} × {game.size}
            </span>
          </div>
          <div
            className={`lumen-board-frame${game.won ? " lumen-complete" : ""}`}
          >
            <div
              className="lumen-board"
              ref={board}
              style={{ gridTemplateColumns: `repeat(${game.size}, 1fr)` }}
              aria-label="Circuit puzzle board"
              onKeyDown={(e) => {
                const directions: Record<string, [number, number]> = {
                  ArrowUp: [-1, 0],
                  ArrowDown: [1, 0],
                  ArrowLeft: [0, -1],
                  ArrowRight: [0, 1],
                };
                if (!directions[e.key]) return;
                e.preventDefault();
                const index = Number((e.target as HTMLElement).dataset.tile);
                if (!Number.isInteger(index)) return;
                const [dy, dx] = directions[e.key],
                  row = Math.max(
                    0,
                    Math.min(game.size - 1, Math.floor(index / game.size) + dy),
                  ),
                  col = Math.max(
                    0,
                    Math.min(game.size - 1, (index % game.size) + dx),
                  );
                board.current
                  ?.querySelector<HTMLButtonElement>(
                    `[data-tile="${row * game.size + col}"]`,
                  )
                  ?.focus();
              }}
            >
              {game.tiles.map((tile, i) => (
                <button
                  type="button"
                  key={`${game.id}-${i}`}
                  data-tile={i}
                  data-mask={maskOf(tile)}
                  tabIndex={focus === i ? 0 : -1}
                  onFocus={() => setFocus(i)}
                  className={`lumen-tile${powered.has(i) ? " powered" : ""}${i === game.root ? " source" : ""}${tile.pinned ? " pinned" : ""}${hint === i ? " hint" : ""}`}
                  aria-label={tileName(game, i, powered)}
                  aria-pressed={tile.pinned}
                  onClick={(e) => turn(i, e.shiftKey ? -1 : 1)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    turn(i, -1);
                  }}
                >
                  <Trace
                    tile={tile}
                    powered={powered.has(i)}
                    source={i === game.root}
                  />
                </button>
              ))}
            </div>
            {game.won && showVictory && (
              <div className="lumen-victory">
                <span className="arcade-eyebrow">EVERYTHING, CONNECTED</span>
                <h3>You made it glow.</h3>
                <div className="lumen-stars" aria-label={`${earned} stars`}>
                  {[1, 2, 3].map((i) => (
                    <Star
                      key={i}
                      size={23}
                      fill={i <= earned ? "currentColor" : "none"}
                      opacity={i <= earned ? 1 : 0.25}
                    />
                  ))}
                </div>
                <p>
                  {circuitScore(game).toLocaleString()} points · {game.moves}{" "}
                  turns · {game.hints} hints
                </p>
                <button
                  className="arcade-button primary"
                  onClick={() =>
                    open(game.daily ? unlocked : Math.min(11, game.level + 1))
                  }
                >
                  {game.daily
                    ? "Back to the gardens"
                    : game.level === 11
                      ? "Revisit the gardens"
                      : "Next garden"}
                  <ArrowRight size={15} />
                </button>
                <button
                  className="text-button"
                  onClick={() => setShowVictory(false)}
                >
                  Admire the lights
                </button>
              </div>
            )}
          </div>
          <div className="lumen-board-tools">
            <button
              className="arcade-button"
              disabled={!game.history.length || game.won}
              onClick={() => {
                setGame(undoTurn(game));
                setHint(null);
              }}
            >
              <Undo2 size={14} /> Undo
            </button>
            <button
              className={`arcade-button${pinMode ? " pin-active" : ""}`}
              aria-pressed={pinMode}
              disabled={game.won}
              onClick={() => setPinMode((v) => !v)}
            >
              <LockKeyhole size={13} /> {pinMode ? "Pin mode on" : "Pin tiles"}
            </button>
            <button
              className="arcade-button"
              disabled={game.won}
              onClick={showHint}
            >
              <Lightbulb size={14} /> Hint
            </button>
            <button
              className="arcade-button icon"
              aria-label="Restart this puzzle"
              onClick={() => open(game.level, game.daily)}
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <p className="lumen-notice" role="status">
            {pinMode
              ? "Tap tiles to pin or unpin them. Turn off pin mode to rotate again."
              : notice}
          </p>
        </div>
        <aside className="lumen-sidebar">
          <div className="lumen-power-panel">
            <div
              className="lumen-power-orbit"
              style={
                {
                  "--power-angle": `${percent * 3.6}deg`,
                } as React.CSSProperties
              }
            >
              <div>
                <Lightbulb size={24} />
                <strong>
                  {percent}
                  <small>%</small>
                </strong>
              </div>
            </div>
            <span>LET THERE BE LIGHT</span>
            <h3>
              {powered.size} of {game.tiles.length} lamps lit
            </h3>
            <p>
              {leaks === 0
                ? "A closed circuit. Keep growing the network."
                : `${leaks} open ${leaks === 1 ? "connection" : "connections"} in the live network.`}
            </p>
          </div>
          <div className="lumen-small-stats">
            <div>
              <strong>{game.moves}</strong>
              <span>TURNS</span>
            </div>
            <div>
              <strong>
                {Math.floor(game.seconds / 60)}:
                {String(game.seconds % 60).padStart(2, "0")}
              </strong>
              <span>UNHURRIED TIME</span>
            </div>
            <div>
              <strong>{minimumTurns(game)}</strong>
              <span>TARGET TURNS</span>
            </div>
          </div>
          <div className="lumen-instructions">
            <Sparkles size={19} />
            <h3>Follow a little spark.</h3>
            <p>
              Tap a tile to turn it clockwise. Join copper paths to the glowing
              source until every lamp is lit.
            </p>
            <p>
              Right-click or Shift-click turns the other way. Pin a tile once
              you’re happy with it. Arrow keys explore; Enter rotates.
            </p>
            <span>YOUR PUZZLE SAVES AUTOMATICALLY.</span>
          </div>
          <div className="lumen-chapters">
            <span className="arcade-eyebrow">THE TWELVE GARDENS</span>
            <div>
              {CHAPTERS.map((chapter, i) => (
                <button
                  key={chapter}
                  aria-label={`Garden ${i + 1}: ${chapter}${i > unlocked ? ", locked" : ""}`}
                  aria-current={
                    !game.daily && game.level === i ? "step" : undefined
                  }
                  disabled={i > unlocked}
                  title={chapter}
                  onClick={() => open(i)}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <small>
                    {completed[i]
                      ? "★".repeat(completed[i])
                      : i > unlocked
                        ? "·"
                        : "○"}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
