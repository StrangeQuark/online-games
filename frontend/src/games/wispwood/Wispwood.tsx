import MusicButton from "../shared/MusicButton";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Leaf,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Zap,
  Flag,
  RotateCcw,
} from "lucide-react";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import { usePreference } from "../shared/preferences";
import {
  GROVES,
  newWisp,
  startWisp,
  pauseWisp,
  nextGrove,
  updateWisp,
  groveOf,
  type Wisp,
} from "./engine";
import { renderWisp } from "./render";
import { readWisp, saveWisp, readWispProgress, saveWispProgress } from "./save";
import "../shared/arcade.css";
import "./wispwood.css";
const hud = (g: Wisp) => ({
  phase: g.phase,
  level: g.level,
  lanterns: g.lanterns.length,
  score: g.score,
  time: g.time,
  totalTime: g.totalTime,
  deaths: g.totalDeaths,
  dash: g.dashCooldown,
  checkpoint: g.checkpoint.platform,
  cleared: g.cleared,
});
const formatTime = (t: number) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export default function Wispwood({ onScore }: GameProps) {
  const [first] = useState(() => readWisp() ?? newWisp()),
    game = useRef(first),
    canvas = useRef<HTMLCanvasElement>(null),
    [view, setView] = useState(() => hud(first)),
    [menu, setMenu] = useState(true),
    [sound, setSound] = useState(false),
    [progress, setProgress] = useState(readWispProgress);
  const [motion, setMotion] = usePreference("wispwood-motion", "full", [
      "full",
      "reduced",
    ] as const),
    settings = useRef({ motion });
  settings.current = { motion };
  const keys = useRef(new Set<string>()),
    touch = useRef(new Map<number, string>()),
    audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    menuRef = useRef(menu),
    scoreRef = useRef(onScore),
    saved = useRef("");
  menuRef.current = menu;
  scoreRef.current = onScore;
  useEffect(() => {
    const c = canvas.current,
      ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const sounds = createArcadeAudio();
    audio.current = sounds;
    const background = new Image();
    background.src = "/assets/wispwood.webp";
    const prefersReduced = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    let frame = 0,
      last = performance.now(),
      lastHud = 0,
      previousPhase = game.current.phase,
      lastSave = 0,
      wasStart = false;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current,
        held = new Set([...keys.current, ...touch.current.values()]),
        pad = navigator.getGamepads?.().find((p) => p?.connected),
        axis = pad && Math.abs(pad.axes[0]) > 0.18 ? pad.axes[0] : 0;
      if (pad?.buttons[9]?.pressed && !wasStart && !menuRef.current) {
        pauseWisp(g);
        keys.current.clear();
        touch.current.clear();
      }
      wasStart = Boolean(pad?.buttons[9]?.pressed);
      if (!menuRef.current)
        updateWisp(
          g,
          {
            move:
              Number(held.has("ArrowRight") || held.has("KeyD")) -
                Number(held.has("ArrowLeft") || held.has("KeyA")) || axis,
            jump:
              held.has("Space") ||
              held.has("ArrowUp") ||
              held.has("KeyW") ||
              Boolean(pad?.buttons[0]?.pressed),
            dash:
              held.has("ShiftLeft") ||
              held.has("ShiftRight") ||
              held.has("KeyX") ||
              Boolean(pad?.buttons[2]?.pressed),
          },
          dt,
        );
      for (const event of g.events) {
        sounds.play(
          event === "clear"
            ? "win"
            : event === "fall"
              ? "lose"
              : event === "lantern" || event === "checkpoint"
                ? "power"
                : event === "jump"
                  ? "move"
                  : "clear",
        );
        if (event === "lantern" || event === "checkpoint") saveWisp(g);
      }
      g.events = [];
      if (g.phase === "clear" && previousPhase !== "clear") {
        setProgress((p) => {
          const next = {
            ...p,
            unlocked: Math.max(p.unlocked, Math.min(7, g.level + 1)),
          };
          saveWispProgress(next);
          return next;
        });
        saveWisp(g);
      }
      if (g.phase === "complete" && saved.current !== g.id) {
        saved.current = g.id;
        scoreRef.current(
          g.score,
          `${g.cleared} groves · ${formatTime(g.totalTime)} · ${g.totalDeaths} tumbles`,
          g.id,
        );
        saveWisp(g);
        setProgress((p) => {
          const next = { ...p, best: Math.max(p.best, g.score) };
          saveWispProgress(next);
          return next;
        });
      }
      previousPhase = g.phase;
      if (g.phase === "playing" && now - lastSave > 10000) {
        saveWisp(g);
        lastSave = now;
      }
      renderWisp(
        ctx,
        g,
        now,
        background,
        prefersReduced || settings.current.motion === "reduced",
      );
      c.dataset.phase = g.phase;
      c.dataset.level = String(g.level);
      c.dataset.x = String(g.x);
      c.dataset.y = String(g.y);
      c.dataset.vx = String(g.vx);
      c.dataset.vy = String(g.vy);
      c.dataset.ground = String(g.ground ?? -1);
      c.dataset.jumps = String(g.jumps);
      c.dataset.lanterns = JSON.stringify(g.lanterns);
      c.dataset.respawn = String(g.respawn);
      c.dataset.checkpoint = String(g.checkpoint.platform);
      c.dataset.time = String(g.time);
      if (now - lastHud > 75) {
        setView(hud(g));
        lastHud = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const blur = () => {
      keys.current.clear();
      touch.current.clear();
      if (game.current.phase === "playing") {
        pauseWisp(game.current);
        saveWisp(game.current);
        setView(hud(game.current));
      }
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      sounds.dispose();
      saveWisp(game.current);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  function focus() {
    canvas.current?.focus({ preventScroll: true });
    if (innerWidth <= 700 || matchMedia("(pointer:coarse)").matches)
      canvas.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function start(level = 0) {
    game.current = newWisp(level);
    startWisp(game.current);
    setMenu(false);
    menuRef.current = false;
    keys.current.clear();
    touch.current.clear();
    setView(hud(game.current));
    saveWisp(game.current);
    focus();
  }
  function resume() {
    setMenu(false);
    menuRef.current = false;
    startWisp(game.current);
    setView(hud(game.current));
    focus();
  }
  function pause() {
    pauseWisp(game.current);
    keys.current.clear();
    touch.current.clear();
    setView(hud(game.current));
    if (game.current.phase === "playing") focus();
  }
  function next() {
    nextGrove(game.current);
    keys.current.clear();
    touch.current.clear();
    setView(hud(game.current));
    saveWisp(game.current);
    focus();
  }
  function control(
    label: string,
    key: string,
    icon: React.ReactNode,
    className = "",
  ) {
    return (
      <button
        className={`wisp-touch-button ${className}`}
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          touch.current.set(e.pointerId, key);
        }}
        onPointerUp={(e) => touch.current.delete(e.pointerId)}
        onPointerCancel={(e) => touch.current.delete(e.pointerId)}
        onLostPointerCapture={(e) => touch.current.delete(e.pointerId)}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }
  const canResume =
    game.current.phase !== "intro" && game.current.phase !== "complete";
  return (
    <div
      className="arcade-game wispwood-game"
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey
        )
          return;
        const controls = [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "KeyA",
          "KeyD",
          "KeyW",
          "Space",
          "ShiftLeft",
          "ShiftRight",
          "KeyX",
          "KeyP",
          "Escape",
        ];
        if (!controls.includes(e.code)) return;
        e.preventDefault();
        if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) {
          pause();
          return;
        }
        keys.current.add(e.code);
      }}
      onKeyUp={(e) => keys.current.delete(e.code)}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">THE FOREST LEFT A LIGHT ON</span>
          <h2>
            Wispwood <span>A small journey. A brave little leaf.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="forest" />
          <button
            className="arcade-button icon"
            aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
            onClick={() => setSound(audio.current?.setEnabled(!sound) ?? false)}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {!menu && (view.phase === "playing" || view.phase === "paused") && (
            <button className="arcade-button" onClick={pause}>
              {view.phase === "paused" ? (
                <Play size={14} />
              ) : (
                <Pause size={14} />
              )}
              {view.phase === "paused" ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </div>
      <div className="wisp-statbar">
        <div>
          <span>THE JOURNEY</span>
          <strong>
            {String(view.level + 1).padStart(2, "0")} <small>/ 08</small>
          </strong>
        </div>
        <div className="wisp-lantern-count">
          <span>LITTLE LIGHTS</span>
          <strong>
            {[0, 1, 2].map((n) => (
              <i key={n} className={n < view.lanterns ? "lit" : ""}>
                ✧
              </i>
            ))}
          </strong>
        </div>
        <div>
          <span>SCORE</span>
          <strong>{view.score.toLocaleString()}</strong>
        </div>
        <div className="wisp-dash-meter">
          <span>DASH</span>
          <strong>
            <Zap size={16} />
            {view.dash > 0 ? "Growing back" : "Ready"}
          </strong>
        </div>
      </div>
      <div className="wisp-stage">
        <canvas
          ref={canvas}
          tabIndex={0}
          aria-label="Wispwood forest platform game. A D or arrows move; Space or up jumps twice; Shift or X dashes; P pauses."
        />
        {!menu && view.phase === "playing" && (
          <button
            className="wisp-stage-pause"
            aria-label="Pause journey"
            onClick={pause}
          >
            <Pause size={18} />
          </button>
        )}
        {menu && (
          <div className="arcade-overlay wisp-intro">
            <div className="arcade-overlay-card">
              <Leaf size={30} />
              <span className="arcade-eyebrow">
                A LITTLE COURAGE GOES A LONG WAY
              </span>
              <div className="wisp-wordmark">
                wispwood<span>✧</span>
              </div>
              <p>
                Somewhere beyond the ferns, a window is glowing.
                <br />
                Gather the little lights. Find your way home.
              </p>
              {canResume && (
                <button className="arcade-button primary" onClick={resume}>
                  Continue your journey <ArrowRight size={16} />
                </button>
              )}
              <button
                className={`arcade-button ${canResume ? "wisp-menu-button" : "primary"}`}
                onClick={() => start(0)}
              >
                Into the woods <ArrowRight size={16} />
              </button>
              <span className="arcade-overlay-note">
                Eight quiet groves · Double jump · Dash · Gentle checkpoints
              </span>
              {progress.best > 0 && (
                <p className="wisp-best">
                  YOUR LOVELIEST JOURNEY · {progress.best.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
        {!menu && view.phase === "paused" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-card">
              <Leaf size={30} />
              <span className="arcade-eyebrow">
                EVEN LITTLE ADVENTURES NEED A BREATH
              </span>
              <h3>The forest will wait.</h3>
              <p>Your lights and checkpoint are saved.</p>
              <button className="arcade-button primary" onClick={pause}>
                <Play size={15} /> Carry on
              </button>
              <button
                className="arcade-button wisp-menu-button"
                onClick={() => setMenu(true)}
              >
                Back to the clearing
              </button>
              {view.cleared > 0 && (
                <button
                  className="arcade-button wisp-menu-button"
                  onClick={() => {
                    game.current.phase = "complete";
                    setView(hud(game.current));
                  }}
                >
                  Finish journey & save score
                </button>
              )}
            </div>
          </div>
        )}
        {!menu && view.phase === "clear" && (
          <div className="arcade-overlay wisp-clear">
            <div className="arcade-overlay-card">
              <span className="wisp-three-lights">✧ ✧ ✧</span>
              <span className="arcade-eyebrow">
                {groveOf(game.current).name.toUpperCase()} · COMPLETE
              </span>
              <h3>Every little light matters.</h3>
              <p>
                {formatTime(view.time)} in the grove · {view.deaths} tumbles
                along the way
                <br />
                Your next little adventure is waiting.
              </p>
              <button className="arcade-button primary" onClick={next}>
                {view.level === 7
                  ? "A light in the window"
                  : "On to the next grove"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
        {!menu && view.phase === "complete" && (
          <div className="arcade-overlay">
            <div className="arcade-overlay-card">
              <Flag size={30} />
              <span className="arcade-eyebrow">
                THE FOREST REMEMBERS YOUR FOOTSTEPS
              </span>
              <h3>
                {view.cleared === 8
                  ? "You brought the light home."
                  : "A lovely little journey."}
              </h3>
              <strong className="arcade-final-score">
                {view.score.toLocaleString()}
              </strong>
              <p>
                {view.cleared} groves · {formatTime(view.totalTime)} ·{" "}
                {view.deaths} gentle restarts
              </p>
              <button
                className="arcade-button primary"
                onClick={() => start(0)}
              >
                <RotateCcw size={15} /> Walk the woods again
              </button>
            </div>
          </div>
        )}
      </div>
      {!menu && view.phase === "playing" && (
        <div className="wisp-touch-controls">
          <div>
            {control("Left", "ArrowLeft", <ArrowLeft size={24} />)}
            {control("Right", "ArrowRight", <ArrowRight size={24} />)}
          </div>
          <div>
            {control("Dash", "ShiftLeft", <Zap size={20} />)}
            {control("Jump", "Space", <ArrowUp size={25} />, "jump")}
          </div>
        </div>
      )}
      <div className="wisp-underbar">
        <span>Falls are just little pauses. Keep every lantern you find.</span>
        <label>
          <input
            type="checkbox"
            checked={motion === "reduced"}
            onChange={(e) => setMotion(e.target.checked ? "reduced" : "full")}
          />{" "}
          Gentle motion
        </label>
      </div>
      <div className="wisp-below">
        <div className="wisp-guide">
          <span className="arcade-eyebrow">YOUR LEAF-SIZED FIELD GUIDE</span>
          <h3>Follow the little lights.</h3>
          <p>
            Move with <b>A D / ← →</b>. Press <b>Space, W, or ↑</b> to jump,
            then again for a second leap. <b>Shift / X</b> dashes through the
            air and past thorns. <b>P</b> pauses.
          </p>
          <p>
            Find three lanterns to wake the arch. Small hanging lamps save your
            checkpoint. Golden mushrooms send you higher. A controller works
            too: stick to move, A to jump, X to dash.
          </p>
        </div>
        <div className="wisp-groves">
          <span className="arcade-eyebrow">PLACES YOU’VE FOUND</span>
          <div>
            {GROVES.map((grove, i) => (
              <button
                key={grove.name}
                disabled={i > progress.unlocked}
                aria-current={view.level === i ? "step" : undefined}
                aria-label={`Visit grove ${i + 1}: ${grove.name}`}
                onClick={() => start(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <small>{grove.name}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
