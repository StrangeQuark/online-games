import { useCallback, useEffect, useRef, useState } from "react";
import type { GameProps } from "../../types";
import { createAudio } from "./audio";
import {
  actor,
  clamp,
  initial,
  neutralInput,
  normalize,
  safeSpawn,
  step,
  WEAPONS,
  WEAPON_ORDER,
  type Actor,
  type Input,
  type Match,
  type WeaponId,
} from "./rift/engine";
import { createRenderer } from "./rift/renderer";
import { getMap, type MapId } from "./rift/map";
import { ArenaPicker } from "./rift/ArenaPicker";
import { usePreference } from "../shared/preferences";
import "./custom.css";
import "./rift/rift.css";

type Local = {
  yaw: number;
  pitch: number;
  fire: boolean;
  weapon: WeaponId | null;
  queuedJump: boolean;
  queuedReload: boolean;
  queuedFire: boolean;
  keys: Set<string>;
};
type Hud = {
  mapId: MapId;
  me: Actor;
  time: number;
  ended: boolean;
  message: string;
  leaders: Actor[];
};
export default function Rift({ onScore, network }: GameProps) {
  const [sensitivity, setSensitivity] = usePreference("rift-sensitivity", "1", [
    "0.5",
    "0.75",
    "1",
    "1.5",
    "2",
  ]);
  const [fieldOfView, setFieldOfView] = usePreference("rift-fov", "82", [
    "70",
    "82",
    "95",
    "105",
  ]);
  const [motion, setMotion] = usePreference("rift-motion", "full", [
    "full",
    "reduced",
  ]);
  const [crosshair, setCrosshair] = usePreference("rift-crosshair", "cross", [
    "cross",
    "dot",
    "ring",
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef({ sensitivity, fieldOfView, motion });
  settingsRef.current = { sensitivity, fieldOfView, motion };
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null),
    propsRef = useRef({ onScore, network });
  propsRef.current = { onScore, network };
  const [firstMatch] = useState(() =>
    initial(network.playerId || "local", "You"),
  );
  const stateRef = useRef<Match>(firstMatch);
  const audioRef = useRef<ReturnType<typeof createAudio> | null>(null);
  const rendererRef = useRef<ReturnType<typeof createRenderer> | null>(null);
  const localRef = useRef<Local>({
    yaw: 0,
    pitch: 0,
    fire: false,
    weapon: null,
    queuedJump: false,
    queuedReload: false,
    queuedFire: false,
    keys: new Set(),
  });
  const inputsRef = useRef(new Map<string, Input>()),
    savedRef = useRef(""),
    participatedRef = useRef(""),
    startedRef = useRef(false),
    botsEnabledRef = useRef(true);
  const [started, setStarted] = useState(false),
    [botsEnabled, setBotsEnabled] = useState(true),
    [music, setMusic] = useState(false),
    [locked, setLocked] = useState(false),
    [hostStarted, setHostStarted] = useState(false),
    [error, setError] = useState("");
  const [hud, setHud] = useState<Hud>({
    mapId: "foundry",
    me: actor(network.playerId || "local", "You"),
    time: 120,
    ended: false,
    message: "Control the upper galleries.",
    leaders: [],
  });
  const [hurt, setHurt] = useState(false),
    [scoreboard, setScoreboard] = useState(false);
  const authoritative = !network.room || network.isHost;
  useEffect(() => {
    const audio = createAudio("rift");
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (!authoritative) return;
    const id = network.playerId || "local";
    stateRef.current = initial(
      id,
      network.players.find((p) => p.id === id)?.name || "You",
      stateRef.current.mapId,
    );
    if (!botsEnabledRef.current)
      stateRef.current.actors = stateRef.current.actors.filter((a) => !a.bot);
    localRef.current.yaw = stateRef.current.actors[0].yaw;
    localRef.current.pitch = 0;
    localRef.current.weapon = null;
    inputsRef.current.clear();
  }, [authoritative, network.room, network.playerId]);
  useEffect(() => {
    const incoming = network.lastAction,
      a = incoming?.action;
    if (
      !authoritative ||
      !incoming ||
      a?.game !== "rift" ||
      a.type !== "input" ||
      a.tag !== stateRef.current.tag ||
      !network.players.some((p) => p.id === incoming.playerId) ||
      !Number.isFinite(a.yaw) ||
      !Number.isFinite(a.pitch)
    )
      return;
    inputsRef.current.set(incoming.playerId, {
      forward: clamp(Number(a.forward) || 0, -1, 1),
      strafe: clamp(Number(a.strafe) || 0, -1, 1),
      yaw: normalize(a.yaw),
      pitch: clamp(a.pitch, -1.35, 1.35),
      fire: a.fire === true,
      jump: a.jump === true,
      sprint: a.sprint === true,
      thrust: a.thrust === true,
      reload: a.reload === true,
      weapon: WEAPON_ORDER.includes(a.weapon) ? a.weapon : "carbine",
      updated: performance.now(),
    });
  }, [network.lastAction, authoritative, network.players]);
  useEffect(() => {
    const packet = network.lastState?.state;
    if (
      authoritative ||
      packet?.game !== "rift" ||
      !Array.isArray(packet.match?.actors) ||
      !Array.isArray(packet.match?.pickups)
    )
      return;
    const next = packet.match as Match,
      previous = stateRef.current,
      me = next.actors.find((a) => a.id === network.playerId),
      oldMe = previous.actors.find((a) => a.id === network.playerId);
    if (
      me &&
      (next.tag !== previous.tag ||
        !oldMe ||
        me.spawnCount !== oldMe.spawnCount)
    ) {
      localRef.current.yaw = me.yaw;
      localRef.current.pitch = me.pitch;
      localRef.current.weapon = null;
      localRef.current.keys.clear();
      localRef.current.fire = false;
      localRef.current.queuedFire = false;
      localRef.current.queuedJump = false;
      localRef.current.queuedReload = false;
    }
    stateRef.current = next;
    setHostStarted(packet.started === true);
    if (typeof packet.bots === "boolean") {
      botsEnabledRef.current = packet.bots;
      setBotsEnabled(packet.bots);
    }
  }, [network.lastState, authoritative, network.playerId]);
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    try {
      rendererRef.current = createRenderer(canvas);
    } catch (cause) {
      console.error("Rift renderer initialization failed", cause);
      setError(
        "This arena needs WebGL 2. Enable hardware acceleration in your browser, then reload the page.",
      );
      return;
    }
    let raf = 0,
      previous = performance.now(),
      lastSend = 0,
      lastHud = 0,
      previousHp = 100,
      previousShots = 0,
      previousSpawn = -1,
      previousNotice = "",
      previousTag = "",
      displayTag = "";
    const displayPositions = new Map<
      string,
      {
        x: number;
        y: number;
        z: number;
        yaw: number;
        pitch: number;
        walk: number;
      }
    >();
    const validKeys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyF",
      "KeyR",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "ShiftLeft",
      "ShiftRight",
      "KeyQ",
      "Tab",
      "Escape",
      "KeyP",
    ];
    const down = (e: KeyboardEvent) => {
      if (
        !startedRef.current ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable ||
        !validKeys.includes(e.code)
      )
        return;
      if (e.code === "KeyP" && !e.repeat && !propsRef.current.network.room) {
        e.preventDefault();
        togglePause();
        return;
      }
      if (pausedRef.current) return;
      if (e.code === "Escape") {
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        return;
      }
      e.preventDefault();
      localRef.current.keys.add(e.code);
      if (e.code === "Space" && !e.repeat) localRef.current.queuedJump = true;
      if (e.code === "KeyR" && !e.repeat) localRef.current.queuedReload = true;
      if (e.code === "KeyF" && !e.repeat) localRef.current.queuedFire = true;
      if (e.code.startsWith("Digit"))
        localRef.current.weapon = WEAPON_ORDER[Number(e.code.slice(-1)) - 1];
      if (e.code === "KeyQ" && !e.repeat) cycleWeapon(1);
      if (e.code === "Tab") setScoreboard(true);
    };
    const up = (e: KeyboardEvent) => {
      localRef.current.keys.delete(e.code);
      if (e.code === "Tab") setScoreboard(false);
    };
    const clear = () => {
      localRef.current.keys.clear();
      localRef.current.fire = false;
      localRef.current.queuedJump = false;
      localRef.current.queuedReload = false;
      localRef.current.queuedFire = false;
      setScoreboard(false);
    };
    const mouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      localRef.current.yaw = normalize(
        localRef.current.yaw -
          e.movementX * 0.0024 * Number(settingsRef.current.sensitivity),
      );
      localRef.current.pitch = clamp(
        localRef.current.pitch -
          e.movementY * 0.0024 * Number(settingsRef.current.sensitivity),
        -1.35,
        1.35,
      );
    };
    const release = () => {
      localRef.current.fire = false;
    };
    const lock = () => {
      setLocked(document.pointerLockElement === canvas);
      if (document.pointerLockElement !== canvas) clear();
    };
    const wheel = (e: WheelEvent) => {
      if (!startedRef.current || document.pointerLockElement !== canvas) return;
      e.preventDefault();
      cycleWeapon(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    window.addEventListener("pointerup", release);
    window.addEventListener("mousemove", mouse);
    document.addEventListener("pointerlockchange", lock);
    canvas.addEventListener("wheel", wheel, { passive: false });
    function tick(now: number) {
      const dt = Math.min(0.12, Math.max(0, (now - previous) / 1000));
      previous = now;
      const net = propsRef.current.network,
        host = !net.room || net.isHost,
        game = stateRef.current,
        local = localRef.current,
        id = net.playerId || "local";
      if (host) {
        for (const p of net.players)
          if (!game.actors.some((a) => a.id === p.id)) {
            const newcomer = actor(p.id, p.name, 0, false, game.mapId);
            Object.assign(newcomer, safeSpawn(game.actors, p.id, game.mapId));
            game.actors.push(newcomer);
          }
        if (net.room)
          game.actors = game.actors.filter(
            (a) =>
              a.bot || a.id === id || net.players.some((p) => p.id === a.id),
          );
      }
      const own = game.actors.find((a) => a.id === id),
        me = own || actor(id, "Connecting…");
      if (
        host &&
        (previousSpawn !== me.spawnCount || previousTag !== game.tag)
      ) {
        local.yaw = me.yaw;
        local.pitch = me.pitch;
        local.weapon = null;
      }
      previousSpawn = me.spawnCount;
      previousTag = game.tag;
      local.yaw = normalize(
        local.yaw +
          (Number(local.keys.has("ArrowLeft")) -
            Number(local.keys.has("ArrowRight"))) *
            dt *
            2.15,
      );
      local.pitch = clamp(
        local.pitch +
          (Number(local.keys.has("ArrowUp")) -
            Number(local.keys.has("ArrowDown"))) *
            dt *
            1.5,
        -1.35,
        1.35,
      );
      const input: Input = {
        forward:
          Number(local.keys.has("KeyW")) - Number(local.keys.has("KeyS")),
        strafe: Number(local.keys.has("KeyD")) - Number(local.keys.has("KeyA")),
        yaw: local.yaw,
        pitch: local.pitch,
        fire: local.fire || local.queuedFire || local.keys.has("KeyF"),
        jump: local.queuedJump || local.keys.has("Space"),
        thrust: local.keys.has("Space"),
        sprint: local.keys.has("ShiftLeft") || local.keys.has("ShiftRight"),
        reload: local.queuedReload || local.keys.has("KeyR"),
        weapon:
          local.weapon && me.inventory[local.weapon].owned
            ? local.weapon
            : me.weapon,
        updated: now,
      };
      if (
        startedRef.current &&
        !game.ended &&
        (!pausedRef.current || net.room)
      ) {
        if (own) participatedRef.current = game.tag;
        inputsRef.current.set(id, input);
        if (host) {
          for (const a of game.actors) {
            const remote = inputsRef.current.get(a.id);
            if (a.id !== id && !a.bot && remote && now - remote.updated > 450)
              inputsRef.current.set(a.id, neutralInput(a));
          }
          const frames = Math.max(1, Math.ceil(dt / (1 / 60)));
          for (let i = 0; i < frames; i++)
            step(game, inputsRef.current, dt / frames);
          local.queuedJump = local.queuedReload = local.queuedFire = false;
        } else if (now - lastSend > 45) {
          net.sendAction({
            game: "rift",
            type: "input",
            tag: game.tag,
            ...input,
          });
          local.queuedJump = local.queuedReload = local.queuedFire = false;
          lastSend = now;
        }
      }
      if (local.weapon === me.weapon) local.weapon = null;
      if (host && net.room && now - lastSend > 65) {
        net.sendState({
          game: "rift",
          match: game,
          started: startedRef.current,
          bots: botsEnabledRef.current,
        });
        lastSend = now;
      }
      if (me.shots !== previousShots) {
        if (me.shots > previousShots)
          audioRef.current?.effect("shot", me.weapon);
        previousShots = me.shots;
      }
      if (me.hp < previousHp) {
        setHurt(true);
        audioRef.current?.effect("hit");
      } else if (now - lastHud > 150) setHurt(false);
      previousHp = me.hp;
      if (me.noticeTime > 0 && me.notice !== previousNotice) {
        if (
          me.notice.includes("ACQUIRED") ||
          me.notice.startsWith("+") ||
          me.notice.includes("REPLENISHED") ||
          me.notice.startsWith("OVERDRIVE") ||
          me.notice.startsWith("PHASE CLOAK") ||
          me.notice.startsWith("VECTOR JETPACK")
        )
          audioRef.current?.effect("build");
        previousNotice = me.notice;
      }
      if (displayTag !== game.tag) {
        displayPositions.clear();
        displayTag = game.tag;
      }
      const display: Match = host
        ? game
        : {
            ...game,
            actors: game.actors.map((a) => {
              let p = displayPositions.get(a.id);
              if (!p || Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z) > 4)
                p = {
                  x: a.x,
                  y: a.y,
                  z: a.z,
                  yaw: a.yaw,
                  pitch: a.pitch,
                  walk: a.walk,
                };
              const amount = 1 - Math.exp(-dt * 24);
              p.x += (a.x - p.x) * amount;
              p.y += (a.y - p.y) * amount;
              p.z += (a.z - p.z) * amount;
              p.yaw += normalize(a.yaw - p.yaw) * amount;
              p.pitch += (a.pitch - p.pitch) * amount;
              p.walk += (a.walk - p.walk) * amount;
              displayPositions.set(a.id, p);
              return { ...a, ...p };
            }),
          };
      const displayMe = display.actors.find((a) => a.id === id) || me;
      rendererRef.current?.render(
        display,
        {
          ...displayMe,
          yaw: startedRef.current ? local.yaw : me.yaw,
          pitch: startedRef.current ? local.pitch : me.pitch,
        },
        dt,
        now,
        !pausedRef.current && !!(input.forward || input.strafe),
        {
          fov: Number(settingsRef.current.fieldOfView),
          reducedMotion: settingsRef.current.motion === "reduced",
        },
      );
      // Readable canvas state supports accessibility and genuine browser input tests.
      canvas.dataset.paused = String(pausedRef.current && !net.room);
      canvas.dataset.x = me.x.toFixed(2);
      canvas.dataset.y = me.y.toFixed(2);
      canvas.dataset.z = me.z.toFixed(2);
      canvas.dataset.pitch = local.pitch.toFixed(3);
      canvas.dataset.yaw = local.yaw.toFixed(3);
      canvas.dataset.grounded = String(me.grounded);
      canvas.dataset.weapon = me.weapon;
      canvas.dataset.shots = String(me.shots);
      canvas.dataset.round = game.tag;
      canvas.dataset.map = game.mapId;
      canvas.dataset.stamina = me.stamina.toFixed(1);
      canvas.dataset.sprinting = String(me.sprinting);
      canvas.dataset.fuel = me.jetFuel.toFixed(1);
      canvas.dataset.thrusting = String(me.thrusting);
      canvas.dataset.speed = me.perks.speed.toFixed(1);
      canvas.dataset.invisibility = me.perks.invisibility.toFixed(1);
      canvas.dataset.jetpack = me.perks.jetpack.toFixed(1);
      canvas.dataset.revealed = me.revealed.toFixed(1);
      if (
        game.ended &&
        own &&
        participatedRef.current === game.tag &&
        savedRef.current !== game.tag
      ) {
        savedRef.current = game.tag;
        propsRef.current.onScore(
          own.kills * 100,
          `${own.kills} frags · ${own.deaths} deaths`,
          game.tag,
        );
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
      if (now - lastHud > 100) {
        setHud({
          me: {
            ...me,
            inventory: {
              carbine: { ...me.inventory.carbine },
              shotgun: { ...me.inventory.shotgun },
              rocket: { ...me.inventory.rocket },
              plasma: { ...me.inventory.plasma },
              rail: { ...me.inventory.rail },
              grenade: { ...me.inventory.grenade },
            },
            perks: { ...me.perks },
          },
          mapId: game.mapId,
          time: game.time,
          ended: game.ended,
          message: game.message,
          leaders: [...game.actors].sort(
            (a, b) => b.kills - a.kills || a.deaths - b.deaths,
          ),
        });
        lastHud = now;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("mousemove", mouse);
      document.removeEventListener("pointerlockchange", lock);
      canvas.removeEventListener("wheel", wheel);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);
  function cycleWeapon(direction: number) {
    const game = stateRef.current,
      me = game.actors.find(
        (a) => a.id === (propsRef.current.network.playerId || "local"),
      );
    if (!me) return;
    const owned = WEAPON_ORDER.filter((w) => me.inventory[w].owned),
      current = owned.indexOf(localRef.current.weapon || me.weapon);
    localRef.current.weapon =
      owned[(current + direction + owned.length) % owned.length];
  }
  const newMatch = useCallback((mapId: MapId = stateRef.current.mapId) => {
    const net = propsRef.current.network,
      id = net.playerId || "local";
    stateRef.current = initial(
      id,
      net.players.find((p) => p.id === id)?.name || "You",
      mapId,
    );
    if (!botsEnabledRef.current)
      stateRef.current.actors = stateRef.current.actors.filter((a) => !a.bot);
    inputsRef.current.clear();
    localRef.current.keys.clear();
    localRef.current.fire = false;
    localRef.current.weapon = null;
    localRef.current.queuedFire = false;
    localRef.current.queuedJump = false;
    localRef.current.queuedReload = false;
    startedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setStarted(false);
    setHud({
      me: stateRef.current.actors[0],
      mapId,
      time: 120,
      ended: false,
      message: stateRef.current.message,
      leaders: stateRef.current.actors,
    });
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  function togglePause() {
    if (
      propsRef.current.network.room ||
      !startedRef.current ||
      stateRef.current.ended
    )
      return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    localRef.current.keys.clear();
    localRef.current.fire =
      localRef.current.queuedFire =
      localRef.current.queuedJump =
      localRef.current.queuedReload =
        false;
    if (pausedRef.current && document.pointerLockElement)
      document.exitPointerLock();
    if (!pausedRef.current) canvasRef.current?.focus();
  }
  function enter() {
    startedRef.current = true;
    setStarted(true);
    canvasRef.current?.focus();
    canvasRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function capture() {
    if (!startedRef.current || pausedRef.current || hud.ended || hud.me.hp <= 0)
      return;
    canvasRef.current?.focus();
    localRef.current.fire = true;
    localRef.current.queuedFire = true;
    if (
      window.matchMedia("(pointer:fine)").matches &&
      document.pointerLockElement !== canvasRef.current
    ) {
      try {
        void canvasRef.current?.requestPointerLock()?.catch(() => {});
      } catch {
        /* Keyboard aiming remains available. */
      }
    }
  }
  function touchKey(key: string, pressed: boolean) {
    if (pressed) {
      if (pausedRef.current || !startedRef.current) return;
      localRef.current.keys.add(key);
      if (key === "Space") localRef.current.queuedJump = true;
      if (key === "KeyR") localRef.current.queuedReload = true;
      if (key === "KeyF") localRef.current.queuedFire = true;
    } else localRef.current.keys.delete(key);
  }
  const touchLook = useRef<{ id: number; x: number; y: number } | null>(null);
  const ammo = hud.me.inventory[hud.me.weapon];
  const arena = getMap(hud.mapId);
  return (
    <div
      className={`custom-game rift-game${started && !hud.ended ? " rift-playing" : ""}${motion === "reduced" ? " rift-reduced-motion" : ""}`}
    >
      <div className="custom-toolbar">
        <div>
          <span className="custom-eyebrow">An original 3D arena shooter</span>
          <h2>Rift: {arena.name}</h2>
        </div>
        <button
          className="custom-button"
          onClick={async () => setMusic(await audioRef.current!.toggle())}
        >
          {music ? "♫ Sound on" : "♫ Sound off"}
        </button>
        <button
          className="custom-button"
          aria-expanded={showSettings}
          onClick={() => setShowSettings((v) => !v)}
        >
          Settings
        </button>
        {started && !network.room && !hud.ended && (
          <button className="custom-button" onClick={togglePause}>
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        {started && (
          <button
            className="custom-button rift-fullscreen-button"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void stageRef.current?.requestFullscreen().catch(() => {});
              canvasRef.current?.focus();
            }}
          >
            Fullscreen ⤢
          </button>
        )}
        {started && authoritative && (
          <button className="custom-button" onClick={() => newMatch()}>
            New match
          </button>
        )}
      </div>
      {showSettings && (
        <div className="rift-settings">
          <label>
            Mouse sensitivity
            <select
              aria-label="Mouse sensitivity"
              value={sensitivity}
              onChange={(e) =>
                setSensitivity(e.target.value as typeof sensitivity)
              }
            >
              {["0.5", "0.75", "1", "1.5", "2"].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
          <label>
            Field of view
            <select
              aria-label="Field of view"
              value={fieldOfView}
              onChange={(e) =>
                setFieldOfView(e.target.value as typeof fieldOfView)
              }
            >
              {["70", "82", "95", "105"].map((v) => (
                <option key={v} value={v}>
                  {v}°
                </option>
              ))}
            </select>
          </label>
          <label>
            Camera motion
            <select
              aria-label="Camera motion"
              value={motion}
              onChange={(e) => setMotion(e.target.value as typeof motion)}
            >
              <option value="full">Full movement</option>
              <option value="reduced">Reduced movement</option>
            </select>
          </label>
          <label>
            Crosshair
            <select
              aria-label="Crosshair style"
              value={crosshair}
              onChange={(e) => setCrosshair(e.target.value as typeof crosshair)}
            >
              <option value="cross">Classic cross</option>
              <option value="dot">Precision dot</option>
              <option value="ring">Open ring</option>
            </select>
          </label>
          <p>
            Your settings stay with this browser. Press P to pause solo matches.
          </p>
        </div>
      )}
      <ArenaPicker
        selected={arena.id}
        host={authoritative}
        playing={started && !hud.ended}
        onSelect={newMatch}
      />
      <div className="rift-lobby-settings">
        <span>
          {started ? arena.subtitle : "Two minutes. First to twelve frags."}
        </span>
        {authoritative && (
          <button
            className="custom-button"
            aria-pressed={botsEnabled}
            disabled={started && !hud.ended}
            onClick={() => {
              botsEnabledRef.current = !botsEnabled;
              setBotsEnabled(!botsEnabled);
              newMatch();
            }}
          >
            Sentinels {botsEnabled ? "on" : "off"}
          </button>
        )}
        {!started && authoritative && (
          <small>
            {botsEnabled
              ? "Three AI rivals join the fight"
              : "Practice or play with friends"}
          </small>
        )}
      </div>
      <div
        ref={stageRef}
        className={`custom-stage rift-stage${hurt ? " rift-hurt" : ""}`}
      >
        <canvas
          ref={canvasRef}
          width={960}
          height={600}
          tabIndex={0}
          aria-label="Rift 3D first-person arena. WASD move; mouse or arrows look; Shift sprint; Space jump or hold to use jetpack; click or F fire; R reload; 1 through 6 switch weapons."
          onPointerDown={capture}
          onContextMenu={(e) => e.preventDefault()}
        />
        {started && !hud.ended && !error && (
          <div className="rift-hud" aria-label="Arena status">
            <div className="rift-match-clock">
              <strong>
                {Math.floor(hud.time / 60)}:
                {String(Math.floor(hud.time % 60)).padStart(2, "0")}
              </strong>
              <span>{arena.name.toUpperCase()} · FIRST TO 12</span>
            </div>
            <div
              className={`rift-crosshair crosshair-${crosshair}${hud.me.hit > 0 ? " hit" : ""}`}
            >
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="rift-location">
              {hud.me.y >= arena.upper - 0.5
                ? arena.id === "foundry"
                  ? "UPPER GALLERIES"
                  : "UPPER LEVEL"
                : arena.id === "foundry"
                  ? "FOUNDRY FLOOR"
                  : "LOWER LEVEL"}
              <span>
                {hud.me.thrusting
                  ? "JET THRUST"
                  : hud.me.sprinting
                    ? "SPRINTING"
                    : hud.me.grounded
                      ? "GROUND CONTACT"
                      : "AIRBORNE"}
              </span>
            </div>
            {hud.me.noticeTime > 0 && (
              <div className="rift-notice" key={hud.me.notice}>
                {hud.me.notice}
              </div>
            )}
            <div className="rift-vitals">
              <div className={hud.me.hp < 30 ? "danger" : ""}>
                <span>HEALTH</span>
                <strong>{Math.ceil(hud.me.hp)}</strong>
                <meter min={0} max={100} value={hud.me.hp} />
              </div>
              <div>
                <span>ARMOR</span>
                <strong>{Math.ceil(hud.me.armor)}</strong>
                <meter min={0} max={100} value={hud.me.armor} />
              </div>
            </div>
            <div className="rift-mobility" aria-label="Movement and perks">
              <div className="rift-stamina">
                <span>SPRINT</span>
                <meter
                  aria-label="Sprint stamina"
                  min={0}
                  max={100}
                  value={hud.me.stamina}
                />
                <span>{Math.ceil(hud.me.stamina)}%</span>
              </div>
              {hud.me.perks.jetpack > 0 && (
                <div className="rift-fuel">
                  <span>JET FUEL</span>
                  <meter
                    aria-label="Jetpack fuel"
                    min={0}
                    max={100}
                    value={hud.me.jetFuel}
                  />
                  <span>{Math.ceil(hud.me.jetFuel)}%</span>
                </div>
              )}
              <div className="rift-perks">
                {(["speed", "invisibility", "jetpack"] as const)
                  .filter((kind) => hud.me.perks[kind] > 0)
                  .map((kind) => (
                    <div key={kind} className={`rift-perk perk-${kind}`}>
                      <strong>
                        {kind === "speed"
                          ? "» OVERDRIVE"
                          : kind === "invisibility"
                            ? hud.me.revealed > 0
                              ? "◈ CLOAK EXPOSED"
                              : "◈ CLOAKED"
                            : "↑ JETPACK"}
                      </strong>
                      <span>{Math.ceil(hud.me.perks[kind])}s</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="rift-ammo">
              <span>{WEAPONS[hud.me.weapon].name.toUpperCase()}</span>
              <strong>
                {ammo.clip}
                <small> / {ammo.reserve}</small>
              </strong>
              {hud.me.reloading > 0 ? (
                <div className="rift-reload">
                  <span>RELOADING</span>
                  <progress
                    max={WEAPONS[hud.me.weapon].reload}
                    value={WEAPONS[hud.me.weapon].reload - hud.me.reloading}
                  />
                </div>
              ) : ammo.clip === 0 ? (
                <span className="danger">PRESS R TO RELOAD</span>
              ) : (
                <span>R RELOAD · Q SWITCH</span>
              )}
            </div>
            {!locked && hud.me.hp > 0 && (
              <div className="rift-capture-hint">
                Click to aim with your mouse · <kbd>Esc</kbd> releases it
              </div>
            )}
            {hud.me.hp <= 0 && (
              <div className="rift-respawn">
                <strong>Signal lost</strong>
                <span>Reconstructing in {Math.ceil(hud.me.respawn)}…</span>
              </div>
            )}
          </div>
        )}
        {paused && started && !network.room && !hud.ended && (
          <div className="custom-overlay rift-pause-overlay">
            <div className="custom-overlay-panel">
              <span className="custom-eyebrow">TAKE A BREATHER</span>
              <h3>Arena paused.</h3>
              <p>The clock and sentinels are waiting for you.</p>
              <button className="custom-button primary" onClick={togglePause}>
                Resume match
              </button>
              <p className="rift-intro-controls">
                P resumes · Your next shot is waiting.
              </p>
            </div>
          </div>
        )}
        {!started && !error && (
          <div className="custom-overlay">
            <div className="custom-overlay-panel">
              <span className="custom-eyebrow">
                02:00 · 12 FRAGS · SIX WEAPONS
              </span>
              <h3>Take the high ground.</h3>
              <p>
                {arena.description} Claim weapons and temporary overdrive, cloak
                and jetpack pickups to turn the fight.
              </p>
              <button className="custom-button primary" onClick={enter}>
                Enter the arena ↗
              </button>
              <p className="rift-intro-controls">
                WASD move · Mouse / arrows look
                <br />
                Shift sprint · Space jump / hold to jet
                <br />
                Click / F fire · R reload · 1–6 weapons
              </p>
            </div>
          </div>
        )}
        {started && !authoritative && !hostStarted && !hud.ended && !error && (
          <div className="rift-waiting">
            Waiting for the host to enter {arena.name}…
          </div>
        )}
        {error && (
          <div className="custom-overlay">
            <div className="custom-overlay-panel">
              <h3>Graphics unavailable</h3>
              <p role="alert">{error}</p>
            </div>
          </div>
        )}
        {started && hud.ended && (
          <div className="custom-overlay">
            <div className="custom-overlay-panel">
              <span className="custom-eyebrow">Match complete</span>
              <h3>{hud.me.kills * 100} points</h3>
              <p>
                {hud.message}
                <br />
                {hud.me.kills} frags · {hud.me.deaths} reconstructions
              </p>
              <ol className="rift-final-leaders">
                {hud.leaders.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <span>{a.name}</span>
                    <strong>
                      {a.kills} <small>/{a.deaths}</small>
                    </strong>
                  </li>
                ))}
              </ol>
              {authoritative ? (
                <button
                  className="custom-button primary"
                  onClick={() => newMatch()}
                >
                  Choose next arena
                </button>
              ) : (
                <p>Waiting for the host to begin another match.</p>
              )}
            </div>
          </div>
        )}
        {scoreboard && started && !hud.ended && (
          <div className="rift-leaderboard">
            <span className="custom-eyebrow">
              {arena.name.toUpperCase()} / STANDINGS
            </span>
            <table>
              <thead>
                <tr>
                  <th>PLAYER</th>
                  <th>FRAGS</th>
                  <th>DEATHS</th>
                </tr>
              </thead>
              <tbody>
                {hud.leaders.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.name}
                      {a.bot ? " · sentinel" : ""}
                    </td>
                    <td>{a.kills}</td>
                    <td>{a.deaths}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="custom-scoreboard">
        <span>
          FRAGS <strong>{hud.me.kills}</strong>
        </span>
        <span>
          DEATHS <strong>{hud.me.deaths}</strong>
        </span>
        <span className="rift-killfeed">{hud.message}</span>
        <span>
          {network.room
            ? `${network.players.length} players · ${network.isHost ? "hosting" : "connected"}`
            : hud.leaders.some((a) => a.bot)
              ? "Solo + 3 sentinels"
              : "Practice arena"}
        </span>
      </div>
      <div className="rift-weapons" aria-label="Weapon inventory">
        {WEAPON_ORDER.map((id, i) => (
          <button
            key={id}
            className={`rift-weapon-slot${hud.me.weapon === id ? " active" : ""}`}
            disabled={!started || !hud.me.inventory[id].owned}
            onClick={() => {
              localRef.current.weapon = id;
              canvasRef.current?.focus();
            }}
          >
            <kbd>{i + 1}</kbd>
            <span>
              {WEAPONS[id].name}
              <small>
                {hud.me.inventory[id].owned
                  ? `${hud.me.inventory[id].clip} + ${hud.me.inventory[id].reserve}`
                  : "Find an arena pickup"}
              </small>
            </span>
          </button>
        ))}
      </div>
      <div className="rift-touch-controls">
        <div className="rift-dpad">
          {[
            ["KeyW", "↑", "Move forward"],
            ["KeyA", "←", "Strafe left"],
            ["KeyS", "↓", "Move backward"],
            ["KeyD", "→", "Strafe right"],
          ].map(([key, label, name]) => (
            <button
              className={`custom-button ${key}`}
              key={key}
              aria-label={name}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                touchKey(key, true);
              }}
              onPointerUp={() => touchKey(key, false)}
              onPointerCancel={() => touchKey(key, false)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="rift-look-pad"
          role="application"
          aria-label="Drag to look around"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            touchLook.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const p = touchLook.current;
            if (!p || p.id !== e.pointerId) return;
            localRef.current.yaw = normalize(
              localRef.current.yaw - (e.clientX - p.x) * 0.008,
            );
            localRef.current.pitch = clamp(
              localRef.current.pitch - (e.clientY - p.y) * 0.008,
              -1.35,
              1.35,
            );
            p.x = e.clientX;
            p.y = e.clientY;
          }}
          onPointerUp={() => {
            touchLook.current = null;
          }}
          onPointerCancel={() => {
            touchLook.current = null;
          }}
        >
          ⊕<span>DRAG TO LOOK</span>
        </div>
        <div className="rift-touch-actions">
          {[
            ["Space", "JUMP"],
            ["KeyF", "FIRE"],
            ["KeyR", "RELOAD"],
            ["ShiftLeft", "SPRINT"],
          ].map(([key, label]) => (
            <button
              className="custom-button"
              key={key}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                touchKey(key, true);
              }}
              onPointerUp={() => touchKey(key, false)}
              onPointerCancel={() => touchKey(key, false)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="custom-help">
        <kbd>W A S D</kbd> move · <kbd>Mouse / arrows</kbd> look ·{" "}
        <kbd>Shift</kbd> sprint · <kbd>Space</kbd> jump / hold for jetpack ·{" "}
        <kbd>Click / F</kbd> fire · <kbd>R</kbd> reload ·{" "}
        <kbd>1–6 / Q / wheel</kbd> weapons · <kbd>Tab</kbd> standings ·{" "}
        <kbd>P</kbd> pause solo. Sprint uses stamina; release Shift to recover.
        Jet fuel recharges while grounded. Pickups respawn. Cloaking briefly
        breaks when firing or taking damage. Rockets and grenades can hurt you.
      </p>
    </div>
  );
}
