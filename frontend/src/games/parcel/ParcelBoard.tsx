import { useId } from "react";
import { neighbor, type Puzzle, type Delivery, type Direction } from "./engine";
const CELL = 72,
  PAD = 20;
export default function ParcelBoard({
  puzzle: p,
  state: g,
  hint,
  onCell,
  facing,
}: {
  puzzle: Puzzle;
  state: Delivery;
  hint: Direction | null;
  onCell: (cell: number) => void;
  facing: Direction;
}) {
  const id = useId().replace(/:/g, ""),
    at = (cell: number) => ({
      x: PAD + (cell % p.width) * CELL,
      y: PAD + Math.floor(cell / p.width) * CELL,
    }),
    to = hint ? neighbor(p, g.player, hint) : -1;
  return (
    <svg
      className="parcel-board"
      viewBox={`0 0 ${p.width * CELL + PAD * 2} ${p.height * CELL + PAD * 2}`}
      role="group"
      aria-label="Delivery courtyard. Arrow keys move. Push every parcel onto a brass pad."
      data-player={g.player}
      data-boxes={JSON.stringify(g.boxes)}
      data-won={String(g.won)}
    >
      <defs>
        <linearGradient id={`${id}ground`} x2="0" y2="1">
          <stop stopColor="#e5d9b7" />
          <stop offset="1" stopColor="#c9bf98" />
        </linearGradient>
        <linearGradient id={`${id}crate`} x2="0" y2="1">
          <stop stopColor="#d7a76c" />
          <stop offset="1" stopColor="#b78652" />
        </linearGradient>
        <pattern
          id={`${id}grain`}
          width="17"
          height="23"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="5" r=".7" fill="#655f47" opacity=".17" />
          <circle cx="12" cy="17" r=".8" fill="#fff9dc" opacity=".4" />
        </pattern>
      </defs>
      <rect
        x="3"
        y="3"
        width={p.width * CELL + PAD * 2 - 6}
        height={p.height * CELL + PAD * 2 - 6}
        rx="24"
        fill="#6a7d66"
      />
      <rect
        x="9"
        y="9"
        width={p.width * CELL + PAD * 2 - 18}
        height={p.height * CELL + PAD * 2 - 18}
        rx="20"
        fill="#95a27e"
        stroke="#bcc399"
        strokeWidth="2"
      />
      {Array.from({ length: p.width * p.height }, (_, cell) => {
        const { x, y } = at(cell),
          wall = p.walls.includes(cell),
          goal = p.goals.includes(cell),
          box = g.boxes.includes(cell),
          player = g.player === cell;
        return (
          <g
            key={cell}
            transform={`translate(${x} ${y})`}
            role={wall ? undefined : "button"}
            tabIndex={player ? 0 : -1}
            aria-label={
              wall
                ? undefined
                : `Row ${Math.floor(cell / p.width) + 1}, column ${(cell % p.width) + 1}${player ? ", courier" : ""}${box ? ", parcel" : ""}${goal ? ", delivery pad" : ""}`
            }
            onClick={() => !wall && onCell(cell)}
            onKeyDown={(e) => {
              if (!wall && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onCell(cell);
              }
            }}
            className={wall ? "parcel-wall" : "parcel-tile"}
          >
            {wall ? (
              <>
                <rect
                  x="1"
                  y="8"
                  width="70"
                  height="65"
                  rx="9"
                  fill="#455e49"
                />
                <rect
                  x="1"
                  y="1"
                  width="70"
                  height="62"
                  rx="9"
                  fill={cell % 3 === 0 ? "#779165" : "#6e855c"}
                  stroke="#829d6f"
                />
                <path
                  d="M12 20q12-12 22-5m8 20q12-10 20 0M15 49q12-8 20-3"
                  fill="none"
                  stroke="#a0b37e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity=".5"
                />
                {cell % 4 === 0 && (
                  <>
                    <circle cx="53" cy="18" r="3" fill="#e2d297" />
                    <circle cx="56" cy="14" r="2" fill="#e9dbb7" />
                  </>
                )}
              </>
            ) : (
              <>
                <rect
                  x="2"
                  y="3"
                  width="68"
                  height="67"
                  rx="7"
                  fill={`url(#${id}ground)`}
                  stroke="#b4ad89"
                />
                <rect
                  x="4"
                  y="5"
                  width="64"
                  height="62"
                  rx="6"
                  fill={`url(#${id}grain)`}
                />
                <path
                  d="M12 9h35"
                  stroke="#f5eccf"
                  strokeWidth="2"
                  opacity=".6"
                />
                {goal && (
                  <g className={box ? "parcel-pad delivered" : "parcel-pad"}>
                    <circle
                      cx="36"
                      cy="38"
                      r="25"
                      fill={box ? "#829e72" : "#b8985c"}
                      stroke="#ead59b"
                      strokeWidth="3"
                    />
                    <circle
                      cx="36"
                      cy="38"
                      r="19"
                      fill="none"
                      stroke="#705d3e"
                      strokeWidth="1"
                    />
                    <path
                      d="M23 29h26v18H23zm0 0 13 10 13-10"
                      fill="none"
                      stroke="#f3e0aa"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
                {to === cell && (
                  <g className="parcel-hint">
                    <circle
                      cx="36"
                      cy="36"
                      r="28"
                      fill="#fff4bf55"
                      stroke="#edab56"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="m29 31 8 5-8 5m-8-5h17"
                      stroke="#72512c"
                      strokeWidth="3"
                      fill="none"
                      transform={`rotate(${hint === "down" ? 90 : hint === "left" ? 180 : hint === "up" ? 270 : 0} 36 36)`}
                    />
                  </g>
                )}
              </>
            )}
          </g>
        );
      })}
      {g.boxes.map((cell, i) => {
        const { x, y } = at(cell),
          done = p.goals.includes(cell);
        return (
          <g
            key={`box${i}`}
            className="parcel-moving"
            style={{ transform: `translate(${x}px, ${y}px)` }}
            pointerEvents="none"
          >
            <ellipse
              cx="38"
              cy="60"
              rx="29"
              ry="10"
              fill="#424932"
              opacity=".22"
            />
            <path
              d="M10 23 18 13h37l8 10v35L53 65H18l-8-8Z"
              fill={done ? "#88a370" : "#966e47"}
              stroke={done ? "#526f44" : "#90623c"}
              strokeWidth="1.5"
            />
            <rect
              x="10"
              y="21"
              width="52"
              height="37"
              rx="3"
              fill={done ? "#a9bc89" : `url(#${id}crate)`}
            />
            <path d="M34 13h7l-1 9v36h-8V22z" fill="#f0d7a6" />
            <path d="M10 35h52v5H10z" fill="#ebd4a8" />
            <path d="m31 22 5-5 5 5-5 4z" fill="#c69963" stroke="#f5dfb5" />
            <rect
              x="45"
              y="43"
              width="11"
              height="9"
              rx="1"
              fill="#f6eacb"
              transform="rotate(-8 50 48)"
            />
            {done ? (
              <path
                d="m20 47 4 4 7-8"
                fill="none"
                stroke="#3d653e"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ) : (
              <path d="M19 29h9m-9 3h6" stroke="#8c663d" strokeWidth="1" />
            )}
          </g>
        );
      })}
      {(() => {
        const { x, y } = at(g.player);
        return (
          <g
            className="parcel-moving parcel-courier"
            style={{ transform: `translate(${x}px, ${y}px)` }}
            pointerEvents="none"
          >
            <ellipse
              cx="36"
              cy="60"
              rx="20"
              ry="8"
              fill="#48523a"
              opacity=".23"
            />
            <rect x="19" y="31" width="15" height="24" rx="5" fill="#997c50" />
            <path
              d="M27 52v10h8V51m4 0v11h8V51"
              stroke="#334b48"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M23 37q13-9 27 0l-2 20H25Z"
              fill="#648d86"
              stroke="#426c65"
              strokeWidth="2"
            />
            <path d="m24 36 23 17" stroke="#c7aa77" strokeWidth="5" />
            <rect x="33" y="18" width="18" height="22" rx="8" fill="#f0d7ac" />
            <path d="M29 21q1-15 16-12 12 1 10 15Z" fill="#d58469" />
            <path
              d="M26 23q15 4 32 0"
              stroke="#aa5b46"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle
              cx={facing === "left" ? 36 : 43}
              cy="29"
              r="1.5"
              fill="#4b5044"
            />
            <path d="M35 38q7 4 14-1l3 7-8-2-3 7-4-6Z" fill="#e3b66e" />
          </g>
        );
      })()}
    </svg>
  );
}
