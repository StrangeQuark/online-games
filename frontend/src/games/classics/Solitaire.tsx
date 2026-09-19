import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GameProps } from "../../types";
import { CardBack, CardFace, SuitMark } from "./Cards";
import {
  canMoveCards,
  canAutoFinish,
  cardName,
  drawStock,
  foundationMove,
  moveCards,
  newSolitaire,
  solitaireHint,
  sourceCards,
  suits,
  type Card,
  type CardSource,
  type CardTarget,
  type SolitaireState,
} from "./solitaireRules";
import { readDeal, saveDeal } from "./solitaireSave";
import { usePreference } from "../shared/preferences";
import { useBoardSound } from "./BoardSettings";
import { Volume2, VolumeX, CalendarDays, RotateCcw } from "lucide-react";
import "./classics.css";

type Progress = {
  cards: number;
  score: number;
  moves: number;
  finished: boolean;
};
const sameSource = (a: CardSource | null, b: CardSource) =>
  a?.zone === b.zone && a.pile === b.pile && a.index === b.index;
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export default function Solitaire({ onScore, network }: GameProps) {
  const [savedDeal] = useState(() =>
    network.room ||
    new URLSearchParams(location.hash.split("?")[1]).has("room") ||
    new URLSearchParams(location.hash.split("?")[1]).get("daily") === "1"
      ? null
      : readDeal(),
  );
  const [state, setState] = useState<SolitaireState>(
    () =>
      savedDeal?.state ??
      (new URLSearchParams(location.hash.split("?")[1]).get("daily") === "1"
        ? newSolitaire(
            Number(new Date().toISOString().slice(0, 10).replaceAll("-", "")),
          )
        : newSolitaire()),
  );
  const [tableTheme, setTableTheme] = usePreference(
    "solitaire-table",
    "garden",
    ["garden", "midnight", "plum"] as const,
  );
  const [daily, setDaily] = useState(
    () =>
      savedDeal?.daily ??
      new URLSearchParams(location.hash.split("?")[1]).get("daily") === "1",
  );
  const [sound, setSound] = useBoardSound(state.moves, false, state.won);
  const dailyDate = new Date().toISOString().slice(0, 10);
  const dailySeed = Number(dailyDate.replaceAll("-", ""));
  const [undo, setUndo] = useState<SolitaireState[]>(
    () => savedDeal?.undo ?? [],
  );
  const [selected, setSelected] = useState<CardSource | null>(null);
  const [hint, setHint] = useState<{
    source: CardSource;
    target: CardTarget;
  } | null>(null);
  const [notice, setNotice] = useState(
    savedDeal
      ? "Your saved deal is ready. Carry on right where you left off."
      : "A little order in a shuffled world. Your deal awaits.",
  );
  const [seconds, setSeconds] = useState(savedDeal?.seconds ?? 0);
  const [started, setStarted] = useState(false);
  const [banked, setBanked] = useState(false);
  const [race, setRace] = useState(() => Date.now());
  const [dealId, setDealId] = useState(
    () => savedDeal?.dealId ?? crypto.randomUUID(),
  );
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [winner, setWinner] = useState<string | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [dragView, setDragView] = useState<{
    cards: Card[];
    x: number;
    y: number;
    width: number;
    fan: number;
  } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const processedAction = useRef(-1),
    processedState = useRef(-1),
    receivedDeal = useRef<string | null>(null),
    scored = useRef(false);
  const dragSource = useRef<CardSource | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const cardPositions = useRef(
    new Map<string, { x: number; y: number; faceUp: boolean }>(),
  );
  const touchDrag = useRef<{
    source: CardSource;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    width: number;
    fan: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const online = Boolean(network.room && network.connected);
  const foundationCount = state.foundations.reduce(
    (sum, pile) => sum + pile.length,
    0,
  );

  useEffect(() => {
    if (network.room || online) return;
    saveDeal({ state, undo, seconds, dealId, daily }, banked);
  }, [state, undo, seconds, dealId, daily, banked, network.room, online]);

  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const origin = table.getBoundingClientRect(),
      next = new Map<string, { x: number; y: number; faceUp: boolean }>();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const elements = table.querySelectorAll<HTMLElement>("[data-card-id]"),
      cleanups: (() => void)[] = [];
    const deck = table
      .querySelector<HTMLElement>(".stock-card")!
      .getBoundingClientRect();
    elements.forEach((element) => {
      const id = element.dataset.cardId!,
        rect = element.getBoundingClientRect();
      const position = {
          x: rect.left - origin.left,
          y: rect.top - origin.top,
          faceUp: element.dataset.faceUp === "true",
        },
        previous = cardPositions.current.get(id);
      next.set(id, position);
      if (
        !reduceMotion &&
        (!previous ||
          Math.abs(previous.x - position.x) > 2 ||
          Math.abs(previous.y - position.y) > 2 ||
          previous.faceUp !== position.faceUp)
      ) {
        const from = previous || {
          x: deck.left - origin.left,
          y: deck.top - origin.top,
          faceUp: position.faceUp,
        };
        // A single temporary artwork layer lets moving cards cross piles without
        // being hidden by another column's stacking context.
        const ghost = element.cloneNode(true) as HTMLElement;
        ghost.removeAttribute("data-card-id");
        ghost.setAttribute("aria-hidden", "true");
        ghost.tabIndex = -1;
        ghost.className = "playing-card solitaire-flight";
        Object.assign(ghost.style, {
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          marginTop: "0",
        });
        table.appendChild(ghost);
        element.style.visibility = "hidden";
        const restore = () => {
          ghost.remove();
          element.style.visibility = "";
        };
        const animation = ghost.animate(
          [
            {
              transform: `translate(${from.x - position.x}px, ${from.y - position.y}px) rotateY(${from.faceUp !== position.faceUp ? -85 : 0}deg)`,
            },
            { transform: "translate(0, 0) rotateY(0deg)" },
          ],
          {
            duration: previous ? 260 : 380,
            delay: previous ? 0 : next.size * 12,
            fill: "both",
            easing: "cubic-bezier(.2,.7,.3,1)",
          },
        );
        animation.onfinish = restore;
        cleanups.push(() => {
          animation.cancel();
          restore();
        });
      }
    });
    cardPositions.current = next;
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [state]);

  function replace(next: SolitaireState) {
    setUndo((previous) => [...previous.slice(-99), stateRef.current]);
    setState(next);
    setSelected(null);
    setHint(null);
    setStarted(true);
    setNotice(
      next.won
        ? "All fifty-two, right where they belong. Beautifully played."
        : "Keep going. Every card has its place.",
    );
  }

  function fresh(
    seed?: number,
    id = crypto.randomUUID(),
    drawCount: 1 | 3 = state.drawCount ?? 1,
  ) {
    setAutoPlaying(false);
    setDragView(null);
    touchDrag.current = null;
    cardPositions.current.clear();
    setState(newSolitaire(seed, drawCount));
    setUndo([]);
    setSelected(null);
    setHint(null);
    setSeconds(0);
    setStarted(false);
    setBanked(false);
    scored.current = false;
    setDealId(id);
    setNotice(
      online
        ? "Same shuffle. Separate boards. Race to all four kings."
        : "A fresh shuffle, a fresh possibility.",
    );
  }

  function newDeal() {
    if (online && !network.isHost) return;
    setDaily(false);
    fresh();
    setRace(Date.now());
    setProgress({});
    setWinner(null);
  }

  useEffect(() => {
    if (!started || state.won || banked) return;
    const timer = window.setInterval(() => {
      if (online || !document.hidden) setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, state.won, banked, online]);

  useEffect(() => {
    if (!online) return;
    const own: Progress = {
      cards: foundationCount,
      score: state.score,
      moves: state.moves,
      finished: state.won,
    };
    if (network.isHost) {
      setProgress((previous) => ({ ...previous, [network.playerId]: own }));
      if (own.finished) setWinner((previous) => previous || network.playerId);
    } else
      network.sendAction({
        game: "solitaire",
        type: "progress",
        race,
        dealId,
        progress: own,
      });
  }, [
    foundationCount,
    state.score,
    state.moves,
    state.won,
    online,
    network.isHost,
    network.playerId,
    race,
    dealId,
  ]);

  useEffect(() => {
    if (online && network.isHost)
      network.sendState({
        game: "solitaire",
        seed: state.seed,
        drawCount: state.drawCount ?? 1,
        race,
        dealId,
        progress,
        winner,
      });
  }, [
    state.seed,
    state.drawCount,
    race,
    dealId,
    progress,
    winner,
    online,
    network.isHost,
    network.players.length,
  ]);

  useEffect(() => {
    const incoming = network.lastAction;
    if (
      !online ||
      !network.isHost ||
      !incoming ||
      incoming.seq === processedAction.current
    )
      return;
    processedAction.current = incoming.seq;
    const action = incoming.action;
    if (
      action?.game !== "solitaire" ||
      action.type !== "progress" ||
      action.race !== race ||
      action.dealId !== dealId ||
      !network.players.some((p) => p.id === incoming.playerId)
    )
      return;
    const p = action.progress;
    if (
      !p ||
      !Number.isInteger(p.cards) ||
      p.cards < 0 ||
      p.cards > 52 ||
      !Number.isInteger(p.score) ||
      p.score < 0 ||
      p.score > 10000 ||
      !Number.isInteger(p.moves) ||
      p.moves < 0
    )
      return;
    const valid: Progress = {
      cards: p.cards,
      score: p.score,
      moves: p.moves,
      finished: p.cards === 52 && Boolean(p.finished),
    };
    setProgress((previous) => ({ ...previous, [incoming.playerId]: valid }));
    if (valid.finished) setWinner((previous) => previous || incoming.playerId);
  }, [
    network.lastAction,
    online,
    network.isHost,
    network.players,
    race,
    dealId,
  ]);

  useEffect(() => {
    const incoming = network.lastState;
    if (
      !online ||
      network.isHost ||
      !incoming ||
      incoming.seq === processedState.current
    )
      return;
    processedState.current = incoming.seq;
    const shared = incoming.state;
    if (
      shared?.game !== "solitaire" ||
      !Number.isInteger(shared.seed) ||
      !Number.isInteger(shared.race) ||
      typeof shared.dealId !== "string"
    )
      return;
    if (receivedDeal.current !== shared.dealId) {
      receivedDeal.current = shared.dealId;
      fresh(shared.seed, shared.dealId, shared.drawCount === 3 ? 3 : 1);
      setRace(shared.race);
    }
    setProgress(shared.progress || {});
    setWinner(shared.winner || null);
  }, [network.lastState, online, network.isHost]);

  useEffect(() => {
    if (!state.won || !started || scored.current) return;
    scored.current = true;
    onScore(
      state.score + 1000,
      `Solved · ${state.moves} moves · ${clock(seconds)}`,
      `solitaire-${dealId}`,
    );
  }, [state.won, state.score, state.moves, seconds, started, dealId, onScore]);

  useEffect(() => {
    if (!autoPlaying || banked || state.won) {
      setAutoPlaying(false);
      return;
    }
    const next = foundationMove(state, undefined, !canAutoFinish(state));
    if (!next) {
      setAutoPlaying(false);
      setNotice(
        "All safe cards are home. Higher cards stay available to build columns.",
      );
      return;
    }
    const timer = window.setTimeout(() => {
      const nextState = moveCards(state, next.source, next.target);
      if (nextState) replace(nextState);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [autoPlaying, banked, state]);

  function move(source: CardSource, target: CardTarget) {
    if (banked || autoPlaying) return;
    const next = moveCards(stateRef.current, source, target);
    if (next) replace(next);
    else
      setNotice(
        target.zone === "foundation"
          ? "Foundations build from ace to king, in the same suit."
          : "Build down in alternating colors. Only a king can fill an empty column.",
      );
  }

  function selectCard(card: Card, source: CardSource) {
    if (state.won || banked || autoPlaying || !card.faceUp) return;
    if (
      selected &&
      !sameSource(selected, source) &&
      source.zone !== "waste" &&
      canMoveCards(stateRef.current, selected, {
        zone: source.zone,
        pile: source.pile,
      })
    ) {
      move(selected, { zone: source.zone, pile: source.pile });
      return;
    }
    if (sameSource(selected, source)) {
      const automatic = foundationMove(stateRef.current, source);
      if (automatic) {
        move(automatic.source, automatic.target);
        return;
      }
    }
    if (sourceCards(stateRef.current, source).length) {
      setSelected(sameSource(selected, source) ? null : source);
      setHint(null);
      setNotice(`Selected ${cardName(card)}. Choose a column or foundation.`);
    }
  }

  function auto() {
    if (banked) return;
    if (autoPlaying) {
      setAutoPlaying(false);
      setNotice("Auto-home paused.");
      return;
    }
    const next = foundationMove(
      stateRef.current,
      undefined,
      !canAutoFinish(stateRef.current),
    );
    if (next) {
      setSelected(null);
      setHint(null);
      setAutoPlaying(true);
      setNotice("Sending safe cards home… You can pause at any time.");
    } else
      setNotice(
        "No safe automatic moves yet. Keep higher cards for building columns, or send one home yourself.",
      );
  }

  function showHint() {
    const next = solitaireHint(stateRef.current);
    setHint(next);
    setSelected(next?.source || null);
    setNotice(
      next
        ? `Try moving the ${cardName(sourceCards(stateRef.current, next.source)[0])} to ${next.target.zone === "foundation" ? "a foundation" : `column ${next.target.pile + 1}`}.`
        : state.stock.length || state.waste.length
          ? "No useful board move found. Draw or recycle the deck to look for a new opening."
          : "No moves remain. You can undo a move, bank your score, or try a new deal.",
    );
  }

  function draw() {
    if (banked || autoPlaying) return;
    const next = drawStock(stateRef.current);
    if (next) replace(next);
  }

  function undoMove() {
    if (!undo.length || state.won || banked) return;
    setAutoPlaying(false);
    setState(undo[undo.length - 1]);
    setUndo((previous) => previous.slice(0, -1));
    setSelected(null);
    setHint(null);
    setNotice("One step back. A different way forward.");
  }

  function bank() {
    if (banked || state.won || !state.moves || scored.current) return;
    scored.current = true;
    setBanked(true);
    setAutoPlaying(false);
    setSelected(null);
    onScore(
      state.score,
      `Deal banked · ${foundationCount}/52 cards · ${state.moves} moves`,
      `solitaire-${dealId}`,
    );
    setNotice("Your score is banked. A fresh deal is just one shuffle away.");
  }

  function cardButton(card: Card, source: CardSource, stacked = false) {
    const active =
      selected?.zone === source.zone &&
      selected.pile === source.pile &&
      (source.zone !== "tableau"
        ? selected.index === source.index
        : source.index >= selected.index);
    const hinted = hint && sameSource(hint.source, source);
    return (
      <button
        key={card.id}
        type="button"
        data-card-id={card.id}
        data-face-up={card.faceUp}
        className={`playing-card ${!card.faceUp ? "face-down" : ""}${active ? " card-selected" : ""}${hinted ? " card-hint" : ""}`}
        style={
          stacked
            ? { marginTop: `calc(${source.index} * var(--card-fan))` }
            : undefined
        }
        aria-label={
          card.faceUp
            ? `${cardName(card)}${source.zone === "tableau" ? `, column ${source.pile + 1}` : `, ${source.zone}`}${active ? ", selected" : ""}`
            : `Face-down card, column ${source.pile + 1}`
        }
        aria-pressed={Boolean(active)}
        disabled={!card.faceUp || state.won || banked || autoPlaying}
        draggable={card.faceUp && !state.won && !banked && !autoPlaying}
        onDragStart={(event) => {
          dragSource.current = source;
          setSelected(source);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", card.id);
        }}
        onDragEnd={() => {
          dragSource.current = null;
        }}
        onClick={() => {
          if (!suppressClick.current) selectCard(card, source);
        }}
        onPointerDown={(event) => {
          if (
            event.pointerType !== "touch" ||
            !card.faceUp ||
            autoPlaying ||
            banked ||
            state.won
          )
            return;
          const box = event.currentTarget.getBoundingClientRect();
          touchDrag.current = {
            source,
            startX: event.clientX,
            startY: event.clientY,
            dx: event.clientX - box.left,
            dy: event.clientY - box.top,
            width: box.width,
            fan:
              parseFloat(
                getComputedStyle(tableRef.current!).getPropertyValue(
                  "--card-fan",
                ),
              ) || 24,
            active: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = touchDrag.current;
          if (!drag) return;
          if (
            !drag.active &&
            Math.hypot(
              event.clientX - drag.startX,
              event.clientY - drag.startY,
            ) < 8
          )
            return;
          drag.active = true;
          setSelected(drag.source);
          setDragView({
            cards: sourceCards(stateRef.current, drag.source),
            x: event.clientX - drag.dx,
            y: event.clientY - drag.dy,
            width: drag.width,
            fan: drag.fan,
          });
        }}
        onPointerUp={(event) => {
          const drag = touchDrag.current;
          touchDrag.current = null;
          setDragView(null);
          if (!drag?.active) return;
          suppressClick.current = true;
          window.setTimeout(() => {
            suppressClick.current = false;
          }, 0);
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>("[data-target-zone]");
          if (target)
            move(drag.source, {
              zone: target.dataset.targetZone as CardTarget["zone"],
              pile: Number(target.dataset.targetPile),
            });
          else setNotice("Drop onto a highlighted column or foundation.");
        }}
        onPointerCancel={() => {
          touchDrag.current = null;
          setDragView(null);
        }}
        onDoubleClick={() => {
          const next = foundationMove(stateRef.current, source);
          if (next) move(next.source, next.target);
        }}
      >
        {card.faceUp ? <CardFace card={card} /> : <CardBack />}
      </button>
    );
  }

  const targetEvents = (target: CardTarget) => ({
    "data-target-zone": target.zone,
    "data-target-pile": target.pile,
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      if (
        dragSource.current &&
        canMoveCards(stateRef.current, dragSource.current, target)
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }
    },
    onDrop: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (dragSource.current) move(dragSource.current, target);
      dragSource.current = null;
    },
  });

  return (
    <div
      className={`classics-game solitaire-game table-${tableTheme}`}
      onKeyDown={(event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.repeat ||
          /^(INPUT|SELECT|TEXTAREA)$/.test(
            (event.target as HTMLElement).tagName,
          ) ||
          banked ||
          state.won
        )
          return;
        if (event.key === "Escape") {
          setSelected(null);
          setHint(null);
          setAutoPlaying(false);
        } else if (event.key.toLowerCase() === "d") draw();
        else if (event.key.toLowerCase() === "u") undoMove();
        else if (event.key.toLowerCase() === "h" && !autoPlaying) showHint();
        else return;
        event.preventDefault();
      }}
    >
      <div className="game-toolbar classic-toolbar">
        <div className="solitaire-metrics">
          <div>
            <span>SCORE</span>
            <strong>{state.score.toLocaleString()}</strong>
          </div>
          <div>
            <span>TIME</span>
            <strong>{clock(seconds)}</strong>
          </div>
          <div>
            <span>MOVES</span>
            <strong>{state.moves}</strong>
          </div>
        </div>
        <div className="classic-toolbar-actions">
          {!online && (
            <>
              <button
                className={`game-button ${daily ? "daily-active" : ""}`}
                onClick={() => {
                  fresh(dailySeed, crypto.randomUUID(), 1);
                  setDaily(true);
                  setNotice(
                    "Today’s shared shuffle. Come back tomorrow for a new challenge.",
                  );
                }}
              >
                <CalendarDays size={13} /> Daily deal
              </button>
              <button
                className="game-button"
                onClick={() => {
                  fresh(state.seed);
                }}
                title="Start this same deal again"
              >
                <RotateCcw size={13} /> Replay deal
              </button>
            </>
          )}
          <button
            className="game-button"
            disabled={online && !network.isHost}
            onClick={newDeal}
          >
            ↻ New deal
          </button>
        </div>
      </div>
      <div className="solitaire-preferences">
        <div className="board-theme-options" aria-label="Table appearance">
          <span>YOUR TABLE</span>
          {(["garden", "midnight", "plum"] as const).map((theme) => (
            <button
              key={theme}
              className={`theme-swatch felt-${theme}`}
              aria-label={`${theme[0].toUpperCase() + theme.slice(1)} table`}
              aria-pressed={tableTheme === theme}
              onClick={() => setTableTheme(theme)}
            />
          ))}
          <button
            className="board-sound"
            aria-label={
              sound === "on" ? "Mute game sounds" : "Enable game sounds"
            }
            aria-pressed={sound === "on"}
            onClick={() => setSound(sound === "on" ? "off" : "on")}
          >
            {sound === "on" ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
        <div className="solitaire-deal-options">
          {!network.room && state.moves > 0 && !state.won && !banked && (
            <span className="saved-deal-label">✓ Saved on this device</span>
          )}
          {daily && (
            <span className="daily-deal-date">
              DAILY ·{" "}
              {String(state.seed).replace(
                /^(\d{4})(\d{2})(\d{2})$/,
                "$1-$2-$3",
              )}
            </span>
          )}
          <label className="difficulty-picker">
            Draw{" "}
            <select
              aria-label="Cards per draw"
              disabled={online && !network.isHost}
              value={state.drawCount ?? 1}
              onChange={(e) => {
                setDaily(false);
                fresh(
                  state.seed,
                  crypto.randomUUID(),
                  Number(e.target.value) === 3 ? 3 : 1,
                );
              }}
            >
              <option value="1">One card</option>
              <option value="3">Three cards</option>
            </select>
          </label>
        </div>
      </div>
      {online && (
        <div className="solitaire-race">
          <span className="classic-online">
            <i /> Same-deal race
          </span>
          {network.players.map((player) => (
            <div className="race-player" key={player.id}>
              <span>
                {player.id === network.playerId ? "You" : player.name}
                {winner === player.id ? " ♛" : ""}
              </span>
              <div>
                <i
                  style={{
                    width: `${((progress[player.id]?.cards || 0) / 52) * 100}%`,
                  }}
                />
              </div>
              <small>{progress[player.id]?.cards || 0}/52</small>
            </div>
          ))}
        </div>
      )}
      <div
        ref={tableRef}
        className={`solitaire-table ${state.won ? "solitaire-won" : ""}`}
      >
        <div className="solitaire-table-inscription" aria-hidden="true">
          <span>✧</span>
          <strong>THE QUIET CLUB</strong>
          <small>ONE CARD AT A TIME</small>
        </div>
        <div className="solitaire-top-row">
          <div className="solitaire-slot">
            <button
              data-card-id={state.stock[state.stock.length - 1]?.id}
              data-face-up="false"
              className={`playing-card stock-card ${!state.stock.length ? "empty-card" : ""}`}
              aria-label={
                state.stock.length
                  ? `Draw ${state.drawCount === 3 ? "three cards" : "a card"}, ${state.stock.length} cards left`
                  : state.waste.length
                    ? "Recycle the waste pile"
                    : "Stock empty"
              }
              onClick={draw}
              disabled={
                banked ||
                autoPlaying ||
                state.won ||
                (!state.stock.length && !state.waste.length)
              }
            >
              {state.stock.length ? (
                <CardBack />
              ) : (
                <>
                  <span className="recycle-symbol">↻</span>
                  <small>RECYCLE</small>
                </>
              )}
            </button>
            <span className="pile-caption">DECK · {state.stock.length}</span>
          </div>
          <div className="solitaire-slot waste-slot">
            {state.waste.length ? (
              cardButton(state.waste[state.waste.length - 1], {
                zone: "waste",
                pile: 0,
                index: state.waste.length - 1,
              })
            ) : (
              <div className="empty-card" aria-label="Waste pile empty">
                <span>·</span>
              </div>
            )}
            <span className="pile-caption">
              DRAW {state.drawCount === 3 ? "THREE" : "ONE"}
            </span>
          </div>
          <div className="solitaire-spacer" aria-hidden="true">
            <span>✦</span>
          </div>
          {state.foundations.map((pile, index) => (
            <div
              key={index}
              className={`solitaire-slot foundation-slot ${selected && canMoveCards(state, selected, { zone: "foundation", pile: index }) ? "accepts-card" : ""}${hint?.target.zone === "foundation" && hint.target.pile === index ? " hinted-target" : ""}`}
              {...targetEvents({ zone: "foundation", pile: index })}
            >
              {pile.length ? (
                cardButton(pile[pile.length - 1], {
                  zone: "foundation",
                  pile: index,
                  index: pile.length - 1,
                })
              ) : (
                <button
                  className="empty-card"
                  aria-label={`Empty foundation ${index + 1}, ace required`}
                  onClick={() =>
                    selected &&
                    move(selected, { zone: "foundation", pile: index })
                  }
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <SuitMark suit={suits[index]} />
                  </svg>
                  <small>ACE</small>
                </button>
              )}
              <span className="pile-caption">
                {pile.length ? `${pile.length} / 13` : "FOUNDATION"}
              </span>
            </div>
          ))}
        </div>
        <div className="solitaire-tableau">
          {state.tableau.map((pile, index) => (
            <div
              key={index}
              className={`tableau-stack ${selected && canMoveCards(state, selected, { zone: "tableau", pile: index }) ? "accepts-card" : ""}${hint?.target.zone === "tableau" && hint.target.pile === index ? " hinted-target" : ""}`}
              {...targetEvents({ zone: "tableau", pile: index })}
            >
              <button
                className="empty-card empty-column"
                aria-label={`Empty column ${index + 1}, king required`}
                tabIndex={pile.length ? -1 : 0}
                onClick={() =>
                  selected && move(selected, { zone: "tableau", pile: index })
                }
              >
                <span>K</span>
              </button>
              {pile.map((card, cardIndex) =>
                cardButton(
                  card,
                  { zone: "tableau", pile: index, index: cardIndex },
                  true,
                ),
              )}
            </div>
          ))}
        </div>
        {(state.won || banked) && (
          <div className="solitaire-result" role="status">
            <span>✦</span>
            <h3>
              {state.won ? "A perfect little order." : "A deal well played."}
            </h3>
            <p>
              {state.won
                ? `${(state.score + 1000).toLocaleString()} points · ${state.moves} moves · ${clock(seconds)}`
                : `${state.score} points banked · ${foundationCount} cards home`}
            </p>
            <button
              className="game-button"
              onClick={newDeal}
              disabled={online && !network.isHost}
            >
              {online && !network.isHost
                ? "Waiting for the next deal"
                : "Shuffle another story"}
            </button>
          </div>
        )}
      </div>
      <div className="solitaire-progress-row">
        <span className="solitaire-deal-label">
          DEAL {state.seed.toString(36).toUpperCase()} · {foundationCount} / 52
          HOME
        </span>
        <div
          className="classic-progress"
          aria-label={`${foundationCount} of 52 cards in foundations`}
        >
          <i style={{ width: `${(foundationCount / 52) * 100}%` }} />
        </div>
      </div>
      <div className="solitaire-bottom-bar">
        <p role="status" aria-live="polite">
          {notice}
        </p>
        <div className="classic-toolbar-actions">
          <button
            className="game-button"
            disabled={!undo.length || state.won || banked}
            onClick={undoMove}
          >
            ↶ Undo
          </button>
          <button
            className="game-button"
            onClick={showHint}
            disabled={state.won || banked || autoPlaying}
          >
            ✧ Hint
          </button>
          <button
            className="game-button"
            onClick={auto}
            disabled={state.won || banked}
          >
            {autoPlaying
              ? "Ⅱ Pause auto-home"
              : canAutoFinish(state)
                ? "↑ Auto-finish"
                : "↑ Auto-home"}
          </button>
          <button
            className="game-button"
            onClick={bank}
            disabled={!state.moves || state.won || banked}
          >
            Bank score
          </button>
        </div>
      </div>
      <details className="classic-rules solitaire-rules">
        <summary>
          How to play <span>＋</span>
        </summary>
        <p>
          Classic draw-one Klondike. Build columns down in alternating red and
          black. Move a king to an empty column. Build the four foundations from
          ace to king in the same suit. Draw from the deck and recycle as often
          as you like.
        </p>
        <p>
          Click a card or sequence, then its destination. You can also drag
          cards. Click a selected top card again to send it to a foundation, or
          use Auto-home to send safe cards in a smooth sequence. Once the deck
          is empty and every card is face up, Auto-finish completes the deal.
          Choose Draw three for a harder game; only the top waste card is
          playable. Changing draw mode restarts the deal. The daily deal uses
          the same draw-one shuffle for everyone each UTC day. Replay deal lets
          you try the same shuffle again. Undo restores the previous position
          and score. Hints prioritize revealing hidden cards; some deals cannot
          be solved. D draws, H hints, U undoes, and Escape clears selection or
          pauses Auto-home. Touch and drag a face-up card to move it on a phone.
        </p>
        <p>
          Each foundation card earns 10 points, and revealing a face-down card
          earns 5. Solving the deal adds 1,000 points. Bank score ends a deal
          and saves your progress as a result. In an online room, everyone plays
          the same shuffled deck on their own board; the first to complete all
          four foundations wins the race.
        </p>
      </details>
      {dragView &&
        createPortal(
          <div
            className="solitaire-touch-drag"
            aria-hidden="true"
            style={{
              left: dragView.x,
              top: dragView.y,
              width: dragView.width,
              height:
                (dragView.width * 124) / 88 +
                (dragView.cards.length - 1) * dragView.fan,
            }}
          >
            {dragView.cards.map((card, index) => (
              <div
                className="playing-card"
                key={card.id}
                style={{ top: index * dragView.fan }}
              >
                <CardFace card={card} />
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
