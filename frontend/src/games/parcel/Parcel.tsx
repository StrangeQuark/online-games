import MusicButton from "../shared/MusicButton";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Undo2,
  RotateCcw,
  Lightbulb,
  Volume2,
  VolumeX,
  PackageCheck,
  CalendarDays,
  Star,
  Mail,
} from "lucide-react";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import { usePreference } from "../shared/preferences";
import { DELIVERIES } from "./levels";
import {
  createDelivery,
  dailyParcel,
  moveParcel,
  undoParcel,
  walkPaths,
  neighbor,
  solveParcel,
  scoreDelivery,
  DIRECTIONS,
  type Direction,
  type Puzzle,
} from "./engine";
import {
  readParcel,
  saveParcel,
  readParcelProgress,
  saveParcelProgress,
  type ParcelSession,
} from "./save";
import ParcelBoard from "./ParcelBoard";
import "../shared/arcade.css";
import "./parcel.css";
const today = () => new Date().toISOString().slice(0, 10);
function session(puzzle: Puzzle, level: number, daily = false): ParcelSession {
  return {
    puzzle,
    level,
    daily,
    date: today(),
    state: createDelivery(puzzle),
    id: crypto.randomUUID(),
    hints: 0,
  };
}
export default function Parcel({ onScore }: GameProps) {
  const [run, setRun] = useState(() =>
    new URLSearchParams(location.hash.split("?")[1]).has("daily")
      ? session(dailyParcel(DELIVERIES), 0, true)
      : (readParcel() ?? session(DELIVERIES[0], 0)),
  );
  const [progress, setProgress] = useState(readParcelProgress),
    [hint, setHint] = useState<Direction | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(false),
    [admire, setAdmire] = useState(false),
    [facing, setFacing] = useState<Direction>("right");
  const [theme, setTheme] = usePreference("parcel-theme", "courtyard", [
      "courtyard",
      "moonlit",
    ] as const),
    root = useRef<HTMLDivElement>(null),
    audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    current = useRef(run),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    scoreRef = useRef(onScore),
    scored = useRef(new Set<string>());
  current.current = run;
  scoreRef.current = onScore;
  useEffect(() => {
    const sounds = createArcadeAudio();
    audio.current = sounds;
    return () => {
      sounds.dispose();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    saveParcel(run);
    if (!run.state.won || scored.current.has(run.id)) return;
    scored.current.add(run.id);
    audio.current?.play("win");
    const stars =
      run.hints === 0 && run.state.pushes <= run.puzzle.par
        ? 3
        : run.state.pushes <= run.puzzle.par + 5
          ? 2
          : 1;
    if (!run.daily)
      setProgress((p) => {
        const next = {
          unlocked: Math.max(p.unlocked, Math.min(11, run.level + 1)),
          stars: {
            ...p.stars,
            [run.level]: Math.max(p.stars[run.level] ?? 0, stars),
          },
        };
        saveParcelProgress(next);
        return next;
      });
    scoreRef.current(
      scoreDelivery(run.puzzle, run.state, run.hints),
      `${run.daily ? "Daily" : "Route " + (run.level + 1)} - ${run.state.pushes} pushes`,
      run.id,
    );
  }, [run]);
  function focus() {
    root.current?.focus({ preventScroll: true });
  }
  function cancelWalk() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
  }
  function choose(level: number, daily = false) {
    cancelWalk();
    setRun(
      session(
        daily ? dailyParcel(DELIVERIES) : DELIVERIES[level],
        level,
        daily,
      ),
    );
    setHint(null);
    setMessage("");
    setAdmire(false);
    focus();
  }
  function move(d: Direction) {
    const old = current.current,
      next = moveParcel(old.puzzle, old.state, d);
    setFacing(d);
    setHint(null);
    setMessage("");
    if (!next) {
      audio.current?.play("hit");
      return false;
    }
    const delivered =
      next.boxes.filter((b) => old.puzzle.goals.includes(b)).length >
      old.state.boxes.filter((b) => old.puzzle.goals.includes(b)).length;
    audio.current?.play(
      delivered ? "power" : next.pushes > old.state.pushes ? "hit" : "move",
    );
    const value = { ...old, state: next };
    current.current = value;
    setRun(value);
    return true;
  }
  function undo() {
    cancelWalk();
    const old = current.current;
    setRun({ ...old, state: undoParcel(old.puzzle, old.state) });
    setHint(null);
    setMessage("");
    setAdmire(false);
    focus();
  }
  function tap(cell: number) {
    if (busy || run.state.won) return;
    focus();
    const adjacent = DIRECTIONS.find(
      (d) => neighbor(run.puzzle, run.state.player, d) === cell,
    );
    if (adjacent) {
      move(adjacent);
      return;
    }
    if (run.state.boxes.includes(cell)) {
      setMessage("Stand next to a parcel, then tap it to push.");
      return;
    }
    const path = walkPaths(run.puzzle, run.state).get(cell);
    if (!path?.length) return;
    setBusy(true);
    const id = run.id;
    let i = 0;
    const step = () => {
      if (current.current.id !== id || i >= path.length) {
        setBusy(false);
        return;
      }
      move(path[i++]);
      timer.current = setTimeout(step, 100);
    };
    step();
  }
  function showHint() {
    if (busy || run.state.won) return;
    setBusy(true);
    setMessage("Finding a thoughtful route…");
    const old = current.current;
    timer.current = setTimeout(() => {
      if (current.current.id !== old.id) return;
      const path = solveParcel(old.puzzle, old.state, 60000);
      setBusy(false);
      if (!path?.length) {
        setHint(null);
        setMessage(
          "No route found from here. Undo a push or restart for a fresh look.",
        );
        return;
      }
      setHint(path[0]);
      setRun((r) => ({ ...r, hints: r.hints + 1 }));
      setMessage(
        `Try one step ${path[0]}. The highlighted tile starts a delivery route.`,
      );
      focus();
    }, 25);
  }
  const p = run.puzzle,
    g = run.state,
    delivered = g.boxes.filter((b) => p.goals.includes(b)).length,
    stars =
      run.hints === 0 && g.pushes <= p.par ? 3 : g.pushes <= p.par + 5 ? 2 : 1;
  return (
    <div
      className={`arcade-game parcel-game parcel-theme-${theme}`}
      ref={root}
      tabIndex={0}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.altKey ||
          (e.metaKey && e.code !== "KeyZ") ||
          (e.ctrlKey && e.code !== "KeyZ")
        )
          return;
        const mapping: Record<string, Direction> = {
          ArrowUp: "up",
          KeyW: "up",
          ArrowRight: "right",
          KeyD: "right",
          ArrowDown: "down",
          KeyS: "down",
          ArrowLeft: "left",
          KeyA: "left",
        };
        if (mapping[e.code]) {
          e.preventDefault();
          if (!busy) move(mapping[e.code]);
        } else if (e.code === "KeyZ" || e.code === "KeyU") {
          e.preventDefault();
          if (!g.won) undo();
        } else if (e.code === "KeyH" && !e.repeat) {
          e.preventDefault();
          showHint();
        }
      }}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">
            A LITTLE THOUGHT GOES A LONG WAY
          </span>
          <h2>
            Parcel <span>Every little thing has a place.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="courtyard" />
          <button
            className="arcade-button"
            onClick={() => choose(0, !run.daily)}
          >
            <CalendarDays size={15} />
            {run.daily ? "Chapter routes" : "Daily delivery"}
          </button>
          <select
            className="arcade-select"
            aria-label="Courtyard theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as typeof theme)}
          >
            <option value="courtyard">Courtyard</option>
            <option value="moonlit">Moonlit</option>
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
      <div className="parcel-route-heading">
        <div>
          <span>
            {run.daily
              ? `THE DAILY POST · ${run.date}`
              : `DELIVERY ${String(run.level + 1).padStart(2, "0")} / 12`}
          </span>
          <h2>{p.title}</h2>
          <p>{p.note}</p>
        </div>
        <div className="parcel-postmark">
          <Mail size={21} />
          <span>
            AFTERHOURS
            <br />
            POSTAL CLUB
          </span>
        </div>
      </div>
      <div className="parcel-layout">
        <div className="parcel-play-column">
          <div className="parcel-statbar">
            <div>
              <span>DELIVERED</span>
              <strong>
                {delivered}
                <small> / {p.goals.length}</small>
              </strong>
            </div>
            <div>
              <span>PUSHES</span>
              <strong>
                {g.pushes}
                <small> / {p.par} par</small>
              </strong>
            </div>
            <div>
              <span>STEPS</span>
              <strong>{g.moves}</strong>
            </div>
            <div
              className="parcel-star-meter"
              aria-label={`${stars} possible stars`}
            >
              {[0, 1, 2].map((n) => (
                <Star
                  key={n}
                  size={17}
                  fill={n < stars ? "currentColor" : "none"}
                  opacity={n < stars ? 1 : 0.35}
                />
              ))}
            </div>
          </div>
          <div className="parcel-courtyard">
            <ParcelBoard
              puzzle={p}
              state={g}
              hint={hint}
              onCell={tap}
              facing={facing}
            />
            {g.won && !admire && (
              <div className="parcel-complete">
                <PackageCheck size={30} />
                <span>ALL PRESENT AND CORRECT</span>
                <h3>A lovely little delivery.</h3>
                <div className="parcel-complete-stars">
                  {[0, 1, 2].map((n) => (
                    <Star
                      key={n}
                      size={24}
                      fill={n < stars ? "currentColor" : "none"}
                      opacity={n < stars ? 1 : 0.25}
                    />
                  ))}
                </div>
                <p>
                  {g.pushes} pushes · {g.moves} steps ·{" "}
                  {scoreDelivery(p, g, run.hints).toLocaleString()} points
                </p>
                <button
                  className="arcade-button primary"
                  onClick={() =>
                    choose(run.daily ? 0 : Math.min(11, run.level + 1))
                  }
                >
                  {run.daily
                    ? "Explore the chapter routes"
                    : run.level === 11
                      ? "Visit the last route again"
                      : "Next delivery"}
                  <ArrowRight size={16} />
                </button>
                <button className="text-button" onClick={() => setAdmire(true)}>
                  Admire the courtyard
                </button>
              </div>
            )}
          </div>
          <div className="parcel-controls">
            <button
              className="arcade-button"
              disabled={!g.history.length || g.won}
              onClick={undo}
            >
              <Undo2 size={15} />
              Undo
            </button>
            <button
              className="arcade-button"
              disabled={busy || g.won}
              onClick={showHint}
            >
              <Lightbulb size={15} />
              {busy ? "Finding route…" : "Route hint"}
            </button>
            <button
              className="arcade-button"
              onClick={() => {
                cancelWalk();
                setRun(session(p, run.level, run.daily));
                setHint(null);
                setMessage("");
                setAdmire(false);
                focus();
              }}
            >
              <RotateCcw size={14} />
              Restart
            </button>
          </div>
          <div className="parcel-message" role="status">
            {message ||
              (g.won
                ? "Signed, sealed, delivered."
                : g.moves > 0
                  ? "Route saved on this device. Undo is always welcome."
                  : "Arrow keys or WASD to walk. Tap a nearby parcel to push.")}
          </div>
          <div className="parcel-dpad" aria-label="Courier controls">
            {(
              [
                ["up", ArrowUp],
                ["left", ArrowLeft],
                ["down", ArrowDown],
                ["right", ArrowRight],
              ] as const
            ).map(([d, Icon]) => (
              <button
                key={d}
                className={`parcel-direction ${d}`}
                aria-label={`Walk ${d}`}
                disabled={busy || g.won}
                onClick={() => {
                  move(d);
                  focus();
                }}
              >
                <Icon size={22} />
              </button>
            ))}
          </div>
          {g.won && admire && (
            <button
              className="arcade-button primary parcel-next"
              onClick={() =>
                choose(run.daily ? 0 : Math.min(11, run.level + 1))
              }
            >
              Next delivery
              <ArrowRight size={16} />
            </button>
          )}
        </div>
        <aside className="parcel-side">
          <div className="parcel-field-guide">
            <span className="arcade-eyebrow">YOUR COURIER'S FIELD GUIDE</span>
            <h3>
              Room to think.
              <br />
              Room to turn.
            </h3>
            <p>
              Push every parcel onto a brass delivery pad. A parcel can only
              move into an empty space. It can be pushed, but never pulled.
            </p>
            <p>
              Tap a clear paving stone to walk there. Arrow keys or{" "}
              <b>W A S D</b> move one step. <b>U / Z</b> undoes, and <b>H</b>{" "}
              offers a route hint.
            </p>
            <p>
              Three stars: par pushes, without hints. Take your time. There is
              no clock to beat.
            </p>
            <div className="parcel-legend">
              <span>
                <i className="pad" />
                Delivery pad
              </span>
              <span>
                <i className="package" />
                Your parcels
              </span>
            </div>
          </div>
          <div className="parcel-routes">
            <span className="arcade-eyebrow">THE NEIGHBORHOOD POST</span>
            <div>
              {DELIVERIES.map((level, i) => (
                <button
                  key={level.title}
                  className={!run.daily && i === run.level ? "selected" : ""}
                  disabled={i > progress.unlocked}
                  onClick={() => choose(i)}
                  aria-label={`Delivery ${i + 1}: ${level.title}`}
                  aria-current={
                    !run.daily && i === run.level ? "step" : undefined
                  }
                >
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <span>
                    {[0, 1, 2].map((n) => (
                      <Star
                        key={n}
                        size={9}
                        fill={
                          n < (progress.stars[i] ?? 0) ? "currentColor" : "none"
                        }
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
