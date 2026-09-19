import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Map as MapIcon,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Navigation,
  Flag,
} from "lucide-react";
import type { GameProps } from "../../types";
import MusicButton from "../shared/MusicButton";
import { usePreference } from "../shared/preferences";
import {
  newCityDrive,
  updateCity,
  recoverCar,
  district,
  controllerSteering,
  LANDMARKS,
  type CityDrive,
} from "./city";
import { createCityScene, type CameraMode, type SceneOptions } from "./scene";
import CityMap from "./CityMap";
import "../shared/arcade.css";
import "./driftline.css";
const PAINT = {
  ivory: "#e4d9b8",
  coral: "#bd6550",
  mint: "#81b8a2",
  midnight: "#3f607c",
};
const SAVE = "afterhours:driftline-city-v1";
type Journal = { distance: number; visited: string[] };
function readJournal(): Journal {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE) || "{}");
    return {
      distance: Number.isFinite(j.distance) && j.distance >= 0 ? j.distance : 0,
      visited: Array.isArray(j.visited)
        ? j.visited.filter((id: unknown) => LANDMARKS.some((p) => p.id === id))
        : [],
    };
  } catch {
    return { distance: 0, visited: [] };
  }
}
const snapshot = (g: CityDrive) => ({
  ...g,
  traffic: [],
  visited: [...g.visited],
});
export default function Driftline({ onScore }: GameProps) {
  const [first] = useState(newCityDrive),
    game = useRef(first),
    canvas = useRef<HTMLCanvasElement>(null),
    [view, setView] = useState(() => snapshot(first));
  const [paint, setPaint] = usePreference("driftline-paint", "ivory", [
    "ivory",
    "coral",
    "mint",
    "midnight",
  ] as const);
  const [camera, setCamera] = usePreference("driftline-city-camera", "chase", [
    "chase",
    "hood",
    "orbit",
  ] as const);
  const [light, setLight] = usePreference("driftline-city-light", "golden", [
    "golden",
    "day",
    "blue",
  ] as const);
  const [traffic, setTraffic] = usePreference("driftline-city-traffic", "on", [
    "on",
    "off",
  ] as const);
  const [quality, setQuality] = usePreference(
    "driftline-city-quality",
    "high",
    ["high", "low"] as const,
  );
  const [motion, setMotion] = usePreference("driftline-motion", "full", [
    "full",
    "reduced",
  ] as const);
  const [journal, setJournal] = useState(readJournal),
    journalRef = useRef(journal),
    banked = useRef(0);
  const [mapOpen, setMapOpen] = useState(false),
    [destination, setDestination] = useState(""),
    [error, setError] = useState(""),
    [sound, setSound] = useState(false);
  const mapPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mapOpen) mapPanel.current?.focus();
  }, [mapOpen]);
  const mapOpenRef = useRef(mapOpen);
  mapOpenRef.current = mapOpen;
  const keys = useRef(new Set<string>()),
    touch = useRef(new Map<number, string>());
  const options = useRef<SceneOptions>({
    paint: PAINT[paint],
    camera,
    light,
    traffic: traffic === "on",
    quality,
    gentle: motion === "reduced",
  });
  options.current = {
    paint: PAINT[paint],
    camera,
    light,
    traffic: traffic === "on",
    quality,
    gentle:
      motion === "reduced" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const audio = useRef<{
    ctx: AudioContext;
    osc: OscillatorNode;
    gain: GainNode;
  } | null>(null);
  const scoreRef = useRef(onScore);
  scoreRef.current = onScore;
  function clearInput() {
    keys.current.clear();
    touch.current.clear();
  }
  function focus() {
    canvas.current?.focus({ preventScroll: true });
  }
  function saveJournal() {
    const g = game.current,
      previous = journalRef.current;
    const next = {
      distance: previous.distance + Math.max(0, g.distance - banked.current),
      visited: [...new Set([...previous.visited, ...g.visited])],
    };
    banked.current = g.distance;
    journalRef.current = next;
    setJournal(next);
    try {
      localStorage.setItem(SAVE, JSON.stringify(next));
    } catch {
      /* Browsing without storage still works. */
    }
  }
  const saveRef = useRef(saveJournal);
  saveRef.current = saveJournal;
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let world: ReturnType<typeof createCityScene>;
    try {
      world = createCityScene(c);
    } catch (cause) {
      console.error("Driftline renderer initialization failed", cause);
      setError(
        "The 3D renderer could not start. Enable hardware acceleration in your browser, then reload to try again.",
      );
      return;
    }
    let frame = 0,
      last = performance.now(),
      lastHud = 0,
      lastSave = 0,
      wasPause = false,
      wasCamera = false,
      previousHudPhase = "";
    const visibility = () => {
      if (document.hidden) blur();
    };
    const blur = () => {
      clearInput();
      if (game.current.phase === "racing") {
        game.current.phase = "paused";
        setView(snapshot(game.current));
        saveRef.current();
      }
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      blur();
      setError(
        "The graphics connection was interrupted. Your travel journal is saved. Reload to restore the city.",
      );
    };
    c.addEventListener("webglcontextlost", contextLost);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const g = game.current,
        held = new Set([...keys.current, ...touch.current.values()]);
      const pad = navigator.getGamepads?.().find((p) => p?.connected);
      const pausePressed = Boolean(pad?.buttons[9]?.pressed),
        cameraPressed = Boolean(pad?.buttons[3]?.pressed);
      if (
        pausePressed &&
        !wasPause &&
        g.phase !== "ready" &&
        !mapOpenRef.current
      ) {
        g.phase = g.phase === "paused" ? "racing" : "paused";
        clearInput();
      }
      if (cameraPressed && !wasCamera) {
        const cameras: CameraMode[] = ["chase", "hood", "orbit"];
        setCamera(cameras[(cameras.indexOf(cameraRef.current) + 1) % 3]);
      }
      wasPause = pausePressed;
      wasCamera = cameraPressed;
      const keySteer =
        Number(held.has("ArrowRight") || held.has("KeyD")) -
        Number(held.has("ArrowLeft") || held.has("KeyA"));
      updateCity(
        g,
        {
          throttle:
            held.has("ArrowUp") || held.has("KeyW")
              ? 1
              : pad?.buttons[7]?.value || 0,
          brake:
            held.has("ArrowDown") || held.has("KeyS")
              ? 1
              : pad?.buttons[6]?.value || 0,
          steer: keySteer || controllerSteering(pad?.axes[0] ?? 0),
          handbrake: held.has("Space") || Boolean(pad?.buttons[0]?.pressed),
        },
        dt,
        options.current.traffic,
      );
      world.render(g, options.current, dt);
      if (audio.current) {
        const { ctx, osc, gain } = audio.current;
        osc.frequency.setTargetAtTime(
          32 + Math.abs(g.speed) * 3,
          ctx.currentTime,
          0.08,
        );
        gain.gain.setTargetAtTime(
          soundRef.current && g.phase === "racing"
            ? 0.018 + Math.abs(g.speed) * 0.0005
            : 0,
          ctx.currentTime,
          0.08,
        );
      }
      c.dataset.phase = g.phase;
      c.dataset.x = g.x.toFixed(3);
      c.dataset.z = g.z.toFixed(3);
      c.dataset.speed = g.speed.toFixed(3);
      c.dataset.heading = g.heading.toFixed(4);
      c.dataset.collisions = String(g.collisions);
      c.dataset.camera = options.current.camera;
      c.dataset.distance = g.distance.toFixed(2);
      c.dataset.renderer = "webgl";
      if (
        now - lastHud > 100 &&
        (g.phase === "racing" || previousHudPhase !== g.phase)
      ) {
        setView(snapshot(g));
        lastHud = now;
        previousHudPhase = g.phase;
      }
      if (now - lastSave > 5000) {
        if (g.phase === "racing") saveRef.current();
        lastSave = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      saveRef.current();
      c.removeEventListener("webglcontextlost", contextLost);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      world.dispose();
      audio.current?.osc.stop();
      void audio.current?.ctx.close();
      audio.current = null;
    };
  }, []);
  function toggleSound() {
    if (!audio.current) {
      try {
        const ctx = new AudioContext(),
          osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          filter = ctx.createBiquadFilter();
        osc.type = "sawtooth";
        filter.type = "lowpass";
        filter.frequency.value = 260;
        gain.gain.value = 0;
        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start();
        audio.current = { ctx, osc, gain };
      } catch {
        return;
      }
    }
    void audio.current.ctx.resume();
    setSound((s) => !s);
  }
  function start() {
    game.current.phase = "racing";
    clearInput();
    setView(snapshot(game.current));
    focus();
    if (innerWidth < 700 || matchMedia("(pointer:coarse)").matches)
      canvas.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function pause() {
    if (mapOpen) return;
    if (game.current.phase === "ready") return;
    game.current.phase = game.current.phase === "paused" ? "racing" : "paused";
    clearInput();
    setView(snapshot(game.current));
    saveJournal();
    if (game.current.phase === "racing") focus();
  }
  function openMap() {
    if (game.current.phase === "racing") game.current.phase = "paused";
    clearInput();
    setView(snapshot(game.current));
    setMapOpen(true);
    saveJournal();
  }
  function cycleCamera() {
    const modes: CameraMode[] = ["chase", "hood", "orbit"];
    setCamera(modes[(modes.indexOf(camera) + 1) % 3]);
    focus();
  }
  function endDrive() {
    saveJournal();
    const g = game.current;
    if (g.distance >= 100)
      scoreRef.current(
        Math.floor(g.distance / 10) + g.visited.length * 500,
        `City drive · ${(g.distance / 1000).toFixed(1)} km · ${g.visited.length} discoveries`,
        crypto.randomUUID(),
      );
    game.current = newCityDrive();
    banked.current = 0;
    clearInput();
    setView(snapshot(game.current));
  }
  function control(label: string, key: string, icon: React.ReactNode) {
    return (
      <button
        aria-label={label}
        className={`city-pedal ${key === "ArrowUp" ? "accelerator" : ""}`}
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
  const target = LANDMARKS.find((p) => p.id === destination),
    distance = target ? Math.hypot(target.x - view.x, target.z - view.z) : 0;
  return (
    <div
      className="arcade-game driftline-game"
      onKeyDown={(e) => {
        if (mapOpen && e.code === "Escape") {
          e.preventDefault();
          setMapOpen(false);
          focus();
          return;
        }
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.metaKey ||
          e.ctrlKey ||
          e.altKey
        )
          return;
        if (
          ![
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "KeyW",
            "KeyA",
            "KeyS",
            "KeyD",
            "Space",
            "KeyP",
            "Escape",
            "KeyC",
            "KeyM",
            "KeyR",
          ].includes(e.code)
        )
          return;
        e.preventDefault();
        if (
          e.repeat &&
          ["KeyP", "Escape", "KeyC", "KeyM", "KeyR"].includes(e.code)
        )
          return;
        if (mapOpen) {
          if (e.code === "Escape" || e.code === "KeyM") {
            setMapOpen(false);
            focus();
          }
          return;
        }
        if (e.code === "KeyP" || e.code === "Escape") {
          pause();
          return;
        }
        if (e.code === "KeyC") {
          cycleCamera();
          return;
        }
        if (e.code === "KeyM") {
          openMap();
          return;
        }
        if (e.code === "KeyR") {
          recoverCar(game.current);
          return;
        }
        keys.current.add(e.code);
      }}
      onKeyUp={(e) => keys.current.delete(e.code)}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">BELLWETHER · OPEN CITY DRIVING</span>
          <h2>
            Driftline <span>Take the long way home.</span>
          </h2>
        </div>
        <div className="arcade-actions">
          <MusicButton mood="coast" />
          <button
            className="arcade-button icon"
            aria-label={sound ? "Mute engine sound" : "Enable engine sound"}
            onClick={toggleSound}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button className="arcade-button" onClick={openMap}>
            <MapIcon size={15} /> City map
          </button>
          {view.phase !== "ready" && (
            <button className="arcade-button" onClick={pause}>
              {view.phase === "paused" ? (
                <Play size={15} />
              ) : (
                <Pause size={15} />
              )}{" "}
              {view.phase === "paused" ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </div>
      <div className="drift-stage city-stage">
        <canvas
          ref={canvas}
          tabIndex={0}
          aria-label="Driftline 3D driving city. W or up to accelerate, S or down to brake and reverse, A D or arrows to steer, Space handbrake, C camera, M map, R recover, P pause."
        />
        {view.phase !== "ready" && !mapOpen && (
          <>
            <div className="city-location">
              <span>BELLWETHER</span>
              <strong>{district(view.x, view.z)}</strong>
              <small>
                {light === "golden"
                  ? "18:42 · GOLDEN HOUR"
                  : light === "day"
                    ? "11:25 · CLEAR SKIES"
                    : "20:16 · BLUE HOUR"}
              </small>
            </div>
            <div className="city-stage-actions">
              <button aria-label="Change camera" onClick={cycleCamera}>
                <Camera size={18} />
              </button>
              <button aria-label="Pause drive" onClick={pause}>
                <Pause size={18} />
              </button>
            </div>
            <button
              className="city-minimap"
              aria-label="Open city map"
              onClick={openMap}
            >
              <CityMap game={view} destination={destination} />
              <span>
                {target
                  ? `${target.name} · ${distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`}`
                  : "M · EXPLORE THE CITY"}
              </span>
            </button>
            <div className="city-speedometer">
              <div className="city-gear">
                {view.speed < -0.2 ? "R" : view.speed > 0.2 ? "D" : "N"}
                <span>AUTO</span>
              </div>
              <strong>
                {Math.round(Math.abs(view.speed) * 3.6)
                  .toString()
                  .padStart(2, "0")}
              </strong>
              <span>KM/H</span>
              <div className="city-speed-bar">
                <i
                  style={{
                    width: `${Math.min(100, (Math.abs(view.speed) / 48) * 100)}%`,
                  }}
                />
              </div>
              <small>
                {camera === "chase"
                  ? "CHASE"
                  : camera === "hood"
                    ? "DRIVER"
                    : "PANORAMA"}{" "}
                · C
              </small>
            </div>
            {view.phase === "racing" && view.messageTime > 0 && (
              <div className="city-toast" role="status">
                {view.message}
              </div>
            )}
            {view.phase === "racing" && (
              <div className="city-touch-controls">
                <div>
                  {control("Left", "ArrowLeft", <ArrowLeft size={23} />)}
                  {control("Right", "ArrowRight", <ArrowRight size={23} />)}
                </div>
                <div>
                  {control(
                    "Brake / reverse",
                    "ArrowDown",
                    <span className="city-brake">Ⅱ</span>,
                  )}
                  {control("Accelerate", "ArrowUp", <ArrowUp size={24} />)}
                </div>
              </div>
            )}
          </>
        )}
        {view.phase === "ready" && !mapOpen && !error && (
          <div className="city-welcome">
            <div className="city-welcome-copy">
              <span className="city-kicker">
                A CITY. A CAR. ALL THE TIME IN THE WORLD.
              </span>
              <h3>
                Nowhere else
                <br />
                you need to be.
              </h3>
              <p>
                Take the keys to Bellwether. Follow the waterfront, get lost
                among the towers, or find your favorite corner café.
              </p>
              <div className="city-feature-row">
                <span>64 city blocks</span>
                <span>6 places to discover</span>
                <span>No timer</span>
              </div>
              <button className="arcade-button primary" onClick={start}>
                Hit the road <ArrowRight size={18} />
              </button>
              <small>W A S D / arrow keys to drive · C to change camera</small>
            </div>
            <div className="city-welcome-stamp">
              <span>DRIFTLINE</span>
              <strong>
                City
                <br />
                <i>edition.</i>
              </strong>
              <span>EST. 2026 — BELLWETHER</span>
            </div>
          </div>
        )}
        {view.phase === "paused" && !mapOpen && !error && (
          <div className="city-overlay">
            <div className="city-pause-card">
              <span className="city-kicker">PULL OVER. TAKE A BREATH.</span>
              <h3>The city can wait.</h3>
              <p>
                {(view.distance / 1000).toFixed(2)} km driven ·{" "}
                {view.visited.length} places discovered
              </p>
              <button className="arcade-button primary" onClick={pause}>
                <Play size={16} /> Back to the drive
              </button>
              <div className="city-pause-actions">
                <button
                  className="arcade-button"
                  onClick={() => {
                    recoverCar(game.current);
                    pause();
                  }}
                >
                  <RotateCcw size={14} /> Return to road
                </button>
                <button className="arcade-button" onClick={endDrive}>
                  <Flag size={14} /> Finish drive
                </button>
              </div>
              <small>
                Your travel journal saves automatically. Finish a drive of at
                least 100 m to bank a score.
              </small>
            </div>
          </div>
        )}
        {mapOpen && !error && (
          <div
            className="city-map-overlay"
            ref={mapPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Explore Bellwether city map"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const buttons = [
                ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button",
                ),
              ];
              const first = buttons[0],
                last = buttons.at(-1);
              if (
                e.shiftKey &&
                (document.activeElement === first ||
                  document.activeElement === e.currentTarget)
              ) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
          >
            <div className="city-map-heading">
              <div>
                <span className="city-kicker">
                  SIX LITTLE REASONS TO TAKE A DETOUR
                </span>
                <h3>Explore Bellwether</h3>
              </div>
              <button
                className="arcade-button icon"
                aria-label="Close city map"
                onClick={() => {
                  setMapOpen(false);
                  focus();
                }}
              >
                <X size={19} />
              </button>
            </div>
            <div className="city-map-body">
              <CityMap
                game={view}
                destination={destination}
                expanded
                onSelect={setDestination}
              />
              <div className="city-destinations">
                {LANDMARKS.map((p) => (
                  <button
                    key={p.id}
                    aria-pressed={destination === p.id}
                    onClick={() => setDestination(p.id)}
                  >
                    <span style={{ background: p.color }} />
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {journal.visited.includes(p.id) ||
                        view.visited.includes(p.id)
                          ? "Discovered"
                          : `${(Math.hypot(p.x - view.x, p.z - view.z) / 1000).toFixed(1)} km away`}
                      </small>
                    </div>
                    <Navigation size={13} />
                  </button>
                ))}
                <button
                  className="city-clear-route"
                  onClick={() => setDestination("")}
                >
                  Clear route · wander freely
                </button>
              </div>
            </div>
            <div className="city-map-footer">
              <span>
                Choose a destination for a suggested route. Stop wherever you
                like.
              </span>
              <button
                className="arcade-button primary"
                onClick={() => {
                  setMapOpen(false);
                  start();
                }}
              >
                Back to the drive <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="city-overlay">
            <div className="city-pause-card">
              <h3>Let’s get you back on the road.</h3>
              <p>{error}</p>
              <button
                className="arcade-button primary"
                onClick={() => location.reload()}
              >
                Reload city
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="city-trip-strip">
        <span>
          <i /> FREE ROAM
        </span>
        <span>
          <b>{(view.distance / 1000).toFixed(2)}</b> km this drive
        </span>
        <span>
          <b>{journal.visited.length}</b> / 6 discoveries
        </span>
        <span>
          <b>{(journal.distance / 1000).toFixed(1)}</b> km lifetime
        </span>
      </div>
      <div className="city-settings">
        <label>
          Your coupe
          <select
            aria-label="Car color"
            value={paint}
            onChange={(e) => setPaint(e.target.value as typeof paint)}
          >
            {Object.keys(PAINT).map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time of day
          <select
            aria-label="Time of day"
            value={light}
            onChange={(e) => setLight(e.target.value as typeof light)}
          >
            <option value="golden">Golden hour</option>
            <option value="day">Daylight</option>
            <option value="blue">Blue hour</option>
          </select>
        </label>
        <label>
          Camera
          <select
            aria-label="Camera view"
            value={camera}
            onChange={(e) => setCamera(e.target.value as CameraMode)}
          >
            <option value="chase">Chase</option>
            <option value="hood">Driver</option>
            <option value="orbit">Panorama</option>
          </select>
        </label>
        <label>
          Graphics
          <select
            aria-label="Graphics quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as typeof quality)}
          >
            <option value="high">Auto · rich detail</option>
            <option value="low">Performance</option>
          </select>
        </label>
        <label className="city-checkbox">
          <input
            type="checkbox"
            checked={traffic === "on"}
            onChange={(e) => setTraffic(e.target.checked ? "on" : "off")}
          />
          City traffic
        </label>
        <label className="city-checkbox">
          <input
            type="checkbox"
            checked={motion === "reduced"}
            onChange={(e) => setMotion(e.target.checked ? "reduced" : "full")}
          />
          Gentle motion
        </label>
      </div>
      <div className="arcade-guide">
        <div>
          <span className="arcade-eyebrow">YOUR KEYS TO THE CITY</span>
          <h3>A slower kind of escape.</h3>
          <p>
            Hold <b>W / ↑</b> to accelerate. <b>S / ↓</b> brakes, then reverses.
            Steer with <b>A D / ← →</b>. Slow down before a turn; the steering
            becomes gentler at speed. <b>Space</b> is the handbrake. Coast by
            releasing the pedals.
          </p>
        </div>
        <div>
          <p>
            <b>C</b> changes camera, <b>M</b> opens the map, <b>P</b> pauses,
            and <b>R</b> puts you back on the nearest road. A controller works
            too: left stick, right trigger for gas, left trigger for brake, A
            for handbrake, Y for camera, Start to pause. Explore six landmarks
            at your own pace. Your odometer and discoveries stay on this device.
          </p>
        </div>
      </div>
    </div>
  );
}
