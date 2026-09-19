import MusicButton from "../shared/MusicButton";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Flower2,
  Lightbulb,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import {
  SIZE,
  KINDS,
  GARDENS,
  newGarden,
  swapGarden,
  chooseSwap,
  gardenStars,
  adjacent,
  type Turn,
} from "./engine";
import { readGarden, saveGarden } from "./save";
import { Flower } from "./Flower";
import "../shared/arcade.css";
import "./petal.css";
function progress(): Record<string, number> {
  try {
    const value = JSON.parse(
      localStorage.getItem("afterhours:petal-gardens") || "{}",
    );
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, n]) =>
            Number(key) >= 0 &&
            Number(key) < 8 &&
            [1, 2, 3].includes(Number(n)),
        )
        .map(([key, n]) => [key, Number(n)]),
    );
  } catch {
    return {};
  }
}
export default function Petal({ onScore }: GameProps) {
  const [completed, setCompleted] = useState(progress),
    [game, setGame] = useState(() => readGarden() ?? newGarden()),
    [selected, setSelected] = useState<number | null>(null);
  const [animation, setAnimation] = useState<{
      turn: Turn;
      index: number;
    } | null>(null),
    [hint, setHint] = useState<{ from: number; to: number } | null>(null),
    [sound, setSound] = useState(false),
    [notice, setNotice] = useState(
      "A little swap can make a whole garden bloom.",
    );
  const [focus, setFocus] = useState(0),
    [intro, setIntro] = useState(true);
  const audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    scored = useRef(new Set<string>()),
    boardRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ index: number; x: number; y: number } | null>(null),
    suppress = useRef(false);
  const frame = animation?.turn.frames[animation.index],
    board = frame?.board ?? game.board,
    busy = Boolean(animation),
    unlocked = Math.min(
      7,
      Math.max(-1, ...Object.keys(completed).map(Number)) + 1,
    );
  useEffect(() => {
    audio.current = createArcadeAudio();
    return () => audio.current?.dispose();
  }, []);
  useEffect(() => {
    if (!animation) return;
    const frame = animation.turn.frames[animation.index];
    if (frame.clear.length) audio.current?.play("clear");
    const timer = window.setTimeout(() => {
      if (animation.index + 1 < animation.turn.frames.length)
        setAnimation({ ...animation, index: animation.index + 1 });
      else {
        setGame(animation.turn.state);
        setNotice(
          animation.turn.valid
            ? animation.turn.state.shuffles > game.shuffles
              ? "No moves left, so a fresh breeze reshuffled your flowers for free."
              : "Lovely. Keep an eye on the flowers your garden needs."
            : "That swap needs a match of three. Try a different neighbor.",
        );
        setAnimation(null);
      }
    }, frame.duration);
    return () => clearTimeout(timer);
  }, [animation]);
  useEffect(() => saveGarden(game), [game]);
  useEffect(() => {
    if (!game.ended || scored.current.has(game.id)) return;
    scored.current.add(game.id);
    if (game.score > 0)
      onScore(
        game.score,
        game.zen
          ? "Zen garden tended"
          : `${game.won ? "Bloomed" : "Tended"} garden ${game.level + 1}`,
        game.id,
      );
    audio.current?.play(game.won ? "win" : "lose");
    if (game.won) {
      setCompleted((previous) => {
        const next = {
          ...previous,
          [game.level]: Math.max(previous[game.level] ?? 0, gardenStars(game)),
        };
        try {
          localStorage.setItem(
            "afterhours:petal-gardens",
            JSON.stringify(next),
          );
        } catch {}
        return next;
      });
    }
  }, [game.ended, game.id, onScore]);
  function open(level: number, zen = false) {
    setGame(newGarden(level, zen));
    setSelected(null);
    setHint(null);
    setAnimation(null);
    setIntro(false);
    setNotice(
      zen
        ? "Just you and the flowers. No move limit. Finish whenever you like."
        : "Collect the flowers in your garden list before your turns run out.",
    );
  }
  function move(from: number, to: number) {
    if (busy || game.ended || intro) return;
    const turn = swapGarden(game, from, to);
    setSelected(null);
    setHint(null);
    if (turn.frames.length) setAnimation({ turn, index: 0 });
  }
  function select(index: number) {
    if (busy || game.ended || intro) return;
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (selected !== null && adjacent(selected, index)) move(selected, index);
    else setSelected(index);
  }
  return (
    <div className="arcade-game petal-game">
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">GOOD THINGS GROW IN THREES</span>
          <h2>
            Petal <span>A pocket garden for your day.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="courtyard" />
          <button
            className="arcade-button icon"
            aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
            onClick={() => setSound(audio.current?.setEnabled(!sound) ?? false)}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {!intro && (
            <button
              className="arcade-button"
              onClick={() => {
                setAnimation(null);
                setIntro(true);
                setSelected(null);
              }}
            >
              <Flower2 size={14} /> Gardens
            </button>
          )}
        </div>
      </div>
      <div className="petal-layout">
        <div className="petal-board-column">
          <div className="petal-statbar">
            <div>
              <span>
                {game.zen
                  ? "QUIET GARDEN"
                  : `GARDEN ${String(game.level + 1).padStart(2, "0")}`}
              </span>
              <strong>
                {game.zen ? "Room to grow" : GARDENS[game.level].name}
              </strong>
            </div>
            <div>
              <span>SCORE</span>
              <strong>{game.score.toLocaleString()}</strong>
            </div>
            <div>
              <span>{game.zen ? "TURNS TAKEN" : "TURNS LEFT"}</span>
              <strong
                className={
                  !game.zen && game.moves <= 5 ? "petal-low-moves" : ""
                }
              >
                {game.zen ? game.turns : game.moves}
              </strong>
            </div>
          </div>
          {!game.zen && (
            <div
              className="petal-mobile-goals"
              aria-label="Garden collection targets"
            >
              {game.goals.map((goal) => (
                <div
                  key={goal.kind}
                  className={goal.collected >= goal.target ? "done" : ""}
                >
                  <Flower gem={{ id: -1, kind: goal.kind }} />
                  <span>
                    {Math.min(goal.target, goal.collected)}
                    <small>/{goal.target}</small>
                  </span>
                  <progress
                    aria-label={KINDS[goal.kind].name}
                    value={Math.min(goal.target, goal.collected)}
                    max={goal.target}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="petal-board-frame">
            <div
              ref={boardRef}
              className={`petal-board${busy ? " petal-busy" : ""}`}
              aria-label="Flower match puzzle"
              onKeyDown={(e) => {
                const directions: Record<string, [number, number]> = {
                  ArrowUp: [-1, 0],
                  ArrowDown: [1, 0],
                  ArrowLeft: [0, -1],
                  ArrowRight: [0, 1],
                };
                if (e.key === "Escape") {
                  setSelected(null);
                  return;
                }
                if (!directions[e.key]) return;
                e.preventDefault();
                const current = Number((e.target as HTMLElement).dataset.cell);
                if (!Number.isInteger(current)) return;
                const [dy, dx] = directions[e.key],
                  row = Math.max(
                    0,
                    Math.min(SIZE - 1, Math.floor(current / SIZE) + dy),
                  ),
                  col = Math.max(0, Math.min(SIZE - 1, (current % SIZE) + dx));
                boardRef.current
                  ?.querySelector<HTMLButtonElement>(
                    `[data-cell="${row * SIZE + col}"]`,
                  )
                  ?.focus();
              }}
            >
              {board.map((gem, index) => (
                <button
                  type="button"
                  key={index}
                  data-cell={index}
                  data-kind={gem?.kind ?? -1}
                  data-special={gem?.special ?? ""}
                  aria-label={`Row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}, ${gem ? KINDS[gem.kind].name : "empty"}${gem?.special ? `, ${gem.special} special` : ""}`}
                  aria-pressed={selected === index}
                  aria-disabled={busy || game.ended || intro}
                  tabIndex={focus === index ? 0 : -1}
                  onFocus={() => setFocus(index)}
                  className={`petal-cell${selected === index ? " selected" : ""}${hint && (hint.from === index || hint.to === index) ? " hinted" : ""}`}
                  onClick={() => {
                    if (!suppress.current) select(index);
                  }}
                  onPointerDown={(e) => {
                    if (busy || game.ended || intro) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    swipe.current = { index, x: e.clientX, y: e.clientY };
                  }}
                  onPointerUp={(e) => {
                    const start = swipe.current;
                    swipe.current = null;
                    if (!start) return;
                    const dx = e.clientX - start.x,
                      dy = e.clientY - start.y;
                    if (Math.hypot(dx, dy) < 18) return;
                    suppress.current = true;
                    window.setTimeout(() => (suppress.current = false), 0);
                    const target =
                      start.index +
                      (Math.abs(dx) > Math.abs(dy)
                        ? dx > 0
                          ? 1
                          : -1
                        : dy > 0
                          ? SIZE
                          : -SIZE);
                    if (adjacent(start.index, target))
                      move(start.index, target);
                  }}
                  onPointerCancel={() => (swipe.current = null)}
                />
              ))}
              <div className="petal-pieces" aria-hidden="true">
                {board.map(
                  (gem, index) =>
                    gem && (
                      <div
                        key={gem.id}
                        className={`petal-piece${frame?.clear.includes(index) ? " petal-pop" : ""}${selected === index ? " petal-lift" : ""}`}
                        style={{
                          transform: `translate(${(index % SIZE) * 100}%,${Math.floor(index / SIZE) * 100}%)`,
                        }}
                      >
                        <Flower gem={gem} />
                      </div>
                    ),
                )}
              </div>
            </div>
            {frame?.label && (
              <div
                className="petal-cascade-label"
                key={`${game.turns}-${animation?.index}`}
              >
                {frame.label}
              </div>
            )}
            {intro && (
              <div className="arcade-overlay petal-intro">
                <div className="arcade-overlay-card">
                  <Flower2 size={36} />
                  <span className="arcade-eyebrow">
                    A FRESH LITTLE OBSESSION
                  </span>
                  <div className="petal-wordmark">
                    petal<span>✳</span>
                  </div>
                  <p>
                    Swap flowers. Find your rhythm.
                    <br />
                    Make a little room for something lovely.
                  </p>
                  {game.turns > 0 && !game.ended && (
                    <button
                      className="arcade-button primary petal-resume"
                      onClick={() => {
                        setIntro(false);
                        setNotice(
                          "Right where you left it. Your garden is ready when you are.",
                        );
                      }}
                    >
                      Resume{" "}
                      {game.zen ? "Zen garden" : `garden ${game.level + 1}`}{" "}
                      <ArrowRight size={16} />
                    </button>
                  )}
                  <button
                    className={`arcade-button ${game.turns > 0 && !game.ended ? "petal-zen-button" : "primary"}`}
                    onClick={() => open(unlocked)}
                  >
                    Tend a garden <ArrowRight size={16} />
                  </button>
                  <button
                    className="arcade-button petal-zen-button"
                    onClick={() => open(0, true)}
                  >
                    Just grow · Zen mode
                  </button>
                  <span className="arcade-overlay-note">
                    Tap two neighbors or swipe a flower to swap.
                  </span>
                </div>
              </div>
            )}
            {!intro && game.ended && (
              <div className="arcade-overlay">
                <div className="arcade-overlay-card">
                  <Sparkles size={33} />
                  <span className="arcade-eyebrow">
                    {game.won
                      ? "A GARDEN, BEAUTIFULLY TENDED"
                      : game.zen
                        ? "A LITTLE TIME WELL SPENT"
                        : "EVERY GARDEN TAKES PRACTICE"}
                  </span>
                  <h3>
                    {game.won
                      ? "Look what you grew."
                      : game.zen
                        ? "That was lovely."
                        : "Another little chance?"}
                  </h3>
                  {game.won && (
                    <div
                      className="petal-stars"
                      aria-label={`${gardenStars(game)} stars`}
                    >
                      {[1, 2, 3].map((n) => (
                        <Star
                          key={n}
                          size={22}
                          fill={
                            n <= gardenStars(game) ? "currentColor" : "none"
                          }
                          opacity={n <= gardenStars(game) ? 1 : 0.3}
                        />
                      ))}
                    </div>
                  )}
                  <strong className="arcade-final-score">
                    {game.score.toLocaleString()}
                  </strong>
                  <p>
                    {game.turns} swaps · Best cascade {game.bestCascade}×
                    {game.won ? (
                      <>
                        <br />
                        {game.moves} spare turns × 100 bonus points
                      </>
                    ) : null}
                  </p>
                  <button
                    className="arcade-button primary"
                    onClick={() =>
                      open(
                        game.won ? Math.min(7, game.level + 1) : game.level,
                        game.zen,
                      )
                    }
                  >
                    {game.won && game.level < 7 ? "Next garden" : "Plant again"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="petal-board-actions">
            <p role="status">{notice}</p>
            <button
              className="arcade-button"
              disabled={busy || intro || game.ended}
              onClick={() => {
                const move = chooseSwap(game);
                setHint(move);
                setNotice(
                  "These two flowers would make a lovely match. Hints are always free.",
                );
              }}
            >
              <Lightbulb size={14} /> Hint
            </button>
            {game.zen && !intro && !game.ended && (
              <button
                className="arcade-button"
                disabled={busy || game.turns === 0}
                onClick={() => setGame((g) => ({ ...g, ended: true }))}
              >
                Finish garden
              </button>
            )}
          </div>
        </div>
        <aside className="petal-sidebar">
          <div className="petal-objectives">
            <span className="arcade-eyebrow">
              {game.zen ? "A LITTLE SPACE TO BREATHE" : "YOUR GARDEN LIST"}
            </span>
            <h3>{game.zen ? "Let it grow." : "Gather a little beauty."}</h3>
            {game.zen ? (
              <p>
                No turn limit, no target. Make lovely matches and collect your
                score whenever you’re ready.
              </p>
            ) : (
              game.goals.map((goal) => (
                <div
                  className={`petal-goal${goal.collected >= goal.target ? " done" : ""}`}
                  key={goal.kind}
                >
                  <Flower gem={{ id: -1, kind: goal.kind }} />
                  <span>
                    <strong>{KINDS[goal.kind].name}</strong>
                    <progress
                      value={Math.min(goal.target, goal.collected)}
                      max={goal.target}
                    />
                  </span>
                  <b>
                    {Math.min(goal.target, goal.collected)}
                    <small>/{goal.target}</small>
                  </b>
                </div>
              ))
            )}
          </div>
          <div className="petal-field-guide">
            <span className="arcade-eyebrow">MORE THAN A PRETTY FLOWER</span>
            <h3>Make something special.</h3>
            <p>
              <b>Match 3</b> to gather flowers.
              <br />
              <b>Match 4</b> for a whole-row or column bloom.
              <br />
              <b>Match 5</b> for a prism that gathers an entire color.
              <br />
              <b>Make a T or L</b> for a burst of nine.
            </p>
            <p>
              Swap two special flowers together for a bigger bloom. Cascades
              multiply your points. If no swaps remain, your garden reshuffles
              for free.
            </p>
          </div>
          <div className="petal-chapters">
            <span className="arcade-eyebrow">EIGHT LITTLE GARDENS</span>
            <div>
              {GARDENS.map((garden, i) => (
                <button
                  key={garden.name}
                  aria-label={`Garden ${i + 1}: ${garden.name}`}
                  disabled={i > unlocked || busy}
                  aria-current={
                    !game.zen && game.level === i ? "step" : undefined
                  }
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
