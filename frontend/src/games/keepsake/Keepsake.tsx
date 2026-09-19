import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
  Users,
  Check,
  Mail,
  MousePointer2,
} from "lucide-react";
import type { GameProps } from "../../types";
import { createArcadeAudio } from "../shared/arcadeAudio";
import MusicButton from "../shared/MusicButton";
import {
  SCENES,
  SIZES,
  dimensions,
  newKeepsake,
  placeKeepsake,
  complete,
  keepsakeScore,
  edgePiece,
  piecePath,
  shuffled,
  validKeepsake,
  readKeepsake,
  saveKeepsake,
  type PieceCount,
} from "./engine";
import Piece from "./Piece";
import "../shared/arcade.css";
import "./keepsake.css";
export default function Keepsake({ network, onScore }: GameProps) {
  const roomSession = useRef(
      Boolean(new URLSearchParams(location.hash.split("?")[1]).get("room")),
    ),
    [game, setGame] = useState(() =>
      roomSession.current ? newKeepsake() : (readKeepsake() ?? newKeepsake()),
    ),
    [scene, setScene] = useState(game.scene),
    [size, setSize] = useState<PieceCount>(game.size),
    [selected, setSelected] = useState<number | null>(null),
    [cursor, setCursor] = useState(0),
    [guide, setGuide] = useState(false),
    [edges, setEdges] = useState(false),
    [page, setPage] = useState(0),
    [tray, setTray] = useState({ roundId: game.id, order: game.order }),
    [sound, setSound] = useState(false),
    [message, setMessage] = useState(
      "Pick a piece. Find its place. Make a little picture together.",
    ),
    [drag, setDrag] = useState<{ piece: number; x: number; y: number } | null>(
      null,
    ),
    [seamless, setSeamless] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    board = useRef<HTMLDivElement>(null),
    current = useRef(game),
    audio = useRef<ReturnType<typeof createArcadeAudio> | null>(null),
    scoreRef = useRef(onScore),
    scored = useRef(new Set<string>()),
    active = useRef(new Set<string>()),
    lastAction = useRef(-1),
    lastState = useRef(-1),
    pending = useRef(new Map<number, string>()),
    gesture = useRef<{
      piece: number;
      x: number;
      y: number;
      moved: boolean;
    } | null>(null);
  current.current = game;
  scoreRef.current = onScore;
  const online = Boolean(network.room && network.connected),
    host = !online || network.isHost,
    done = complete(game),
    { cols, rows } = dimensions(game.size),
    cw = 600 / cols,
    ch = 400 / rows,
    margin = Math.min(cw, ch) * 0.24,
    remaining = (tray.roundId === game.id ? tray.order : game.order).filter(
      (p) => !game.placed.includes(p) && (!edges || edgePiece(game.size, p)),
    ),
    pageCount = Math.max(1, Math.ceil(remaining.length / 12)),
    trayPage = Math.min(page, pageCount - 1),
    pieces = remaining.slice(trayPage * 12, trayPage * 12 + 12);
  if (network.room) roomSession.current = true;
  useEffect(() => {
    const a = createArcadeAudio();
    audio.current = a;
    return () => a.dispose();
  }, []);
  useEffect(() => {
    setTray({ roundId: game.id, order: game.order });
    setPage(0);
    setSelected(null);
    setDrag(null);
    setSeamless(false);
    pending.current.clear();
    setScene(game.scene);
    setSize(game.size);
    setMessage("Pick a piece. Find its place. Make a little picture together.");
  }, [game.id]);
  useEffect(() => {
    if (host && online) network.sendState({ game: "keepsake", state: game });
  }, [game, online, host, network.players.length]);
  useEffect(() => {
    if (!host || done || !game.placed.length) return;
    const t = setInterval(() => {
      if (!document.hidden) setGame((g) => ({ ...g, seconds: g.seconds + 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [host, done, game.id, game.placed.length > 0]);
  useEffect(() => {
    if (!online && !roomSession.current) saveKeepsake(game);
    if (!done) {
      active.current.add(game.id);
      return;
    }
    if (
      scored.current.has(game.id) ||
      !active.current.has(game.id) ||
      (online && !game.contributions[network.playerId])
    )
      return;
    scored.current.add(game.id);
    audio.current?.play("win");
    scoreRef.current(
      keepsakeScore(game),
      `${game.size} pieces - ${SCENES[game.scene].title}`,
      game.id,
    );
  }, [game, done, online, network.playerId]);
  function apply(piece: number, target: number, by: string) {
    const next = placeKeepsake(current.current, piece, target, by);
    if (next) {
      current.current = next;
      setGame(next);
    }
    return next;
  }
  useEffect(() => {
    const incoming = network.lastAction;
    if (
      !online ||
      !network.isHost ||
      !incoming ||
      incoming.seq === lastAction.current
    )
      return;
    lastAction.current = incoming.seq;
    const a = incoming.action;
    if (
      a?.game !== "keepsake" ||
      a.type !== "place" ||
      a.roundId !== current.current.id ||
      !network.players.some((p) => p.id === incoming.playerId)
    )
      return;
    apply(a.piece, a.target, incoming.playerId);
  }, [network.lastAction, online, network.isHost, network.players]);
  useEffect(() => {
    const incoming = network.lastState;
    if (
      !online ||
      network.isHost ||
      !incoming ||
      incoming.seq === lastState.current
    )
      return;
    lastState.current = incoming.seq;
    if (
      incoming.state?.game !== "keepsake" ||
      !validKeepsake(incoming.state.state)
    )
      return;
    current.current = incoming.state.state;
    setGame(incoming.state.state);
  }, [network.lastState, online, network.isHost]);
  useEffect(() => {
    for (const [piece, id] of pending.current)
      if (id !== game.id || game.placed.includes(piece))
        pending.current.delete(piece);
    if (selected !== null && game.placed.includes(selected)) setSelected(null);
  }, [game]);
  useEffect(() => {
    if (!online || network.isHost) return;
    const timer = setInterval(() => {
      for (const [piece, id] of pending.current) {
        if (
          id !== current.current.id ||
          current.current.placed.includes(piece)
        ) {
          pending.current.delete(piece);
          continue;
        }
        network.sendAction({
          game: "keepsake",
          type: "place",
          roundId: id,
          piece,
          target: piece,
        });
      }
    }, 650);
    return () => clearInterval(timer);
  }, [online, network.isHost, network.sendAction]);
  const placedBefore = useRef(game.placed.length);
  useEffect(() => {
    if (game.placed.length > placedBefore.current) {
      audio.current?.play("power");
      const who =
        game.last?.by === network.playerId || !online
          ? "You"
          : (network.players.find((p) => p.id === game.last?.by)?.name ??
            "A teammate");
      setMessage(
        `${who} found a fit. ${game.placed.length} of ${game.size} pieces together.`,
      );
    }
    placedBefore.current = game.placed.length;
  }, [game.placed.length, game.id]);
  function focus() {
    root.current?.focus({ preventScroll: true });
  }
  function pick(piece: number) {
    if (game.placed.includes(piece)) return;
    setSelected(piece);
    setCursor(0);
    setMessage(
      "Piece selected. Choose a space, or use arrows and Enter. Escape puts it back.",
    );
    focus();
  }
  function drop(piece: number, target: number) {
    if (game.placed.includes(piece)) return;
    setSelected(null);
    setDrag(null);
    gesture.current = null;
    if (target < 0 || target >= game.size) {
      setMessage("Your piece is safe in the tray. Try another spot.");
      return;
    }
    if (online && !network.isHost) {
      if (piece === target) pending.current.set(piece, game.id);
      network.sendAction({
        game: "keepsake",
        type: "place",
        roundId: game.id,
        piece,
        target,
      });
    } else apply(piece, target, online ? network.playerId : "solo");
    if (piece !== target) {
      audio.current?.play("hit");
      setMessage("Close, but not quite. Your piece is back in the tray.");
    }
    focus();
  }
  function targetAt(x: number, y: number) {
    const b = board.current?.getBoundingClientRect();
    if (!b || x < b.left || x >= b.right || y < b.top || y >= b.bottom)
      return -1;
    return (
      Math.floor(((y - b.top) / b.height) * rows) * cols +
      Math.floor(((x - b.left) / b.width) * cols)
    );
  }
  function newPicture() {
    if (!host) return;
    if (!online) roomSession.current = false;
    setGame(newKeepsake(scene, size));
    setGuide(false);
    setEdges(false);
    focus();
  }
  const label = SCENES[game.scene],
    dragWidth = board.current
      ? (board.current.clientWidth / 600) * (cw + margin * 2)
      : 120;
  return (
    <div
      className="arcade-game keepsake-game"
      ref={root}
      tabIndex={0}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).matches("input,select,textarea,button") ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        )
          return;
        if (e.key === "Escape") {
          e.preventDefault();
          setSelected(null);
          return;
        }
        if (selected === null) return;
        const direction: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -cols,
          ArrowDown: cols,
        };
        if (direction[e.key]) {
          e.preventDefault();
          setCursor((c) =>
            Math.max(0, Math.min(game.size - 1, c + direction[e.key])),
          );
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          drop(selected, cursor);
        }
      }}
    >
      <div className="arcade-toolbar">
        <div>
          <span className="arcade-eyebrow">
            SOMETHING LOVELY, PIECE BY PIECE
          </span>
          <h2>
            Keepsake <span>A picture worth a little patience.</span>
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
          <select
            className="arcade-select"
            aria-label="Puzzle picture"
            value={scene}
            disabled={!host}
            onChange={(e) => setScene(Number(e.target.value))}
          >
            {SCENES.map((s, i) => (
              <option value={i} key={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select
            className="arcade-select"
            aria-label="Puzzle size"
            value={size}
            disabled={!host}
            onChange={(e) => setSize(Number(e.target.value) as PieceCount)}
          >
            {SIZES.map((n) => (
              <option key={n} value={n}>
                {n} pieces
              </option>
            ))}
          </select>
          <button
            className="arcade-button"
            disabled={!host}
            onClick={newPicture}
          >
            <RotateCcw size={14} />
            {scene !== game.scene || size !== game.size
              ? "Start puzzle"
              : "New puzzle"}
          </button>
        </div>
      </div>
      <div className="keepsake-heading">
        <div>
          <span className="arcade-eyebrow">A POSTCARD FROM AFTERHOURS</span>
          <h2>{label.title}</h2>
          <p>{label.caption}</p>
        </div>
        <div className="keepsake-progress">
          <strong>
            {game.placed.length}
            <small> / {game.size}</small>
          </strong>
          <span>PIECES TOGETHER</span>
          <progress
            value={game.placed.length}
            max={game.size}
            aria-label="Puzzle progress"
          />
        </div>
      </div>
      <div className="keepsake-layout">
        <div className="keepsake-picture-column">
          <div className="keepsake-frame">
            <div
              className={`keepsake-board${selected !== null ? " selecting" : ""}${done ? " finished" : ""}${seamless ? " seamless" : ""}`}
              ref={board}
              role="group"
              aria-label="Jigsaw board"
              data-round={game.id}
              data-placed={JSON.stringify(game.placed)}
              data-size={game.size}
            >
              <img
                className={`keepsake-reference${guide || seamless ? " visible" : ""}`}
                src={`/assets/${label.id}.webp`}
                alt={label.caption}
              />
              <svg
                className="keepsake-outlines"
                viewBox="0 0 600 400"
                aria-hidden="true"
              >
                {Array.from({ length: game.size }, (_, i) => (
                  <path
                    key={i}
                    d={piecePath(game.size, i)}
                    transform={`translate(${(i % cols) * cw} ${Math.floor(i / cols) * ch})`}
                  />
                ))}
              </svg>
              {game.placed.map((piece) => (
                <div
                  className="keepsake-placed-piece"
                  key={piece}
                  style={{
                    left: `${(((piece % cols) * cw - margin) / 600) * 100}%`,
                    top: `${((Math.floor(piece / cols) * ch - margin) / 400) * 100}%`,
                    width: `${((cw + 2 * margin) / 600) * 100}%`,
                    height: `${((ch + 2 * margin) / 400) * 100}%`,
                  }}
                >
                  <Piece
                    piece={piece}
                    size={game.size}
                    scene={game.scene}
                    placed
                  />
                </div>
              ))}
              <div
                className="keepsake-slots"
                style={{
                  gridTemplateColumns: `repeat(${cols},1fr)`,
                  gridTemplateRows: `repeat(${rows},1fr)`,
                }}
              >
                {Array.from({ length: game.size }, (_, target) => (
                  <button
                    key={target}
                    tabIndex={-1}
                    disabled={game.placed.includes(target) || selected === null}
                    aria-label={`Place at row ${Math.floor(target / cols) + 1}, column ${(target % cols) + 1}`}
                    className={
                      selected !== null && cursor === target ? "cursor" : ""
                    }
                    onClick={() => selected !== null && drop(selected, target)}
                  />
                ))}
              </div>
              {!game.placed.length && selected === null && !drag && (
                <div className="keepsake-start-note">
                  <Mail size={27} />
                  <span>
                    Every picture starts
                    <br />
                    with one small piece.
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="keepsake-underpicture">
            <button
              className="arcade-button"
              aria-pressed={guide}
              onClick={() => setGuide(!guide)}
            >
              {guide ? <EyeOff size={15} /> : <Eye size={15} />}{" "}
              {guide ? "Hide picture guide" : "Show picture guide"}
            </button>
            <span>
              {online ? (
                <>
                  <Users size={14} />
                  {network.players.length} at the table
                </>
              ) : (
                <>Saved on this device</>
              )}
            </span>
            {done && (
              <button
                className="arcade-button"
                aria-pressed={seamless}
                onClick={() => setSeamless(!seamless)}
              >
                {seamless ? "Show the pieces" : "Admire the picture"}
              </button>
            )}
          </div>
          {done ? (
            <div className="keepsake-complete">
              <Check size={25} />
              <div>
                <span>ALL THE LITTLE THINGS, TOGETHER</span>
                <h3>A picture worth keeping.</h3>
                <p>
                  {game.size} pieces · {keepsakeScore(game).toLocaleString()}{" "}
                  points{online ? " · Made together" : ""}
                </p>
              </div>
              {host && (
                <button
                  className="arcade-button primary"
                  onClick={() => {
                    if (!online) roomSession.current = false;
                    setScene((game.scene + 1) % SCENES.length);
                    setGame(
                      newKeepsake((game.scene + 1) % SCENES.length, game.size),
                    );
                    setGuide(false);
                  }}
                >
                  Another picture
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="keepsake-message" role="status">
              {message}
            </div>
          )}
        </div>
        <aside className="keepsake-tray">
          <div className="keepsake-tray-heading">
            <div>
              <span className="arcade-eyebrow">THE PIECE TRAY</span>
              <strong>
                {game.size - game.placed.length} little possibilities
              </strong>
            </div>
            <button
              aria-label="Shuffle the piece tray"
              className="arcade-button icon"
              onClick={() => {
                setTray({
                  roundId: game.id,
                  order: shuffled(game.size, Date.now()),
                });
                setPage(0);
              }}
            >
              <Shuffle size={15} />
            </button>
          </div>
          <label className="keepsake-edges">
            <input
              type="checkbox"
              checked={edges}
              onChange={(e) => {
                setEdges(e.target.checked);
                setPage(0);
              }}
            />{" "}
            Edges first
          </label>
          <div className="keepsake-tray-grid">
            {pieces.map((piece) => (
              <button
                key={piece}
                aria-label={`Pick up piece ${piece + 1}`}
                aria-pressed={selected === piece}
                className={`keepsake-tray-piece${selected === piece ? " selected" : ""}`}
                onClick={(e) => {
                  if (e.detail === 0) pick(piece);
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  gesture.current = {
                    piece,
                    x: e.clientX,
                    y: e.clientY,
                    moved: false,
                  };
                }}
                onPointerMove={(e) => {
                  const g = gesture.current;
                  if (!g || g.piece !== piece) return;
                  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 5)
                    g.moved = true;
                  if (g.moved) {
                    setDrag({ piece, x: e.clientX, y: e.clientY });
                    setSelected(null);
                  }
                }}
                onPointerUp={(e) => {
                  const g = gesture.current;
                  if (!g || g.piece !== piece) return;
                  if (g.moved) drop(piece, targetAt(e.clientX, e.clientY));
                  else {
                    gesture.current = null;
                    pick(piece);
                  }
                  setDrag(null);
                }}
                onPointerCancel={() => {
                  gesture.current = null;
                  setDrag(null);
                }}
                onLostPointerCapture={() => {
                  gesture.current = null;
                  setDrag(null);
                }}
              >
                <Piece piece={piece} size={game.size} scene={game.scene} />
              </button>
            ))}
            {!remaining.length && (
              <div className="keepsake-tray-empty">
                <Check size={30} />
                <p>
                  {done
                    ? "Every piece found its home."
                    : "All the edges are together. Uncheck Edges first to find the middle."}
                </p>
              </div>
            )}
          </div>
          {pageCount > 1 && (
            <div className="keepsake-tray-pages">
              <button
                className="arcade-button icon"
                aria-label="Previous pieces"
                disabled={trayPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ArrowLeft size={16} />
              </button>
              <span>
                {trayPage + 1} / {pageCount}
              </span>
              <button
                className="arcade-button icon"
                aria-label="Next pieces"
                disabled={trayPage === pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </aside>
      </div>
      <div className="arcade-guide keepsake-guide">
        <div>
          <span className="arcade-eyebrow">
            THERE'S A PLACE FOR EVERY PIECE
          </span>
          <h3>Take a little time together.</h3>
          <p>
            Drag a piece from the tray into the picture, or select a piece and
            tap its place. Use the picture guide whenever you like. Edges first
            can help you find the frame.
          </p>
        </div>
        <div>
          <p>
            <MousePointer2 size={14} /> A keyboard works too: choose a piece
            with Tab and Enter, then use the arrows to pick a place and Enter to
            set it down. Escape puts it back.
          </p>
          <p>
            <Users size={14} /> Share a private room to build the same picture
            together. Everyone who adds a piece earns the completed puzzle's
            score. The host chooses the next postcard.
          </p>
        </div>
      </div>
      {drag &&
        createPortal(
          <div
            className="keepsake-drag-piece"
            style={{ left: drag.x, top: drag.y, width: dragWidth }}
          >
            <Piece piece={drag.piece} size={game.size} scene={game.scene} />
          </div>,
          document.body,
        )}
    </div>
  );
}
