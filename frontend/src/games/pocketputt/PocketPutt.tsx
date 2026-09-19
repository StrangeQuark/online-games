import MusicButton from "../shared/MusicButton";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Flag,
  RotateCcw,
  Volume2,
  VolumeX,
  Undo2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import { usePreference } from "../shared/preferences";
import {
  WIDTH,
  HEIGHT,
  HOLES,
  newGolf,
  currentHole,
  putt,
  updateGolf,
  nextHole,
  mulligan,
  holeLabel,
  type Golf,
} from "./engine";
import { renderGolf, type Aim } from "./render";
import { readGolf, saveGolf, readGolfRecord, saveGolfRecord } from "./save";
import "../shared/arcade.css";
import "./pocketputt.css";
const heading = (g: Golf) =>
  Math.atan2(currentHole(g).cup.y - g.ball.y, currentHole(g).cup.x - g.ball.x);
const snapshot = (g: Golf) => ({
  phase: g.phase,
  hole: g.hole,
  strokes: g.strokes,
  results: [...g.results],
  score: g.score,
  mulligans: g.mulligans,
  notice: g.notice,
  daily: g.daily,
  order: [...g.order],
});
export default function PocketPutt({ onScore }: GameProps) {
  const [initial] = useState(() => readGolf() ?? newGolf()),
    game = useRef(initial),
    canvas = useRef<HTMLCanvasElement>(null),
    [view, setView] = useState(() => snapshot(initial)),
    [intro, setIntro] = useState(true),
    [sound, setSound] = useState(false),
    [best, setBest] = useState(readGolfRecord);
  const [preview, setPreview] = usePreference("golf-preview", "on", [
      "on",
      "off",
    ] as const),
    [aim, setAim] = useState<Aim>({
      angle: heading(initial),
      power: 0.45,
      preview: preview === "on",
      dragging: false,
    });
  const aimRef = useRef(aim),
    introRef = useRef(intro),
    audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    scoreRef = useRef(onScore),
    scored = useRef("");
  aimRef.current = { ...aim, preview: preview === "on" };
  introRef.current = intro;
  scoreRef.current = onScore;
  const drag = useRef<{ x: number; y: number; nearBall: boolean } | null>(null);
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const sounds = createArcadeAudio();
    audio.current = sounds;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      c.width = Math.round(c.clientWidth * Math.min(2, devicePixelRatio || 1));
      c.height = Math.round((c.width * HEIGHT) / WIDTH);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    let frame = 0,
      last = performance.now(),
      lastHud = 0,
      previousPhase = game.current.phase;
    const tick = (now: number) => {
      const g = game.current,
        dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!introRef.current) updateGolf(g, dt);
      renderGolf(ctx, g, aimRef.current, now, reduced);
      for (const event of g.events)
        sounds.play(
          event === "cup"
            ? "win"
            : event === "water"
              ? "lose"
              : event === "portal"
                ? "power"
                : "hit",
        );
      g.events = [];
      if (g.phase !== previousPhase) {
        if (g.phase === "aiming") {
          setAim((a) => ({ ...a, angle: heading(g), dragging: false }));
          saveGolf(g);
        }
        if (g.phase === "sunk" || g.phase === "finished") saveGolf(g);
        previousPhase = g.phase;
      }
      if (g.phase === "finished" && scored.current !== g.id) {
        scored.current = g.id;
        scoreRef.current(
          g.score,
          `${g.daily ? "Daily" : "Garden"} golf · ${g.results.length}/9 holes · ${g.results.reduce((a, b) => a + b, 0)} strokes`,
          g.id,
        );
        if (g.results.length === 9)
          setBest((previous) => {
            const record = {
              strokes: g.results.reduce((a, b) => a + b, 0),
              score: g.score,
            };
            if (
              !previous ||
              record.strokes < previous.strokes ||
              (record.strokes === previous.strokes &&
                record.score > previous.score)
            ) {
              saveGolfRecord(record);
              return record;
            }
            return previous;
          });
      }
      c.dataset.phase = g.phase;
      c.dataset.hole = String(g.hole);
      c.dataset.ballX = String(g.ball.x);
      c.dataset.ballY = String(g.ball.y);
      c.dataset.strokes = String(g.strokes);
      c.dataset.score = String(g.score);
      if (now - lastHud > 75) {
        setView(snapshot(g));
        lastHud = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sounds.dispose();
    };
  }, []);
  function focus() {
    canvas.current?.focus({ preventScroll: true });
    if (innerWidth <= 700 || matchMedia("(pointer:coarse)").matches)
      canvas.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function start(daily = false) {
    game.current = newGolf(daily);
    setIntro(false);
    introRef.current = false;
    setAim((a) => ({
      ...a,
      angle: heading(game.current),
      power: 0.45,
      dragging: false,
    }));
    setView(snapshot(game.current));
    saveGolf(game.current);
    focus();
  }
  function hit() {
    if (introRef.current) return;
    if (putt(game.current, aimRef.current.angle, aimRef.current.power)) {
      setAim((a) => ({ ...a, dragging: false }));
      setView(snapshot(game.current));
      audio.current?.play("move");
      focus();
    }
  }
  function advance() {
    nextHole(game.current);
    setAim((a) => ({
      ...a,
      angle: heading(game.current),
      power: 0.45,
      dragging: false,
    }));
    setView(snapshot(game.current));
    saveGolf(game.current);
    focus();
  }
  function retry() {
    if (mulligan(game.current)) {
      setAim((a) => ({ ...a, angle: heading(game.current), dragging: false }));
      setView(snapshot(game.current));
      saveGolf(game.current);
    }
  }
  function position(e: React.PointerEvent<HTMLCanvasElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) / box.width) * WIDTH,
      y: ((e.clientY - box.top) / box.height) * HEIGHT,
    };
  }
  const hole = HOLES[view.order[view.hole]],
    total = view.results.reduce((a, b) => a + b, 0),
    par = view.order
      .slice(0, view.results.length)
      .reduce((sum, i) => sum + HOLES[i].par, 0),
    relative = total - par,
    aiming = view.phase === "aiming" && !intro;
  return (
    <div
      className="arcade-game pocketputt-game"
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey
        )
          return;
        if (!aiming) return;
        const step = ((e.shiftKey ? 1 : 3) * Math.PI) / 180;
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Space",
            "KeyU",
          ].includes(e.code)
        )
          e.preventDefault();
        if (e.code === "ArrowLeft")
          setAim((a) => ({ ...a, angle: a.angle - step }));
        if (e.code === "ArrowRight")
          setAim((a) => ({ ...a, angle: a.angle + step }));
        if (e.code === "ArrowUp")
          setAim((a) => ({ ...a, power: Math.min(1, a.power + 0.025) }));
        if (e.code === "ArrowDown")
          setAim((a) => ({ ...a, power: Math.max(0.01, a.power - 0.025) }));
        if (e.code === "Space" && !e.repeat) hit();
        if (e.code === "KeyU" && !e.repeat) retry();
      }}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">
            SMALL COURSE. LOVELY POSSIBILITIES.
          </span>
          <h2>
            Pocket Putt{" "}
            <span>A little garden, one gentle stroke at a time.</span>
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
              disabled={view.phase === "rolling"}
              onClick={() => setIntro(true)}
            >
              <Flag size={14} /> Clubhouse
            </button>
          )}
        </div>
      </div>
      <div className="putt-layout">
        <div className="putt-course-column">
          <div className="putt-hole-heading">
            <div>
              <span>
                {view.daily ? "DAILY ROUND" : "THE GARDEN COURSE"} · HOLE{" "}
                {view.hole + 1}
              </span>
              <h3>{hole.name}</h3>
            </div>
            <div>
              <span>PAR</span>
              <strong>{hole.par}</strong>
            </div>
            <div>
              <span>STROKES</span>
              <strong>{view.strokes}</strong>
            </div>
          </div>
          <div className="putt-stage">
            <canvas
              ref={canvas}
              tabIndex={0}
              aria-label="Miniature golf course. Tap to aim, drag back to putt, or use arrow keys and Space."
              onPointerDown={(e) => {
                if (!aiming) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                const p = position(e);
                drag.current = {
                  ...p,
                  nearBall:
                    Math.hypot(
                      p.x - game.current.ball.x,
                      p.y - game.current.ball.y,
                    ) < 50,
                };
                canvas.current?.focus({ preventScroll: true });
              }}
              onPointerMove={(e) => {
                const start = drag.current;
                if (!start || !aiming) return;
                const p = position(e),
                  origin = start.nearBall ? game.current.ball : start,
                  dx = origin.x - p.x,
                  dy = origin.y - p.y;
                if (Math.hypot(dx, dy) < 6) return;
                const next = {
                  ...aimRef.current,
                  angle: Math.atan2(dy, dx),
                  power: Math.min(1, Math.hypot(dx, dy) / 160),
                  dragging: true,
                };
                aimRef.current = next;
                setAim(next);
              }}
              onPointerUp={(e) => {
                const start = drag.current;
                drag.current = null;
                if (!start || !aiming) return;
                if (aimRef.current.dragging) hit();
                else {
                  const p = position(e);
                  setAim((a) => ({
                    ...a,
                    angle: Math.atan2(
                      p.y - game.current.ball.y,
                      p.x - game.current.ball.x,
                    ),
                    dragging: false,
                  }));
                }
              }}
              onPointerCancel={() => {
                drag.current = null;
                setAim((a) => ({ ...a, dragging: false }));
              }}
            />
            {intro && (
              <div className="arcade-overlay putt-intro">
                <div className="arcade-overlay-card">
                  <span className="arcade-eyebrow">
                    WELCOME TO THE LITTLE CLUB
                  </span>
                  <div className="putt-wordmark">
                    pocket<span>putt.</span>
                  </div>
                  <p>
                    Nine tiny gardens. A few clever corners.
                    <br />
                    Take a breath, find your line, and let it roll.
                  </p>
                  {(game.current.strokes > 0 ||
                    game.current.results.length > 0) &&
                    game.current.phase !== "finished" && (
                      <button
                        className="arcade-button primary"
                        onClick={() => {
                          setIntro(false);
                          introRef.current = false;
                          focus();
                        }}
                      >
                        Continue your round <ArrowRight size={15} />
                      </button>
                    )}
                  <div className="putt-start-actions">
                    <button
                      className={`arcade-button ${game.current.strokes || game.current.results.length ? "" : "primary"}`}
                      onClick={() => start(false)}
                    >
                      Play nine holes <ArrowRight size={15} />
                    </button>
                    <button
                      className="arcade-button"
                      onClick={() => start(true)}
                    >
                      <CalendarDays size={14} /> Daily round
                    </button>
                  </div>
                  <span className="arcade-overlay-note">
                    Tap to aim. Pull back to putt. Three mulligans, just in
                    case.
                  </span>
                </div>
              </div>
            )}
            {!intro && view.phase === "sunk" && (
              <div className="putt-hole-result">
                <Flag size={27} />
                <span className="arcade-eyebrow">
                  HOLE {view.hole + 1} COMPLETE
                </span>
                <h3>{holeLabel(view.strokes, hole.par)}</h3>
                <p>
                  {view.strokes} {view.strokes === 1 ? "stroke" : "strokes"} ·
                  Par {hole.par}
                </p>
                <button className="arcade-button primary" onClick={advance}>
                  {view.hole === 8
                    ? "See your scorecard"
                    : "Next little garden"}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
            {!intro && view.phase === "finished" && (
              <div className="arcade-overlay">
                <div className="arcade-overlay-card">
                  <Flag size={30} />
                  <span className="arcade-eyebrow">
                    A LITTLE TIME WELL SPENT
                  </span>
                  <h3>Lovely round.</h3>
                  <strong className="arcade-final-score">
                    {view.score.toLocaleString()}
                  </strong>
                  <p>
                    {view.results.length} holes · {total} strokes ·{" "}
                    {relative === 0
                      ? "Even par"
                      : `${relative > 0 ? "+" : ""}${relative} to par`}
                    <br />
                    Come back whenever the day needs a little green.
                  </p>
                  <button
                    className="arcade-button primary"
                    onClick={() => start(view.daily)}
                  >
                    <RotateCcw size={15} /> Another round
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="putt-controls">
            <div className="putt-aim-controls">
              <button
                className="arcade-button icon"
                aria-label="Aim left"
                disabled={!aiming}
                onClick={() =>
                  setAim((a) => ({ ...a, angle: a.angle - Math.PI / 36 }))
                }
              >
                <ChevronLeft size={17} />
              </button>
              <label>
                AIM
                <input
                  aria-label="Aim angle"
                  type="range"
                  min="0"
                  max="359"
                  step="1"
                  value={
                    ((Math.round((aim.angle * 180) / Math.PI) % 360) + 360) %
                    360
                  }
                  disabled={!aiming}
                  onChange={(e) =>
                    setAim((a) => ({
                      ...a,
                      angle: (Number(e.target.value) * Math.PI) / 180,
                    }))
                  }
                />
              </label>
              <button
                className="arcade-button icon"
                aria-label="Aim right"
                disabled={!aiming}
                onClick={() =>
                  setAim((a) => ({ ...a, angle: a.angle + Math.PI / 36 }))
                }
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <label className="putt-power">
              POWER <b>{Math.round(aim.power * 100)}%</b>
              <input
                aria-label="Putt power"
                type="range"
                min="1"
                max="100"
                value={Math.round(aim.power * 100)}
                disabled={!aiming}
                onChange={(e) =>
                  setAim((a) => ({ ...a, power: Number(e.target.value) / 100 }))
                }
              />
            </label>
            <button
              className="arcade-button primary putt-hit"
              disabled={!aiming}
              onClick={hit}
            >
              {view.phase === "rolling" ? "Rolling…" : "Putt"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="putt-underbar">
            <p role="status">{view.notice}</p>
            <button
              className="arcade-button"
              disabled={
                !aiming ||
                !view.strokes ||
                !view.mulligans ||
                game.current.strokes <= game.current.lastStrokes
              }
              onClick={retry}
            >
              <Undo2 size={14} /> Mulligan · {view.mulligans}
            </button>
          </div>
        </div>
        <aside className="putt-sidebar">
          <div className="putt-scorecard">
            <span className="arcade-eyebrow">YOUR LITTLE SCORECARD</span>
            <h3>Make a round of it.</h3>
            <div className="putt-scorecard-head">
              <span>HOLE</span>
              <span>PAR</span>
              <span>YOU</span>
            </div>
            {view.order.map((index, i) => (
              <div
                key={i}
                className={`putt-scorecard-row${view.hole === i ? " current" : ""}${view.results[i] && view.results[i] <= HOLES[index].par ? " under-par" : ""}`}
              >
                <span>
                  {String(i + 1).padStart(2, "0")}{" "}
                  <small>{HOLES[index].name}</small>
                </span>
                <span>{HOLES[index].par}</span>
                <strong>{view.results[i] ?? "—"}</strong>
              </div>
            ))}
            <div className="putt-total">
              <span>{view.results.length}/9 HOLES</span>
              <strong>
                {total || "—"}{" "}
                <small>
                  {total
                    ? relative === 0
                      ? "E"
                      : `${relative > 0 ? "+" : ""}${relative}`
                    : ""}
                </small>
              </strong>
            </div>
            {best && (
              <p className="putt-best">
                PERSONAL BEST · {best.strokes} STROKES
              </p>
            )}
          </div>
          <div className="putt-field-guide">
            <span className="arcade-eyebrow">A FEW CLUB RULES</span>
            <p>
              Tap the course to aim, then choose your power and <b>Putt</b>. Or
              pull back and release anywhere on the green.
            </p>
            <p>
              Stone walls bank your shot. Sand slows it. Water adds one penalty
              stroke. Brass bumpers bounce; paired rings are portals.
            </p>
            <label>
              <input
                type="checkbox"
                checked={preview === "on"}
                onChange={(e) => setPreview(e.target.checked ? "on" : "off")}
              />{" "}
              Show my putting line
            </label>
            <p className="putt-keyboard">
              ← → aim · ↑ ↓ power · Space putt · U mulligan
            </p>
            {!intro && view.results.length > 0 && view.phase !== "finished" && (
              <button
                className="arcade-button"
                disabled={view.phase === "rolling"}
                onClick={() => {
                  game.current.phase = "finished";
                  setView(snapshot(game.current));
                }}
              >
                Finish round & save score
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
