import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { squareName } from "./chessRules";

type BoardPiece = { square: number; id: string; element: ReactNode };

export default function Board({
  flipped = false,
  selected,
  destinations,
  lastMove,
  checked,
  suggestion,
  pieces,
  labels,
  onSquare,
  onMove,
  movable = [],
  onClear,
  emphasized = [],
  kind = "chess",
}: {
  flipped?: boolean;
  selected: number | null;
  destinations: number[];
  lastMove?: { from: number; to: number } | null;
  checked?: number;
  suggestion?: { from: number; to: number } | null;
  pieces: BoardPiece[];
  labels: string[];
  onSquare: (square: number) => void;
  onMove?: (from: number, to: number) => void;
  movable?: number[];
  onClear?: () => void;
  emphasized?: number[];
  kind?: "chess" | "checkers";
}) {
  const arrowId = useId();
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    from: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<{
    from: number;
    x: number;
    y: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const finishDrag = (x: number, y: number, cancel = false) => {
    const current = drag.current,
      rect = boardRef.current?.getBoundingClientRect();
    drag.current = null;
    setDragOffset(null);
    if (!current?.active) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    if (
      cancel ||
      !rect ||
      x < rect.left ||
      x >= rect.right ||
      y < rect.top ||
      y >= rect.bottom
    )
      return;
    const display =
      Math.floor(((y - rect.top) / rect.height) * 8) * 8 +
      Math.floor(((x - rect.left) / rect.width) * 8);
    onMove?.(current.from, flipped ? 63 - display : display);
  };
  const [focusSquare, setFocusSquare] = useState(52);
  const [departing, setDeparting] = useState<BoardPiece[]>([]);
  const previousPieces = useRef(pieces);
  useLayoutEffect(() => {
    const ids = new Set(pieces.map((p) => p.id));
    const captured = previousPieces.current.filter((p) => !ids.has(p.id));
    previousPieces.current = pieces;
    if (captured.length) setDeparting(captured);
  }, [pieces]);
  useEffect(() => {
    if (!departing.length) return;
    const timer = window.setTimeout(() => setDeparting([]), 280);
    return () => window.clearTimeout(timer);
  }, [departing]);

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClear?.();
      event.preventDefault();
      return;
    }
    const direction: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (!(event.key in direction)) return;
    const current = Number((event.target as HTMLButtonElement).dataset.display);
    if (!Number.isFinite(current)) return;
    const [dr, dc] = direction[event.key];
    const next =
      Math.max(0, Math.min(7, Math.floor(current / 8) + dr)) * 8 +
      Math.max(0, Math.min(7, (current % 8) + dc));
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-display="${next}"]`)
      ?.focus();
    event.preventDefault();
  }
  const position = (square: number) => {
    const display = flipped ? 63 - square : square;
    return {
      transform: `translate(${(display % 8) * 100}%, ${Math.floor(display / 8) * 100}%)`,
    };
  };
  return (
    <div
      ref={boardRef}
      className={`classic-board ${kind}-board${dragOffset ? " is-dragging" : ""}`}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current) return;
        const x = event.clientX - current.x,
          y = event.clientY - current.y;
        if (!current.active && Math.hypot(x, y) < 7) return;
        if (!current.active) {
          current.active = true;
          if (selected !== current.from) onSquare(current.from);
        }
        setDragOffset({ from: current.from, x, y });
        event.preventDefault();
      }}
      onPointerUp={(event) => finishDrag(event.clientX, event.clientY)}
      onPointerCancel={(event) =>
        finishDrag(event.clientX, event.clientY, true)
      }
      onKeyDown={navigate}
      aria-label={`${kind} board; arrow keys navigate, Enter selects, Escape clears selection`}
    >
      {Array.from({ length: 64 }, (_, display) => {
        const square = flipped ? 63 - display : display;
        const dark = (Math.floor(square / 8) + (square % 8)) % 2 === 1;
        return (
          <button
            key={square}
            data-display={display}
            data-square={square}
            type="button"
            tabIndex={focusSquare === square ? 0 : -1}
            onFocus={() => setFocusSquare(square)}
            className={`board-square ${dark ? "dark" : "light"}${selected === square ? " selected" : ""}${lastMove?.from === square || lastMove?.to === square ? " last-move" : ""}${checked === square ? " in-check" : ""}`}
            style={{ touchAction: movable.includes(square) ? "none" : "auto" }}
            onPointerDown={(event) => {
              if (event.button !== 0 || !movable.includes(square) || !onMove)
                return;
              drag.current = {
                from: square,
                x: event.clientX,
                y: event.clientY,
                active: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onClick={() => {
              if (!suppressClick.current) onSquare(square);
            }}
            aria-label={`${squareName(square)}${labels[square] ? `, ${labels[square]}` : ", empty"}${destinations.includes(square) ? ", legal move" : ""}`}
            aria-pressed={selected === square}
          >
            {display % 8 === 0 && (
              <span className="rank-label">{squareName(square)[1]}</span>
            )}
            {display >= 56 && (
              <span className="file-label">{squareName(square)[0]}</span>
            )}
          </button>
        );
      })}
      <div className="board-pieces" aria-hidden="true">
        {departing.map((piece) => (
          <div
            className="board-piece captured-piece"
            key={`captured-${piece.id}`}
            style={position(piece.square)}
          >
            <div>{piece.element}</div>
          </div>
        ))}
        {pieces.map((piece) => (
          <div
            className={`board-piece${dragOffset?.from === piece.square ? " dragging-piece" : ""}${lastMove?.to === piece.square ? " moved-piece" : ""}${selected === piece.square ? " selected-piece" : ""}`}
            key={piece.id}
            data-piece-id={piece.id}
            data-piece-square={piece.square}
            style={{
              ...position(piece.square),
              ...(dragOffset?.from === piece.square
                ? {
                    transform: `${position(piece.square).transform} translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                  }
                : {}),
            }}
          >
            {piece.element}
          </div>
        ))}
      </div>
      {suggestion && (
        <svg className="board-hint-arrow" viewBox="0 0 8 8" aria-hidden="true">
          <defs>
            <marker
              id={arrowId}
              markerWidth="2.4"
              markerHeight="2.4"
              refX="1.5"
              refY="1.2"
              orient="auto"
            >
              <path d="M0 0 L2.1 1.2 L0 2.4Z" fill="currentColor" />
            </marker>
          </defs>
          <line
            x1={((flipped ? 63 - suggestion.from : suggestion.from) % 8) + 0.5}
            y1={
              Math.floor(
                (flipped ? 63 - suggestion.from : suggestion.from) / 8,
              ) + 0.5
            }
            x2={((flipped ? 63 - suggestion.to : suggestion.to) % 8) + 0.5}
            y2={
              Math.floor((flipped ? 63 - suggestion.to : suggestion.to) / 8) +
              0.5
            }
            stroke="currentColor"
            strokeWidth=".12"
            strokeLinecap="round"
            markerEnd={`url(#${arrowId})`}
          />
        </svg>
      )}
      <div className="board-markers" aria-hidden="true">
        {[...new Set(destinations)].map((square) => (
          <div
            key={`move-${square}`}
            className="square-marker"
            style={position(square)}
          >
            <span className={labels[square] ? "move-ring" : "move-dot"} />
          </div>
        ))}
        {emphasized.map((square) => (
          <div
            key={`forced-${square}`}
            className="square-marker"
            style={position(square)}
          >
            <span className="capture-required">!</span>
          </div>
        ))}
        {checked !== undefined && (
          <div className="square-marker" style={position(checked)}>
            <span className="check-indicator">!</span>
          </div>
        )}
      </div>
    </div>
  );
}
