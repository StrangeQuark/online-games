import MusicButton from "../shared/MusicButton";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Trophy,
} from "lucide-react";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import {
  COLORS,
  HEIGHT,
  WIDTH,
  STAGES,
  POWER_LABELS,
  launch,
  newBreaker,
  nextStage,
  stepBreaker,
  togglePause,
  type Breaker,
  type Difficulty,
} from "./engine";
import { readBreaker, saveBreaker } from "./save";
import { usePreference } from "../shared/preferences";
import { renderBreaker } from "./render";
import "../shared/arcade.css";
import "./neonbreak.css";

type Hud = Pick<
  Breaker,
  | "phase"
  | "stage"
  | "score"
  | "lives"
  | "combo"
  | "bestCombo"
  | "wide"
  | "slow"
  | "laser"
  | "shields"
  | "notice"
  | "paddle"
> & { remaining: number };
const hud = (g: Breaker): Hud => ({
  ...g,
  remaining: g.bricks.filter((b) => b.hp > 0).length,
});
export default function NeonBreak({ onScore }: GameProps) {
  const [stored] = useState(readBreaker);
  const [firstGame] = useState(() => stored ?? newBreaker());
  const game = useRef<Breaker>(firstGame);
  const canvas = useRef<HTMLCanvasElement>(null),
    root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => hud(game.current));
  const [intro, setIntro] = useState(true),
    [difficulty, setDifficulty] = useState<Difficulty>(firstGame.difficulty),
    [sound, setSound] = useState(false);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem("afterhours:neonbreak-best")) || 0;
    } catch {
      return 0;
    }
  });
  const [motion, setMotion] = usePreference("neonbreak-motion", "full", [
    "full",
    "reduced",
  ] as const);
  const settings = useRef({ motion });
  settings.current = { motion };
  const hasRun = useRef(Boolean(stored));
  const audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null);
  const keys = useRef(new Set<string>()),
    saved = useRef("");
  const scoreRef = useRef(onScore);
  scoreRef.current = onScore;
  const introRef = useRef(intro);
  introRef.current = intro;
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const sounds = createArcadeAudio();
    audio.current = sounds;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const resize = () => {
      const width = Math.min(
        1800,
        Math.max(900, c.clientWidth * Math.min(devicePixelRatio || 1, 2)),
      );
      c.width = width;
      c.height = (width * HEIGHT) / WIDTH;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    let frame = 0,
      last = performance.now(),
      lastHud = 0,
      previousHits = game.current.hits,
      previousLost = game.current.lost,
      lastSave = 0,
      wasLaunch = false,
      wasPause = false,
      previousPhase = game.current.phase;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current;
      const pad = navigator.getGamepads?.().find((p) => p?.connected);
      const axis = pad && Math.abs(pad.axes[0]) > 0.16 ? pad.axes[0] : 0;
      if (!introRef.current) {
        if (pad?.buttons[9]?.pressed && !wasPause) togglePause(g);
        if (pad?.buttons[0]?.pressed && !wasLaunch) {
          if (g.phase === "ready") launch(g);
          else if (g.phase === "paused") togglePause(g);
        }
        if (g.phase === "playing" || g.phase === "ready")
          g.target += axis * dt * 680;
      }
      wasPause = Boolean(pad?.buttons[9]?.pressed);
      wasLaunch = Boolean(pad?.buttons[0]?.pressed);
      if (keys.current.has("ArrowLeft") || keys.current.has("KeyA"))
        g.target -= dt * 680;
      if (keys.current.has("ArrowRight") || keys.current.has("KeyD"))
        g.target += dt * 680;
      if (!introRef.current) stepBreaker(g, dt);
      renderBreaker(
        ctx,
        g,
        now,
        reduced || settings.current.motion === "reduced",
      );
      if (g.hits > previousHits) sounds.play("hit");
      previousHits = g.hits;
      if (g.lost > previousLost) sounds.play("lose");
      previousLost = g.lost;
      if (g.phase !== previousPhase) {
        if (g.phase === "between" || g.phase === "won") sounds.play("win");
        if (hasRun.current) saveBreaker(g);
        previousPhase = g.phase;
      }
      if ((g.phase === "over" || g.phase === "won") && saved.current !== g.id) {
        saved.current = g.id;
        scoreRef.current(
          g.score,
          g.phase === "won"
            ? "All eight sectors cleared"
            : `Sector ${g.stage + 1} - ${g.bestCombo} combo`,
          g.id,
        );
        setBest((current) => {
          const next = Math.max(current, g.score);
          try {
            localStorage.setItem("afterhours:neonbreak-best", String(next));
          } catch {}
          return next;
        });
      }
      if (hasRun.current && !introRef.current && now - lastSave > 8000) {
        saveBreaker(g);
        lastSave = now;
      }
      c.dataset.stage = String(g.stage);
      c.dataset.phase = g.phase;
      c.dataset.ballX = String(g.balls[0]?.x ?? 0);
      c.dataset.ballY = String(g.balls[0]?.y ?? 0);
      c.dataset.paddle = String(g.paddle);
      c.dataset.bricks = String(g.bricks.filter((b) => b.hp > 0).length);
      c.dataset.score = String(g.score);
      if (now - lastHud > 80) {
        setView(hud(g));
        lastHud = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const blur = () => {
      keys.current.clear();
      if (game.current.phase === "playing") {
        game.current.phase = "paused";
        setView(hud(game.current));
      }
      if (hasRun.current) saveBreaker(game.current);
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    frame = requestAnimationFrame(tick);
    return () => {
      if (hasRun.current) saveBreaker(game.current);
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      sounds.dispose();
    };
  }, []);
  function start() {
    game.current = newBreaker(difficulty);
    hasRun.current = true;
    setIntro(false);
    introRef.current = false;
    launch(game.current);
    setView(hud(game.current));
    saveBreaker(game.current);
    focus();
  }
  function focus() {
    canvas.current?.focus({ preventScroll: true });
    if (matchMedia("(max-width:700px), (pointer:coarse)").matches)
      canvas.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function resumeRun() {
    setIntro(false);
    introRef.current = false;
    if (game.current.phase === "paused") togglePause(game.current);
    setView(hud(game.current));
    focus();
  }
  function act() {
    const g = game.current;
    if (intro) return;
    if (g.phase === "ready") launch(g);
    else if (g.phase === "paused") togglePause(g);
    setView(hud(g));
    focus();
  }
  const ended = view.phase === "over" || view.phase === "won";
  return (
    <div
      className="arcade-game neonbreak-game"
      ref={root}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        )
          return;
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "KeyA",
            "KeyD",
            "Space",
            "KeyP",
            "Escape",
          ].includes(e.code)
        ) {
          e.preventDefault();
          if (e.repeat && ["Space", "KeyP", "Escape"].includes(e.code)) return;
          keys.current.add(e.code);
          if (e.code === "Space") act();
          if (e.code === "KeyP" || e.code === "Escape") {
            togglePause(game.current);
            setView(hud(game.current));
          }
        }
      }}
      onKeyUp={(e) => keys.current.delete(e.code)}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">BREAK INTO YOUR FLOW STATE</span>
          <h2>
            Neon Break <span>Eight sectors. One more shot.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="neon" />
          <button
            className="arcade-button icon"
            aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
            onClick={() => setSound(audio.current?.setEnabled(!sound) ?? false)}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          {!intro && !ended && (
            <button
              className="arcade-button"
              onClick={() => {
                togglePause(game.current);
                setView(hud(game.current));
              }}
              disabled={view.phase !== "playing" && view.phase !== "paused"}
            >
              {view.phase === "paused" ? (
                <Play size={15} />
              ) : (
                <Pause size={15} />
              )}{" "}
              {view.phase === "paused" ? "Resume" : "Pause"}
            </button>
          )}
          {!intro && (
            <button
              className="arcade-button"
              onClick={() => {
                if (game.current.phase === "playing") togglePause(game.current);
                saveBreaker(game.current);
                setIntro(true);
                setView(hud(game.current));
              }}
            >
              <RotateCcw size={14} /> New run
            </button>
          )}
        </div>
      </div>
      <div className="arcade-statbar">
        <div>
          <span>SCORE</span>
          <strong>{view.score.toLocaleString()}</strong>
        </div>
        <div>
          <span>BEST</span>
          <strong>{Math.max(best, view.score).toLocaleString()}</strong>
        </div>
        <div>
          <span>SECTOR</span>
          <strong>
            {String(view.stage + 1).padStart(2, "0")} <small>/ 08</small>
          </strong>
        </div>
        <div className="neon-lives">
          <span>SPARKS LEFT</span>
          <strong aria-label={`${view.lives} lives`}>
            {Array.from({ length: view.lives }, (_, i) => (
              <Heart size={16} key={i} fill="currentColor" />
            ))}
          </strong>
        </div>
      </div>
      <div className="arcade-canvas-wrap neon-stage">
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="Neon Break playfield. Move the paddle with your mouse, touch, or left and right arrow keys. Space launches, P pauses."
          onPointerMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            game.current.target = ((e.clientX - box.left) / box.width) * WIDTH;
          }}
          onPointerDown={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            game.current.target = ((e.clientX - box.left) / box.width) * WIDTH;
            e.currentTarget.setPointerCapture(e.pointerId);
            act();
          }}
        />
        {!intro && view.phase === "playing" && (
          <button
            className="neon-stage-pause"
            aria-label="Pause playfield"
            onClick={() => {
              togglePause(game.current);
              setView(hud(game.current));
            }}
          >
            <Pause size={15} />
          </button>
        )}
        {intro && (
          <div className="arcade-overlay neon-intro">
            <div className="arcade-overlay-card">
              <span className="arcade-eyebrow">AN AFTERHOURS ORIGINAL</span>
              <div className="neon-wordmark">
                neon<span>break.</span>
              </div>
              <p>
                Find the angle. Chase the cascade.
                <br />
                Turn a little spark into a spectacular chain reaction.
              </p>
              <div
                className="arcade-mode-picker"
                aria-label="Choose difficulty"
              >
                {(["chill", "classic", "expert"] as const).map((d) => (
                  <button
                    key={d}
                    aria-pressed={difficulty === d}
                    onClick={() => setDifficulty(d)}
                  >
                    {d === "chill"
                      ? "Chill"
                      : d === "classic"
                        ? "Classic"
                        : "Expert"}
                    <small>
                      {d === "chill"
                        ? "5 lives · easy pace"
                        : d === "classic"
                          ? "3 lives · the original"
                          : "3 lives · fast ball"}
                    </small>
                  </button>
                ))}
              </div>
              {hasRun.current && !ended && (
                <button
                  className="arcade-button primary neon-resume"
                  onClick={resumeRun}
                >
                  <Play size={16} /> Continue saved run{" "}
                  <small>
                    Sector {view.stage + 1} · {view.score.toLocaleString()}{" "}
                    points
                  </small>
                </button>
              )}
              <button className="arcade-button primary" onClick={start}>
                Let it glow <ArrowRight size={17} />
              </button>
              <span className="arcade-overlay-note">
                Mouse · Touch · Arrow keys · Gamepad
              </span>
            </div>
          </div>
        )}
        {!intro && view.phase === "paused" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-card">
              <Pause size={32} />
              <h3>A little intermission.</h3>
              <p>Your sparks are right where you left them.</p>
              <button className="arcade-button primary" onClick={act}>
                <Play size={16} /> Resume game
              </button>
            </div>
          </div>
        )}
        {!intro && view.phase === "between" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-card">
              <Zap size={35} />
              <span className="arcade-eyebrow">SECTOR COMPLETE</span>
              <h3>{STAGES[view.stage]} cleared.</h3>
              <p>
                +{(1000 * (view.stage + 1)).toLocaleString()} bonus points.
                <br />A fresh spark awaits in the next sector.
              </p>
              <button
                className="arcade-button primary"
                onClick={() => {
                  nextStage(game.current);
                  launch(game.current);
                  setView(hud(game.current));
                  saveBreaker(game.current);
                  focus();
                }}
              >
                Next sector <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
        {!intro && ended && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-card">
              <Trophy size={35} />
              <span className="arcade-eyebrow">
                {view.phase === "won"
                  ? "ALL EIGHT SECTORS CLEARED"
                  : "THAT WAS A GOOD RUN"}
              </span>
              <h3>
                {view.phase === "won"
                  ? "An electric finish."
                  : "One more spark?"}
              </h3>
              <strong className="arcade-final-score">
                {view.score.toLocaleString()}
              </strong>
              <p>
                Sector {view.stage + 1} · Best chain: {view.bestCombo} bricks
                {view.score >= best && view.score > 0 ? (
                  <>
                    <br />
                    Your best run on this device.
                  </>
                ) : null}
              </p>
              <button className="arcade-button primary" onClick={start}>
                <RotateCcw size={16} /> Play again
              </button>
            </div>
          </div>
        )}
      </div>
      {!intro && !ended && (
        <div
          className="neon-touch-strip"
          role="slider"
          tabIndex={0}
          aria-label="Paddle position"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              e.stopPropagation();
              game.current.target += e.key === "ArrowLeft" ? -45 : 45;
            }
          }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((view.paddle / WIDTH) * 100)}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const b = e.currentTarget.getBoundingClientRect();
            game.current.target = ((e.clientX - b.left) / b.width) * WIDTH;
            act();
          }}
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType === "touch") {
              const b = e.currentTarget.getBoundingClientRect();
              game.current.target = ((e.clientX - b.left) / b.width) * WIDTH;
            }
          }}
        >
          <span>SLIDE HERE TO STEER</span>
          <i
            style={{
              left: `${Math.max(5, Math.min(95, (view.paddle / WIDTH) * 100))}%`,
            }}
          />
        </div>
      )}
      <div className="neon-underbar">
        <span>
          {STAGES[view.stage]} <i>·</i> {view.remaining} bricks to go
        </span>
        <label className="neon-motion">
          <input
            type="checkbox"
            checked={motion === "reduced"}
            onChange={(e) => setMotion(e.target.checked ? "reduced" : "full")}
          />{" "}
          Gentle motion
        </label>
        <div className="neon-active-powers">
          {(["wide", "slow", "laser"] as const).map(
            (p) =>
              view[p] > 0 && (
                <span key={p}>
                  {POWER_LABELS[p]} {Math.ceil(view[p])}s
                </span>
              ),
          )}
          {view.shields > 0 && <span>SAFETY NET ×{view.shields}</span>}
        </div>
        {!intro && view.phase === "ready" && (
          <button className="arcade-button primary" onClick={act}>
            <Play size={14} /> Launch ball
          </button>
        )}
      </div>
      <div className="arcade-guide">
        <div>
          <span className="arcade-eyebrow">
            A LITTLE FINESSE GOES A LONG WAY
          </span>
          <h3>The edge is your angle.</h3>
          <p>
            Hit the ball near the paddle’s edge to steer it. Break four bricks
            before the next paddle bounce to raise your multiplier. Catch
            glowing capsules for a helping hand. Diamond bricks trigger chain
            reactions.
          </p>
        </div>
        <div className="neon-power-guide">
          {Object.entries(POWER_LABELS).map(([key, label], i) => (
            <span key={key}>
              <b style={{ color: COLORS[i] }}>
                {["↔", "×3", "◷", "⌒", "Ⅱ"][i]}
              </b>
              {label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
