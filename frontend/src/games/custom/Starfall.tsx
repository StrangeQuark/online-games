import { useEffect, useRef, useState } from "react";
import type { GameProps } from "../../types";
import { createAudio } from "./audio";
import {
  advanceExpedition,
  BUILDABLE,
  DIFFICULTIES,
  dist,
  ENEMIES,
  expeditionScore,
  MISSIONS,
  MODES,
  newExpedition,
  objectiveProgress,
  objectiveText,
  performAction,
  placementError,
  salvageValue,
  snapshot,
  stats,
  STRUCTURES,
  upgradeOptions,
  WORLD_H,
  WORLD_W,
  type Difficulty,
  type Expedition,
  type Mode,
  type StructureKind,
} from "./starfall/engine";
import { renderStarfall, minimapBounds } from "./starfall/render";
import {
  readCheckpoint,
  saveCheckpoint,
  clearCheckpoint,
} from "./starfall/checkpoint";
import "./custom.css";
import "./starfall/starfall.css";

const clock = (s: number) =>
  Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const number = (n: number) => Math.floor(n).toLocaleString();
const defaults = {
  energyLines: true,
  movingStars: true,
  colorBlind: false,
  smooth: true,
  fastLasers: false,
};
type Settings = typeof defaults;
function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private browsing may disable storage. */
  }
}

function StationIcon({ kind }: { kind: StructureKind }) {
  return (
    <svg
      className="sf-station-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ color: STRUCTURES[kind].color }}
    >
      <g
        fill="#172733"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {kind === "solar" ? (
          <>
            <path d="M6 13h12v22H6zM30 13h12v22H30z" />
            <path d="M6 20h12M6 28h12M12 13v22M30 20h12M30 28h12M36 13v22M18 24h12" />
            <path d="m24 16 5 4v8l-5 4-5-4v-8z" />
          </>
        ) : kind === "relay" ? (
          <>
            <circle cx="24" cy="24" r="8" />
            <path d="M24 16V5M17 28 7 36M31 28l10 8" />
            <circle cx="24" cy="6" r="3" />
            <circle cx="7" cy="36" r="3" />
            <circle cx="41" cy="36" r="3" />
          </>
        ) : kind === "miner" ? (
          <>
            <path d="m13 13 19 2 7 14-16 11-16-9z" />
            <path d="m22 23 20-17 3 4-18 19M11 21l9 11M15 16l13 17" />
            <circle cx="23" cy="26" r="6" />
          </>
        ) : kind === "battery" ? (
          <>
            <path d="M13 10h22v29H13zM18 6h12v4M10 16h3M35 16h3M10 33h3M35 33h3" />
            <path d="m26 14-9 13h8l-3 8 10-13h-8z" fill="currentColor" />
          </>
        ) : kind === "repair" ? (
          <>
            <path d="m24 8 15 8v17l-15 8-15-8V16z" />
            <path d="M20 16h8v6h6v7h-6v6h-8v-6h-6v-7h6z" />
            <circle cx="6" cy="7" r="3" />
            <circle cx="42" cy="7" r="3" />
          </>
        ) : kind === "missile" ? (
          <>
            <path d="m13 19 23 3 4 18H9z" />
            <path d="m12 24 4-16 4-3 4 5-3 17M25 27l4-16 4-3 4 5-3 17" />
            <path d="M10 35h29" />
          </>
        ) : (
          <>
            <path d="m24 18 14 8-3 14H13l-3-14z" />
            <path d="M20 25V8l4-4 4 4v17" />
            <circle cx="24" cy="29" r="7" />
            <path d="M15 37h18M23 8h2" />
          </>
        )}
      </g>
      <circle cx="24" cy="25" r="2" fill="currentColor" />
    </svg>
  );
}

function OperationCharts({ game }: { game: Expedition }) {
  if (game.history.length < 2) return null;
  const history =
    game.history.at(-1)?.time === game.time
      ? game.history
      : [
          ...game.history,
          {
            time: game.time,
            energy: game.energy,
            capacity: game.capacity,
            miningRate: game.miningRate,
          },
        ];
  const chart = (energy: boolean) => {
    const values = history.map((point) =>
      energy ? point.energy : point.miningRate,
    );
    const ceiling = Math.max(1, ...values);
    const first = history[0].time,
      duration = Math.max(1, game.time - first);
    const line = values
      .map(
        (value, i) =>
          `${12 + ((history[i].time - first) / duration) * 316},${67 - (value / ceiling) * 53}`,
      )
      .join(" ");
    return (
      <figure>
        <figcaption>
          {energy ? "Energy reserve" : "Mining rate"}
          <span>
            {energy
              ? `${number(Math.max(0, ...values))} peak reserve`
              : `${number(Math.max(0, ...values))} / min peak`}
          </span>
        </figcaption>
        <svg
          viewBox="0 0 340 82"
          role="img"
          aria-label={
            energy
              ? "Energy reserve throughout the expedition"
              : "Minerals per minute throughout the expedition"
          }
        >
          <path
            d="M12 14H328M12 40H328M12 67H328"
            fill="none"
            stroke="#38505b"
            strokeWidth=".6"
          />
          <polygon
            points={`12,67 ${line} 328,67`}
            fill={energy ? "#9bbfc122" : "#cfbf8622"}
          />
          <polyline
            points={line}
            fill="none"
            stroke={energy ? "#9bc8c2" : "#dfc68e"}
            strokeWidth="1.7"
          />
          <text x="12" y="80" fill="#8eaab5" fontSize="8">
            {clock(first)}
          </text>
          <text x="328" y="80" textAnchor="end" fill="#8eaab5" fontSize="8">
            {clock(game.time)}
          </text>
        </svg>
      </figure>
    );
  };
  return (
    <div className="sf-result-charts">
      {chart(true)}
      {chart(false)}
    </div>
  );
}

export default function Starfall({ onScore, network }: GameProps) {
  const [checkpoint, setCheckpoint] = useState(readCheckpoint);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [initial] = useState(() => newExpedition());
  const stateRef = useRef(initial);
  const propsRef = useRef({ onScore, network });
  propsRef.current = { onScore, network };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<ReturnType<typeof createAudio> | null>(null);
  const cameraRef = useRef({ x: 900, y: 600, zoom: 0.85 });
  const dimensions = useRef({ width: 1000, height: 620 });
  const pointerRef = useRef({ x: 900, y: 600, inside: false });
  const keys = useRef(new Set<string>());
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
    pan: boolean;
  } | null>(null);
  const savedRef = useRef("");
  const participatedRef = useRef("");
  const pendingRef = useRef("");
  const remoteFrames = useRef<{ from: Expedition; received: number } | null>(
    null,
  );
  const [view, setView] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [blueprint, setBlueprint] = useState<StructureKind | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<Mode>("training");
  const [mission, setMission] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [sound, setSound] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => ({
    ...defaults,
    ...readLocal("starfall-settings", {}),
  }));
  const [showSettings, setShowSettings] = useState(false);
  const [confirm, setConfirm] = useState<"recall" | "menu" | "solar" | null>(
    null,
  );
  const [completed, setCompleted] = useState<number[]>(() =>
    readLocal("starfall-missions", []),
  );
  const uiRef = useRef({ selected, blueprint, hover, settings });
  uiRef.current = { selected, blueprint, hover, settings };
  const authoritative = !network.room || network.isHost;
  const refresh = () => setView({ ...stateRef.current });

  function send(action: Record<string, unknown>) {
    const game = stateRef.current;
    const net = propsRef.current.network;
    const packet = {
      ...action,
      game: "starfall",
      tag: game.tag,
      requestId: crypto.randomUUID(),
    };
    if (!net.room || net.isHost) {
      const result = performAction(game, packet);
      if (result) setNotice(result);
      refresh();
    } else {
      pendingRef.current = packet.requestId;
      net.sendAction(packet);
    }
  }
  const sendRef = useRef(send);
  sendRef.current = send;
  function choose(kind: StructureKind | null) {
    setBlueprint(kind);
    setSelected(null);
    setConfirm(null);
    setNotice(kind ? STRUCTURES[kind].description : "");
    canvasRef.current?.focus({ preventScroll: true });
  }
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  function start(nextMode = mode, nextMission = mission) {
    if (!authoritative) return;
    const game = newExpedition(nextMode, difficulty, nextMission);
    game.started = true;
    stateRef.current = game;
    if (!propsRef.current.network.room) {
      saveCheckpoint(game);
      setCheckpoint(null);
      setSavedAt(Date.now());
    }
    cameraRef.current = { x: 900, y: 600, zoom: 0.85 };
    setSelected(null);
    setBlueprint(null);
    setConfirm(null);
    setNotice(game.message);
    setMode(nextMode);
    setMission(nextMission);
    refresh();
    canvasRef.current?.focus({ preventScroll: true });
  }
  function resumeCheckpoint() {
    if (!checkpoint || propsRef.current.network.room) return;
    const game = structuredClone(checkpoint.game);
    game.paused = true;
    stateRef.current = game;
    setMode(game.mode);
    setMission(game.mission);
    setDifficulty(game.difficulty);
    setCheckpoint(null);
    setSelected(null);
    setBlueprint(null);
    setConfirm(null);
    setNotice(
      "Expedition restored and paused. Take a look around, then resume when ready.",
    );
    refresh();
    canvasRef.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const store = () => {
      const game = stateRef.current;
      if (propsRef.current.network.room) return;
      if (game.ended) {
        clearCheckpoint(game.tag);
        return;
      }
      if (saveCheckpoint(game)) setSavedAt(Date.now());
    };
    const timer = window.setInterval(store, 10000);
    const hide = () => {
      if (document.hidden) store();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", store);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", store);
      const game = stateRef.current;
      if (!propsRef.current.network.room) {
        if (game.ended) clearCheckpoint(game.tag);
        else saveCheckpoint(game);
      }
    };
  }, []);
  function menu() {
    if (!authoritative) return;
    if (!propsRef.current.network.room) {
      if (stateRef.current.ended) clearCheckpoint(stateRef.current.tag);
      else saveCheckpoint(stateRef.current);
      setCheckpoint(readCheckpoint());
    }
    stateRef.current = newExpedition(mode, difficulty, mission);
    setConfirm(null);
    setSelected(null);
    setBlueprint(null);
    setNotice("");
    refresh();
  }
  function recycle() {
    const node = stateRef.current.structures.find(
      (n) => n.id === uiRef.current.selected,
    );
    if (!node) return;
    if (
      node.kind === "solar" &&
      stateRef.current.mode !== "sandbox" &&
      stateRef.current.structures.filter((n) => n.kind === "solar").length === 1
    )
      setConfirm("solar");
    else {
      sendRef.current({ type: "salvage", id: node.id });
      setSelected(null);
    }
  }
  const recycleRef = useRef(recycle);
  recycleRef.current = recycle;

  useEffect(() => {
    const audio = createAudio("starfall");
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);
  useEffect(() => {
    saveLocal("starfall-settings", settings);
  }, [settings]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const action = network.lastAction?.action;
    if (authoritative && action?.game === "starfall") {
      if (["start", "pause", "speed", "end", "wave"].includes(action.type))
        return;
      const message = performAction(stateRef.current, action);
      if (typeof action.requestId === "string")
        stateRef.current.receipt = {
          id: action.requestId.slice(0, 80),
          message,
        };
      if (message) setNotice(message);
      refresh();
    }
  }, [network.lastAction, authoritative]);
  useEffect(() => {
    const packet = network.lastState?.state;
    if (
      !authoritative &&
      packet?.game === "starfall" &&
      Array.isArray(packet.expedition?.structures) &&
      Array.isArray(packet.expedition?.networks)
    ) {
      remoteFrames.current =
        stateRef.current.tag === packet.expedition.tag
          ? { from: stateRef.current, received: performance.now() }
          : null;
      stateRef.current = packet.expedition;
      if (stateRef.current.receipt?.id === pendingRef.current) {
        setNotice(stateRef.current.receipt.message);
        pendingRef.current = "";
      }
    }
  }, [network.lastState, authoritative]);
  useEffect(() => {
    const canvas = canvasRef.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      dimensions.current = { width: rect.width, height: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    let raf = 0,
      previous = performance.now(),
      accumulator = 0,
      lastSend = 0,
      lastHud = 0,
      lastWave = 0,
      lastShot = -1,
      lastTag = "";
    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      const game = stateRef.current,
        net = propsRef.current.network;
      if (game.tag !== lastTag) {
        lastTag = game.tag;
        lastWave = 0;
        lastShot = -1;
        accumulator = 0;
      }
      if (game.started && !game.ended) participatedRef.current = game.tag;
      if (!net.room || net.isHost) {
        accumulator += dt * game.speed;
        let steps = 0;
        while (accumulator >= 1 / 60 && steps++ < 24) {
          advanceExpedition(game, 1 / 60);
          accumulator -= 1 / 60;
        }
      }
      const camera = cameraRef.current;
      const pan = (370 * dt) / camera.zoom;
      if (keys.current.has("w") || keys.current.has("arrowup")) camera.y -= pan;
      if (keys.current.has("s") || keys.current.has("arrowdown"))
        camera.y += pan;
      if (keys.current.has("a") || keys.current.has("arrowleft"))
        camera.x -= pan;
      if (keys.current.has("d") || keys.current.has("arrowright"))
        camera.x += pan;
      if (keys.current.has("q"))
        camera.zoom = Math.max(0.35, camera.zoom * (1 - dt));
      if (keys.current.has("e"))
        camera.zoom = Math.min(2.2, camera.zoom * (1 + dt));
      camera.x = Math.max(0, Math.min(WORLD_W, camera.x));
      camera.y = Math.max(0, Math.min(WORLD_H, camera.y));
      let rendered = game;
      const previousFrame = remoteFrames.current;
      if (
        net.room &&
        !net.isHost &&
        uiRef.current.settings.smooth &&
        previousFrame &&
        !game.paused
      ) {
        const blend = Math.min(
          1,
          Math.max(0, (now - previousFrame.received) / 100),
        );
        const interpolate = <T extends { id: number; x: number; y: number }>(
          next: T[],
          before: T[],
        ) => {
          const old = new Map(before.map((item) => [item.id, item]));
          return next.map((item) => {
            const previous = old.get(item.id);
            return previous
              ? {
                  ...item,
                  x: previous.x + (item.x - previous.x) * blend,
                  y: previous.y + (item.y - previous.y) * blend,
                }
              : item;
          });
        };
        rendered = {
          ...game,
          time:
            previousFrame.from.time +
            (game.time - previousFrame.from.time) * blend,
          enemies: interpolate(game.enemies, previousFrame.from.enemies),
          projectiles: interpolate(
            game.projectiles,
            previousFrame.from.projectiles,
          ),
          drones: interpolate(game.drones, previousFrame.from.drones),
        };
      }
      renderStarfall(ctx, rendered, now, {
        ...dimensions.current,
        camera,
        ...uiRef.current,
        pointer: pointerRef.current,
      });
      if (game.wave > lastWave) {
        audioRef.current?.effect("wave");
        lastWave = game.wave;
      }
      if (game.beams.length && game.time - lastShot > 0.3) {
        audioRef.current?.effect("shot");
        lastShot = game.time;
      }
      if ((!net.room || net.isHost) && net.room && now - lastSend >= 100) {
        net.sendState({ game: "starfall", expedition: snapshot(game) });
        lastSend = now;
      }
      if (
        game.ended &&
        participatedRef.current === game.tag &&
        savedRef.current !== game.tag
      ) {
        savedRef.current = game.tag;
        if (!["training", "sandbox"].includes(game.mode))
          propsRef.current.onScore(
            expeditionScore(game),
            `${game.won ? "Complete" : "Operation ended"} · ${game.mode === "campaign" ? "mission " + (game.mission + 1) : game.mode} · ${clock(game.time)}`,
            game.tag,
          );
        if (game.won && game.mode === "campaign")
          setCompleted((previous) => {
            const next = [...new Set([...previous, game.mission])];
            saveLocal("starfall-missions", next);
            return next;
          });
      }
      if (now - lastHud >= 140) {
        setView({ ...game });
        lastHud = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).matches("input,select,textarea") ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "q",
          "e",
        ].includes(key)
      ) {
        keys.current.add(key);
        event.preventDefault();
      }
      if (!stateRef.current.started || stateRef.current.ended || event.repeat)
        return;
      if (/^[1-7]$/.test(key)) {
        chooseRef.current(BUILDABLE[Number(key) - 1]);
        event.preventDefault();
      }
      if (key === "escape") {
        chooseRef.current(null);
        setConfirm(null);
      }
      if (
        (key === " " || key === "u" || key === "t") &&
        !(event.target as HTMLElement).closest("button")
      ) {
        sendRef.current({
          type: "upgrade",
          id: uiRef.current.selected,
          ...(key === "t" ? { branch: "thel" } : {}),
        });
        event.preventDefault();
      }
      if (key === "r") {
        recycleRef.current();
        event.preventDefault();
      }
      if (
        key === "p" &&
        (!propsRef.current.network.room || propsRef.current.network.isHost)
      ) {
        sendRef.current({ type: "pause", paused: !stateRef.current.paused });
        event.preventDefault();
      }
    };
    const keyup = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    const clear = () => keys.current.clear();
    root.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", clear);
    return () => {
      root.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect(),
        camera = cameraRef.current;
      const sx = event.clientX - rect.left - rect.width / 2,
        sy = event.clientY - rect.top - rect.height / 2;
      const before = {
        x: camera.x + sx / camera.zoom,
        y: camera.y + sy / camera.zoom,
      };
      camera.zoom = Math.max(
        0.35,
        Math.min(2.2, camera.zoom * Math.exp(-event.deltaY * 0.0015)),
      );
      camera.x = before.x - sx / camera.zoom;
      camera.y = before.y - sy / camera.zoom;
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, []);
  function worldPoint(clientX: number, clientY: number) {
    const rect = canvasRef.current!.getBoundingClientRect(),
      c = cameraRef.current;
    return {
      x: c.x + (clientX - rect.left - rect.width / 2) / c.zoom,
      y: c.y + (clientY - rect.top - rect.height / 2) / c.zoom,
    };
  }
  function sectorClick(clientX: number, clientY: number, repeat: boolean) {
    const game = stateRef.current;
    if (!game.started || game.ended) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = clientX - rect.left,
      sy = clientY - rect.top;
    const mini = minimapBounds(rect.width, rect.height);
    if (
      sx >= mini.x &&
      sx <= mini.x + mini.width &&
      sy >= mini.y &&
      sy <= mini.y + mini.height
    ) {
      cameraRef.current.x = ((sx - mini.x) / mini.width) * WORLD_W;
      cameraRef.current.y = ((sy - mini.y) / mini.height) * WORLD_H;
      return;
    }
    const point = worldPoint(clientX, clientY);
    if (blueprint) {
      const error = placementError(game, blueprint, point.x, point.y);
      if (error) {
        setNotice(error);
        return;
      }
      send({ type: "build", kind: blueprint, ...point });
      audioRef.current?.effect("build");
      if (!repeat) setBlueprint(null);
    } else {
      const node = game.structures
        .filter(
          (n) =>
            dist(point, n) <
            Math.max(
              STRUCTURES[n.kind].radius + 8,
              18 / cameraRef.current.zoom,
            ),
        )
        .sort((a, b) => dist(a, point) - dist(b, point))[0];
      setSelected(node?.id ?? null);
      setConfirm(null);
      if (node) send({ type: "inspect", id: node.id });
    }
  }
  const node = view.structures.find((n) => n.id === selected);
  const spec = node ? stats(node) : null;
  const incoming = [...view.incoming].sort((a, b) => a.at - b.at)[0];
  const menuOpen = !view.started;
  const canOrder = view.started && !view.ended;
  const currentMode = MODES.find((m) => m.id === view.mode)!;
  const currentNetwork = node
    ? view.networks.find((n) => n.id === node.network)
    : null;
  return (
    <div className="custom-game starfall-game" ref={rootRef}>
      <div className="custom-toolbar">
        <div>
          <span className="custom-eyebrow">
            Network strategy · 1–4 commanders
          </span>
          <h2>Starfall</h2>
          {savedAt && view.started && !view.ended && !network.room && (
            <span
              className="sf-save-indicator"
              title={`Saved ${new Date(savedAt).toLocaleTimeString()}`}
            >
              ● Expedition saved on this device
            </span>
          )}
        </div>
        <button
          className="custom-button"
          onClick={async () => {
            const enabled = (await audioRef.current?.toggle()) ?? false;
            setSound(enabled);
          }}
        >
          ♫ Sound {sound ? "on" : "off"}
        </button>
        <button
          className="custom-button"
          aria-expanded={showSettings}
          onClick={() => setShowSettings(!showSettings)}
        >
          Settings
        </button>
        {view.started && (
          <button
            className="custom-button"
            disabled={!authoritative}
            onClick={() => (view.ended ? menu() : setConfirm("menu"))}
          >
            Operations
          </button>
        )}
      </div>
      {showSettings && (
        <div className="sf-settings">
          {(
            [
              ["energyLines", "Energy links"],
              ["movingStars", "Moving stars"],
              ["smooth", "Smooth motion"],
              ["fastLasers", "Fast laser rendering"],
              ["colorBlind", "Distinct enemy markings"],
            ] as const
          ).map(([key, name]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(e) =>
                  setSettings({ ...settings, [key]: e.target.checked })
                }
              />
              {name}
            </label>
          ))}
          <span>Q / E or scroll to zoom · drag empty space to pan</span>
        </div>
      )}
      <div className="sf-command-bar" aria-label="Expedition resources">
        <div>
          <small>MINERALS</small>
          <strong data-testid="sf-minerals">{number(view.ore)}</strong>
          <span>+{number(view.miningRate)} / min</span>
        </div>
        <div className={view.energy < view.capacity * 0.12 ? "low" : ""}>
          <small>ENERGY RESERVE</small>
          <strong>
            {view.energy.toFixed(1)} <i>/ {number(view.capacity)}</i>
          </strong>
          <span>
            {view.capacity
              ? Math.round((view.energy / view.capacity) * 100)
              : 0}
            % · +{view.generation.toFixed(1)} / −{view.demand.toFixed(1)} per
            sec
          </span>
        </div>
        <div className="sf-clock">
          <small>
            {currentMode.name.toUpperCase()}
            {view.mode === "campaign" ? ` ${view.mission + 1} / 9` : ""}
          </small>
          <strong>{clock(view.time)}</strong>
          <span>
            {view.structures.length} stations · {view.kills} kills
          </span>
        </div>
        <div className="sf-time-controls">
          <button
            className="custom-button"
            disabled={!canOrder || !authoritative}
            onClick={() => send({ type: "pause", paused: !view.paused })}
          >
            {view.paused ? "▶ Resume" : "Ⅱ Pause"}
          </button>
          <div aria-label="Simulation speed">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                disabled={!canOrder || !authoritative}
                aria-pressed={view.speed === speed}
                onClick={() => send({ type: "speed", speed })}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="custom-stage sf-stage">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label="Starfall sector. Select a station or choose a blueprint, then place it beside a live energy link. Drag to pan; scroll to zoom."
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.currentTarget.focus({ preventScroll: true });
            e.currentTarget.setPointerCapture(e.pointerId);
            gesture.current = {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              moved: false,
              pan: !blueprint || e.button !== 0,
            };
            pointerRef.current = {
              ...worldPoint(e.clientX, e.clientY),
              inside: true,
            };
          }}
          onPointerMove={(e) => {
            const g = gesture.current;
            if (g && g.id === e.pointerId) {
              const dx = e.clientX - g.x,
                dy = e.clientY - g.y;
              if (Math.hypot(dx, dy) > 3 || g.moved) {
                g.moved = true;
                if (g.pan) {
                  cameraRef.current.x -= dx / cameraRef.current.zoom;
                  cameraRef.current.y -= dy / cameraRef.current.zoom;
                }
                g.x = e.clientX;
                g.y = e.clientY;
              }
            }
            const p = worldPoint(e.clientX, e.clientY);
            pointerRef.current = { ...p, inside: true };
            const current = stateRef.current;
            const target =
              current.structures.find(
                (n) => dist(n, p) < STRUCTURES[n.kind].radius + 8,
              ) ||
              current.enemies.find(
                (n) => dist(n, p) < ENEMIES[n.kind].radius + 6,
              ) ||
              current.asteroids.find((n) => dist(n, p) < n.radius + 5);
            setHover(target?.id ?? null);
          }}
          onPointerUp={(e) => {
            const g = gesture.current;
            if (g && (!g.moved || !g.pan) && e.button === 0)
              sectorClick(e.clientX, e.clientY, e.shiftKey);
            gesture.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            gesture.current = null;
          }}
          onPointerLeave={() => {
            pointerRef.current.inside = false;
            setHover(null);
          }}
        />
        {!menuOpen && !view.ended && (
          <div className="sf-zoom-controls" aria-label="Sector zoom">
            <button
              aria-label="Zoom in"
              onClick={() => {
                cameraRef.current.zoom = Math.min(
                  2.2,
                  cameraRef.current.zoom * 1.25,
                );
              }}
            >
              +
            </button>
            <button
              aria-label="Zoom out"
              onClick={() => {
                cameraRef.current.zoom = Math.max(
                  0.35,
                  cameraRef.current.zoom / 1.25,
                );
              }}
            >
              −
            </button>
          </div>
        )}
        {!menuOpen && !view.ended && (
          <>
            <div className="sf-sector-label">
              <span>SECTOR {String(view.mission + 1).padStart(2, "0")}</span>
              <strong>
                {view.mode === "campaign"
                  ? MISSIONS[view.mission].name
                  : currentMode.name}
              </strong>
            </div>
            {view.paused && (
              <div className="sf-paused">
                PAUSED <small>Build orders are queued</small>
              </div>
            )}
            {node && canOrder && (
              <div className="sf-quick-station">
                <div>
                  <StationIcon kind={node.kind} />
                  <span>
                    <small>
                      LEVEL {node.level} ·{" "}
                      {node.connected ? "CONNECTED" : "ISOLATED"}
                    </small>
                    <strong>{STRUCTURES[node.kind].name}</strong>
                  </span>
                  <button
                    aria-label="Close selected station"
                    onClick={() => setSelected(null)}
                  >
                    ×
                  </button>
                </div>
                <progress
                  aria-label="Selected station hull"
                  value={node.hp}
                  max={node.maxHp}
                />
                <span>
                  {Math.ceil(node.hp)} / {node.maxHp} hull ·{" "}
                  {node.energy.toFixed(1)} energy
                </span>
                {node.progress < 1 || node.upgrading ? (
                  <small>
                    {node.upgrading ? "Upgrading" : "Building"} ·{" "}
                    {Math.round(
                      (node.upgrading?.progress ?? node.progress) * 100,
                    )}
                    %
                  </small>
                ) : (
                  upgradeOptions(node)
                    .slice(0, 1)
                    .map((option) => (
                      <button
                        key={option.kind}
                        className="custom-button"
                        aria-label="Quick upgrade selected station"
                        disabled={
                          view.mode !== "sandbox" && view.ore < option.cost
                        }
                        onClick={() =>
                          send({
                            type: "upgrade",
                            id: node.id,
                            branch: option.kind,
                          })
                        }
                      >
                        Upgrade · {option.cost} minerals
                      </button>
                    ))
                )}
              </div>
            )}
            {selected !== null && (
              <button
                className="sf-station-view"
                onClick={() =>
                  rootRef.current
                    ?.querySelector(".sf-inspection")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                Station controls ↓
              </button>
            )}
            <button
              className="sf-home-view"
              aria-label="Center view on starting solar station"
              onClick={() => {
                cameraRef.current = { x: 900, y: 600, zoom: 0.85 };
              }}
            >
              ⌖ Center
            </button>
          </>
        )}
        {menuOpen && (
          <div className="sf-operation-menu custom-overlay">
            <div className="sf-menu-inner">
              <span className="custom-eyebrow">
                A web of light in a hostile universe
              </span>
              <h3>Build. Connect. Survive.</h3>
              <p>
                Harvest drifting asteroids. Grow an energy network. Keep the
                darkness at the edge of your lasers.
              </p>
              {checkpoint && !network.room && (
                <div className="sf-resume-card">
                  <div>
                    <span>YOUR EXPEDITION IS WAITING</span>
                    <strong>
                      {MODES.find((m) => m.id === checkpoint.game.mode)?.name} ·{" "}
                      {clock(checkpoint.game.time)}
                    </strong>
                    <small>
                      {checkpoint.game.structures.length} stations ·{" "}
                      {number(checkpoint.game.mined)} minerals harvested
                    </small>
                  </div>
                  <button
                    className="custom-button primary"
                    onClick={resumeCheckpoint}
                  >
                    Resume expedition
                  </button>
                </div>
              )}
              <div className="sf-modes">
                {MODES.map((item) => (
                  <button
                    key={item.id}
                    disabled={!authoritative}
                    aria-pressed={mode === item.id}
                    onClick={() => {
                      setMode(item.id);
                      if (item.id === "survival" && difficulty === "madness")
                        setDifficulty("normal");
                    }}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
              {mode === "campaign" && (
                <div className="sf-missions" aria-label="Select mission">
                  {MISSIONS.map((item, i) => (
                    <button
                      key={item.name}
                      aria-pressed={mission === i}
                      disabled={!authoritative}
                      title={item.name}
                      onClick={() => setMission(i)}
                    >
                      {completed.includes(i) ? "✓ " : ""}
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {mode === "campaign" && (
                <p className="sf-brief">
                  <strong>
                    {mission + 1}. {MISSIONS[mission].name}
                  </strong>{" "}
                  — {MISSIONS[mission].text}
                </p>
              )}
              {["mining", "survival", "waves"].includes(mode) && (
                <label className="sf-difficulty">
                  Difficulty{" "}
                  <select
                    aria-label="Expedition difficulty"
                    value={difficulty}
                    disabled={!authoritative}
                    onChange={(e) =>
                      setDifficulty(e.target.value as Difficulty)
                    }
                  >
                    {Object.entries(DIFFICULTIES)
                      .filter(
                        ([key]) => mode !== "survival" || key !== "madness",
                      )
                      .map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <button
                className="custom-button primary sf-launch"
                disabled={!authoritative}
                onClick={() => start()}
              >
                {authoritative
                  ? mode === "training"
                    ? "Begin training"
                    : "Launch expedition"
                  : "Waiting for the host"}
              </button>
              {["speed", "waves"].includes(mode) && (
                <p className="sf-race-scoring">
                  Finish sooner for a higher score. Completed runs earn 1,000 +
                  99,000 ÷ (1 + minutes); unfinished runs earn at most 999.
                </p>
              )}
              <small className="sf-menu-note">
                Handcrafted strategy inspired by The Space Game (2009). Original
                artwork and music.
              </small>
            </div>
          </div>
        )}
        {view.ended && (
          <div className="custom-overlay">
            <div className="custom-overlay-panel">
              <span className="custom-eyebrow">
                {view.won ? "Operation complete" : "End of expedition"}
              </span>
              <h3>
                {view.mode === "training"
                  ? "Ready for the belt."
                  : number(
                      participatedRef.current === view.tag
                        ? expeditionScore(view)
                        : 0,
                    ) + " points"}
              </h3>
              <p>
                {view.message}
                <br />
                {number(view.mined)} minerals harvested · {view.kills} enemies
                destroyed · {clock(view.time)}
              </p>
              <OperationCharts game={view} />
              {authoritative && (
                <div className="sf-end-actions">
                  {view.won && view.mode === "campaign" && view.mission < 8 && (
                    <button
                      className="custom-button primary"
                      onClick={() => start("campaign", view.mission + 1)}
                    >
                      Next mission
                    </button>
                  )}
                  {view.mode === "training" && (
                    <button
                      className="custom-button primary"
                      onClick={() => start("campaign", 0)}
                    >
                      First mission
                    </button>
                  )}
                  <button
                    className="custom-button"
                    onClick={() => start(view.mode, view.mission)}
                  >
                    Play again
                  </button>
                  <button className="custom-button" onClick={menu}>
                    Operations
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {canOrder && (
        <div className="sf-objective">
          <div>
            <span>
              {view.mode === "training"
                ? `TRAINING ${Math.min(6, view.trainingStep + 1)} / 6`
                : "OBJECTIVE"}
            </span>
            <strong>{objectiveText(view)}</strong>
            <progress value={Math.min(1, objectiveProgress(view))} max={1} />
          </div>
          <div className={incoming ? "sf-warning" : "sf-radar"}>
            {incoming ? (
              <>
                <b>
                  {incoming.count} {ENEMIES[incoming.kind].name}
                </b>
                <span>
                  Arriving in {Math.max(0, Math.ceil(incoming.at - view.time))}s
                </span>
              </>
            ) : (
              <>
                <b>
                  {view.enemies.length
                    ? `${view.enemies.length} hostiles in sector`
                    : "Radar clear"}
                </b>
                <span>
                  {["speed", "training", "sandbox", "waves"].includes(view.mode)
                    ? "Expand your network"
                    : "Watch the perimeter"}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="sf-build-bar" aria-label="Build structures">
        {BUILDABLE.map((kind, i) => (
          <button
            key={kind}
            className={blueprint === kind ? "selected" : ""}
            aria-pressed={blueprint === kind}
            disabled={!canOrder}
            title={STRUCTURES[kind].description}
            onClick={() => choose(blueprint === kind ? null : kind)}
          >
            <kbd>{i + 1}</kbd>
            <StationIcon kind={kind} />
            <strong>{STRUCTURES[kind].short}</strong>
            <span
              className={
                view.ore < STRUCTURES[kind].cost && view.mode !== "sandbox"
                  ? "sf-unaffordable"
                  : ""
              }
            >
              {STRUCTURES[kind].cost} minerals
            </span>
          </button>
        ))}
      </div>
      <div className="sf-message" role="status">
        {notice ||
          (blueprint
            ? `Place ${STRUCTURES[blueprint].name}. Hold Shift to repeat; Esc cancels.`
            : view.message)}
      </div>
      {confirm && (
        <div
          className="sf-confirm"
          role="alertdialog"
          aria-label="Confirm expedition command"
        >
          <p>
            {confirm === "solar"
              ? "Recycle your last solar station? Your network will have no generation until you build another."
              : confirm === "recall"
                ? "Recall the expedition and record your progress?"
                : "Leave this operation? Recall first to record your progress, or return to the field."}
          </p>
          <button
            className="custom-button primary"
            onClick={() => {
              if (confirm === "solar") {
                send({ type: "salvage", id: selected, confirm: true });
                setSelected(null);
              } else send({ type: "end" });
              setConfirm(null);
            }}
          >
            {confirm === "solar" ? "Recycle solar" : "Recall & record"}
          </button>
          <button className="custom-button" onClick={() => setConfirm(null)}>
            Keep playing
          </button>
        </div>
      )}
      <div className="sf-inspection">
        {node && spec ? (
          <>
            <div className="sf-selected-title">
              <StationIcon kind={node.kind} />
              <div>
                <small>
                  STATION {node.id} · LEVEL {node.level}
                </small>
                <h3>{STRUCTURES[node.kind].name}</h3>
              </div>
              <span className={node.connected ? "sf-online" : "sf-offline"}>
                {node.progress < 1
                  ? "Building"
                  : node.upgrading
                    ? "Upgrading"
                    : node.connected
                      ? "Connected"
                      : "Isolated"}
              </span>
            </div>
            <p>{STRUCTURES[node.kind].description}</p>
            <div className="sf-station-stats">
              <span>
                Hull{" "}
                <b>
                  {Math.ceil(node.hp)} / {node.maxHp}
                </b>
              </span>
              <span>
                Reserve{" "}
                <b>
                  {node.energy.toFixed(1)} / {node.capacity}
                </b>
              </span>
              <span>
                Links{" "}
                <b>
                  {node.connections.length}
                  {node.kind === "relay" ? " / 6" : ""}
                </b>
              </span>
              <span>
                {node.kind === "miner" ? "Mining" : "Range"}
                <b>
                  {node.kind === "miner"
                    ? `${Math.round(spec.mining * 60)} / min`
                    : `${spec.range} m`}
                </b>
              </span>
            </div>
            {(node.progress < 1 || node.upgrading) && (
              <label className="sf-construction">
                {node.upgrading ? "Upgrade" : "Construction"} ·{" "}
                {Math.round((node.upgrading?.progress ?? node.progress) * 100)}%{" "}
                <progress
                  value={node.upgrading?.progress ?? node.progress}
                  max={1}
                />
              </label>
            )}
            {currentNetwork && (
              <p
                className={
                  currentNetwork.brownout ? "sf-brownout" : "sf-network-info"
                }
              >
                Network {currentNetwork.id} · {currentNetwork.nodes.length}{" "}
                stations · {currentNetwork.generation.toFixed(1)} generation /{" "}
                {currentNetwork.demand.toFixed(1)} demand
                {currentNetwork.brownout
                  ? " · Power shortage: add or upgrade solar generation."
                  : ""}
              </p>
            )}
            <div className="sf-station-actions">
              {upgradeOptions(node).map((option) => (
                <button
                  key={option.kind}
                  className="custom-button primary"
                  disabled={
                    !canOrder ||
                    node.progress < 1 ||
                    !!node.upgrading ||
                    (view.mode !== "sandbox" && view.ore < option.cost)
                  }
                  onClick={() =>
                    send({ type: "upgrade", id: node.id, branch: option.kind })
                  }
                >
                  {option.name} · {option.cost} minerals
                </button>
              ))}
              <button
                className="custom-button"
                disabled={!canOrder}
                onClick={recycle}
              >
                Recycle
                {node.kind === "miner" && node.depleted
                  ? " depleted miners"
                  : ""}{" "}
                · {salvageValue(node)} minerals
              </button>
              {["laser", "pulser", "thel", "missile"].includes(node.kind) && (
                <label>
                  Target{" "}
                  <select
                    aria-label="Weapon target priority"
                    value={node.priority}
                    onChange={(e) =>
                      send({
                        type: "priority",
                        id: node.id,
                        priority: e.target.value,
                      })
                    }
                  >
                    <option value="nearest">Nearest</option>
                    <option value="strongest">Strongest</option>
                    <option value="weakest">Weakest</option>
                  </select>
                </label>
              )}
            </div>
          </>
        ) : (
          <>
            <span className="custom-eyebrow">
              {blueprint ? "Blueprint selected" : "Commander’s field guide"}
            </span>
            <h3>
              {blueprint
                ? STRUCTURES[blueprint].name
                : "Everything depends on the network."}
            </h3>
            <p>
              {blueprint
                ? STRUCTURES[blueprint].description
                : "Miners harvest nearby rocks. Solar stations supply power; relays extend it. Build energy stores for reserves, and layer point defense with heavy weapons. Recycle exhausted miners to fund your next expansion."}
            </p>
            <div className="sf-control-guide">
              <span>
                <kbd>1–7</kbd> Build
              </span>
              <span>
                <kbd>U / Space</kbd> Upgrade
              </span>
              <span>
                <kbd>T</kbd> THEL branch
              </span>
              <span>
                <kbd>R</kbd> Recycle
              </span>
              <span>
                <kbd>WASD</kbd> Pan
              </span>
              <span>
                <kbd>Q / E</kbd> Zoom
              </span>
              <span>
                <kbd>P</kbd> Pause
              </span>
              <span>
                <kbd>Shift</kbd> Repeat build
              </span>
            </div>
          </>
        )}
      </div>
      {canOrder && ["waves", "sandbox"].includes(view.mode) && (
        <div className="sf-fleets">
          <div>
            <strong>Call a fleet</strong>
            <span>
              {view.mode === "waves"
                ? "Defeat all six. Your clock starts with construction."
                : "Experiment with enemy types and defensive networks."}
            </span>
          </div>
          {[1, 2, 3, 4, 5, 6].map((wave) => (
            <button
              className="custom-button"
              key={wave}
              disabled={
                !authoritative ||
                (view.mode === "waves" && view.chosenWaves.includes(wave))
              }
              onClick={() => send({ type: "wave", wave })}
            >
              Fleet {wave}
              {view.mode === "waves" && view.chosenWaves.includes(wave)
                ? " ✓"
                : ""}
            </button>
          ))}
        </div>
      )}
      {canOrder &&
        authoritative &&
        !["training", "sandbox"].includes(view.mode) && (
          <button className="sf-recall" onClick={() => setConfirm("recall")}>
            Recall expedition & record progress
          </button>
        )}
    </div>
  );
}
