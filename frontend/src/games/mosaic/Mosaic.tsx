import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Undo2,
  RotateCcw,
  CalendarDays,
  Volume2,
  VolumeX,
  BookmarkCheck,
  Trophy,
  Flower2,
} from "lucide-react";
import type { GameProps } from "../../types";
import MusicButton from "../shared/MusicButton";
import { createArcadeAudio } from "../shared/arcadeAudio";
import { usePreference } from "../shared/preferences";
import {
  newMosaic,
  readMosaic,
  saveMosaic,
  slide,
  undoMosaic,
  highest,
  canMove,
  dayKey,
  type Direction,
} from "./engine";
import "../shared/arcade.css";
import "./mosaic.css";
const descriptions: Record<number, string> = {
  2: "A little beginning",
  4: "Two become something new",
  8: "A pattern is forming",
  16: "Finding your rhythm",
  32: "Good things take shape",
  64: "Made with a little patience",
  128: "Something worth keeping",
  256: "A lovely piece of work",
  512: "Quite a collection",
  1024: "One more beautiful pairing",
  2048: "Your masterpiece",
};
export default function Mosaic({ onScore }: GameProps) {
  const [game, setGame] = useState(() =>
    new URLSearchParams(location.hash.split("?")[1]).has("daily")
      ? newMosaic(4, dayKey())
      : (readMosaic() ?? newMosaic()),
  );
  const [sound, setSound] = useState(false),
    [theme, setTheme] = usePreference("mosaic-theme", "studio", [
      "studio",
      "moonlight",
    ]);
  const [saved, setSaved] = useState(false),
    [confirm, setConfirm] = useState<"new" | "bank" | null>(null),
    [notice, setNotice] = useState(
      "Slide the tiles. Pair the numbers. Make something lovely.",
    );
  const [mode, setMode] = useState(
    game.daily ? "daily" : game.size === 5 ? "spacious" : "classic",
  );
  const [best, setBest] = useState(() => {
    try {
      const value = Number(localStorage.getItem("afterhours:mosaic-best") || 0);
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  });
  const root = useRef<HTMLDivElement>(null),
    audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    scoreRef = useRef(onScore),
    scored = useRef(new Set<string>()),
    current = useRef(game),
    gesture = useRef<{ x: number; y: number } | null>(null),
    lastMove = useRef(0);
  current.current = game;
  scoreRef.current = onScore;
  const top = highest(game),
    stuck = !canMove(game);
  useEffect(() => {
    if (confirm || game.ended || stuck)
      root.current
        ?.querySelector<HTMLButtonElement>(".mosaic-overlay button")
        ?.focus();
  }, [confirm, game.ended, stuck]);
  useEffect(() => {
    const a = createArcadeAudio();
    audio.current = a;
    return () => a.dispose();
  }, []);
  useEffect(() => {
    setSaved(saveMosaic(game));
    if (game.score > best) {
      setBest(game.score);
      try {
        localStorage.setItem("afterhours:mosaic-best", String(game.score));
      } catch {
        /* Session best remains available. */
      }
    }
    if (game.ended && !scored.current.has(game.id)) {
      scored.current.add(game.id);
      audio.current?.play("win");
      scoreRef.current(
        game.score,
        `${game.daily ? "Daily" : game.size === 5 ? "Spacious" : "Classic"} - ${top} tile`,
        game.id,
      );
    }
  }, [game]);

  function focus() {
    root.current?.focus({ preventScroll: true });
  }
  function move(direction: Direction) {
    if (
      confirm ||
      current.current.ended ||
      performance.now() - lastMove.current < 105
    )
      return;
    lastMove.current = performance.now();
    const next = slide(current.current, direction);
    if (!next) {
      setNotice("Those tiles are settled. Try another direction.");
      return;
    }
    current.current = next;
    setGame(next);
    audio.current?.play(next.gain ? "clear" : "move");
    setNotice(
      next.gain
        ? `A lovely fit. +${next.gain} points.`
        : "A little room for something new.",
    );
  }
  function undo() {
    const next = undoMosaic(current.current);
    if (next) {
      current.current = next;
      setGame(next);
      setNotice("One step back. A fresh way to see it.");
      audio.current?.play("move");
      focus();
    }
  }
  function start() {
    const next = newMosaic(
      mode === "spacious" ? 5 : 4,
      mode === "daily" ? dayKey() : null,
    );
    current.current = next;
    setGame(next);
    setConfirm(null);
    setNotice(
      mode === "daily"
        ? "Today's tiles start the same for everyone. Find your own way through."
        : "A clean little canvas. Make the first move yours.",
    );
    focus();
  }
  function bank() {
    if (!game.moves) return;
    setGame({ ...game, ended: true });
    setConfirm(null);
    focus();
  }
  const directions: [Direction, typeof ArrowUp][] = [
    ["up", ArrowUp],
    ["left", ArrowLeft],
    ["down", ArrowDown],
    ["right", ArrowRight],
  ];
  return (
    <div
      ref={root}
      tabIndex={0}
      className={`arcade-game mosaic-game mosaic-${theme}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && confirm) {
          e.preventDefault();
          setConfirm(null);
          focus();
          return;
        }
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        )
          return;
        const dirs: Record<string, Direction> = {
          ArrowUp: "up",
          w: "up",
          ArrowDown: "down",
          s: "down",
          ArrowLeft: "left",
          a: "left",
          ArrowRight: "right",
          d: "right",
        };
        if (dirs[e.key]) {
          e.preventDefault();
          move(dirs[e.key]);
        }
        if (e.key.toLowerCase() === "u" || e.key.toLowerCase() === "z") {
          e.preventDefault();
          undo();
        }
      }}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">
            SMALL PIECES. LOVELY POSSIBILITIES.
          </span>
          <h2>
            Mosaic <span>A little room to make something.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="courtyard" />
          <select
            aria-label="Mosaic palette"
            className="arcade-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as "studio" | "moonlight")}
          >
            <option value="studio">Sunlit studio</option>
            <option value="moonlight">Moonlit tiles</option>
          </select>
          <button
            className="arcade-button icon"
            aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
            onClick={() => setSound(audio.current?.setEnabled(!sound) ?? false)}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>
      <div className="mosaic-layout">
        <div className="mosaic-workspace">
          <div className="mosaic-heading">
            <div>
              <span className="arcade-eyebrow">
                {game.daily
                  ? `DAILY STUDIO · ${game.daily}`
                  : game.size === 5
                    ? "A LITTLE MORE ROOM · 5 × 5"
                    : "THE LITTLE STUDIO · 4 × 4"}
              </span>
              <h2>
                {descriptions[Math.min(2048, top)] ||
                  "Your growing masterpiece"}
              </h2>
            </div>
            <Flower2 size={33} />
          </div>
          <div className="mosaic-scorebar">
            <div>
              <span>YOUR SCORE</span>
              <strong>{game.score.toLocaleString()}</strong>
            </div>
            <div>
              <span>PERSONAL BEST</span>
              <strong>{best.toLocaleString()}</strong>
            </div>
            <div>
              <span>LARGEST TILE</span>
              <strong>{top.toLocaleString()}</strong>
            </div>
          </div>
          <div className="mosaic-frame">
            <div
              className="mosaic-board"
              role="group"
              aria-label={`${game.size} by ${game.size} Mosaic board`}
              data-moves={game.moves}
              data-score={game.score}
              data-ended={game.ended}
              style={{ "--size": game.size } as CSSProperties}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest(".mosaic-overlay"))
                  return;
                if (e.button !== 0) return;
                gesture.current = { x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
                focus();
              }}
              onPointerUp={(e) => {
                if (!gesture.current) return;
                const dx = e.clientX - gesture.current.x,
                  dy = e.clientY - gesture.current.y;
                gesture.current = null;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
                move(
                  Math.abs(dx) > Math.abs(dy)
                    ? dx > 0
                      ? "right"
                      : "left"
                    : dy > 0
                      ? "down"
                      : "up",
                );
              }}
              onPointerCancel={() => {
                gesture.current = null;
              }}
            >
              <div className="mosaic-spaces" aria-hidden="true">
                {Array.from({ length: game.size ** 2 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              {game.tiles.map((t) => (
                <div
                  key={t.id}
                  className={`mosaic-tile mosaic-value-${Math.min(2048, t.value)}${game.merged.includes(t.id) ? " merged" : ""}${game.spawned === t.id ? " spawned" : ""}`}
                  data-value={t.value}
                  data-position={t.pos}
                  aria-label={`${t.value}, row ${Math.floor(t.pos / game.size) + 1}, column ${(t.pos % game.size) + 1}`}
                  style={
                    {
                      "--x": t.pos % game.size,
                      "--y": Math.floor(t.pos / game.size),
                    } as CSSProperties
                  }
                >
                  <div key={t.value}>
                    <span className="mosaic-tile-mark" aria-hidden="true">
                      {["✧", "✦", "❋", "✿"][Math.log2(t.value) % 4]}
                    </span>
                    <strong>{t.value.toLocaleString()}</strong>
                    <span className="mosaic-tile-corner" aria-hidden="true">
                      ✧
                    </span>
                  </div>
                </div>
              ))}
              {(game.ended || stuck || confirm) && (
                <div
                  className="mosaic-overlay"
                  role="region"
                  aria-label={
                    game.ended
                      ? "Completed mosaic"
                      : confirm
                        ? "Confirm action"
                        : "No more room"
                  }
                >
                  <div>
                    {game.ended ? (
                      <>
                        <Trophy size={30} />
                        <span className="arcade-eyebrow">
                          A LITTLE WORK OF ART
                        </span>
                        <h3>Beautifully made.</h3>
                        <strong className="mosaic-final-score">
                          {game.score.toLocaleString()}
                        </strong>
                        <p>
                          {top.toLocaleString()} tile · {game.moves} moves
                          <br />
                          Your finished board is in your scorebook.
                        </p>
                        <button
                          className="arcade-button primary"
                          onClick={start}
                        >
                          Make another <ArrowRight size={15} />
                        </button>
                      </>
                    ) : confirm ? (
                      <>
                        <h3>
                          {confirm === "new"
                            ? "A fresh little canvas?"
                            : "Keep this little masterpiece?"}
                        </h3>
                        <p>
                          {confirm === "new"
                            ? "This replaces your unfinished board. You can keep its score first, or stay a little longer."
                            : "Save this score and finish the board. Your next mosaic starts fresh."}
                        </p>
                        <button
                          className="arcade-button primary"
                          onClick={confirm === "new" ? start : bank}
                        >
                          {confirm === "new" ? "Start fresh" : "Keep my score"}
                        </button>
                        <button
                          className="arcade-button"
                          onClick={() => {
                            setConfirm(null);
                            focus();
                          }}
                        >
                          Keep playing
                        </button>
                      </>
                    ) : (
                      <>
                        <Flower2 size={28} />
                        <h3>Every little space is full.</h3>
                        <p>
                          You've made something lovely. Rewind a move, or keep
                          your finished score.
                        </p>
                        {game.undos > 0 && game.history.length > 0 && (
                          <button className="arcade-button" onClick={undo}>
                            <Undo2 size={14} />
                            Rewind · {game.undos} left
                          </button>
                        )}
                        <button
                          className="arcade-button primary"
                          onClick={bank}
                        >
                          Keep my score <BookmarkCheck size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mosaic-controls">
            <button
              className="arcade-button"
              disabled={
                !game.undos ||
                !game.history.length ||
                game.ended ||
                Boolean(confirm)
              }
              onClick={undo}
            >
              <Undo2 size={14} />
              Rewind · {game.undos}
            </button>
            <span>
              {game.moves} {game.moves === 1 ? "move" : "moves"}
            </span>
            <button
              className="arcade-button"
              disabled={!game.moves || game.ended || Boolean(confirm)}
              onClick={() => setConfirm("bank")}
            >
              <BookmarkCheck size={14} />
              Keep score
            </button>
          </div>
          <p className="mosaic-notice" role="status">
            {notice}
          </p>
          <div className="mosaic-dpad" aria-label="Slide the tiles">
            {directions.map(([direction, Icon]) => (
              <button
                key={direction}
                className={direction}
                aria-label={`Slide ${direction}`}
                disabled={game.ended || Boolean(confirm)}
                onClick={() => {
                  move(direction);
                  focus();
                }}
              >
                <Icon size={21} />
              </button>
            ))}
          </div>
          <p className="mosaic-saved">
            {saved && !game.ended
              ? "Saved on this device. Come back whenever you like."
              : "Arrow keys or WASD · Swipe the board · U to rewind"}
          </p>
        </div>
        <aside className="mosaic-side">
          <div className="mosaic-story">
            <img
              src="/assets/mosaic.webp"
              alt="A ceramic tile puzzle in a sunlit artist's studio"
            />
            <div>
              <span className="arcade-eyebrow">THE ART OF MAKING ROOM</span>
              <h3>
                Two small things.
                <br />
                One lovely possibility.
              </h3>
              <p>
                Slide the whole board. When two equal numbers meet, they become
                one: 2 and 2 make 4. A fresh tile arrives after every move.
              </p>
              <p>
                Build toward <b>2,048</b> and beyond. Keep your largest tile in
                a corner, leave room to move, and take your time.
              </p>
              <p>
                Three rewinds, just in case. No clock to beat. <b>Keep score</b>{" "}
                finishes your board whenever you're happy with it.
              </p>
            </div>
          </div>
          <div className="mosaic-new">
            <span className="arcade-eyebrow">A CANVAS FOR EVERY MOOD</span>
            <div className="mosaic-mode-picker">
              {[
                [
                  "classic",
                  "The little studio",
                  "4 × 4 · A familiar challenge",
                ],
                [
                  "spacious",
                  "Room to breathe",
                  "5 × 5 · More space to explore",
                ],
                ["daily", "Today's mosaic", "Same first tiles for everyone"],
              ].map(([id, title, sub]) => (
                <button
                  key={id}
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                >
                  {id === "daily" ? (
                    <CalendarDays size={16} />
                  ) : (
                    <Flower2 size={16} />
                  )}
                  <span>
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>
                </button>
              ))}
            </div>
            <button
              className="arcade-button"
              onClick={() =>
                game.moves && !game.ended ? setConfirm("new") : start()
              }
            >
              <RotateCcw size={14} />
              {mode === "daily" ? "Start today's mosaic" : "Start a new mosaic"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
