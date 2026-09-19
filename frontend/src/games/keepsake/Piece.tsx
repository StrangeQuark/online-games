import { useId } from "react";
import { SCENES, dimensions, piecePath, type PieceCount } from "./engine";
export default function Piece({
  piece,
  size,
  scene,
  placed = false,
}: {
  piece: number;
  size: PieceCount;
  scene: number;
  placed?: boolean;
}) {
  const id = useId().replace(/:/g, ""),
    { cols, rows } = dimensions(size),
    w = 600 / cols,
    h = 400 / rows,
    margin = Math.min(w, h) * 0.24,
    path = piecePath(size, piece);
  return (
    <svg
      viewBox={`${-margin} ${-margin} ${w + margin * 2} ${h + margin * 2}`}
      aria-hidden="true"
      className={`keepsake-piece-art${placed ? " placed" : ""}`}
    >
      <defs>
        <clipPath id={id}>
          <path d={path} />
        </clipPath>
      </defs>
      <path
        d={path}
        fill="#e8dfbc"
        stroke="#4e4b36"
        strokeWidth="2"
        transform="translate(0 1.8)"
      />
      <image
        href={`/assets/${SCENES[scene].id}.webp`}
        x={-(piece % cols) * w}
        y={-Math.floor(piece / cols) * h}
        width="600"
        height="400"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${id})`}
      />
      <path
        d={path}
        fill="none"
        stroke="#fff0cb"
        strokeWidth={placed ? 0.9 : 1.4}
        strokeOpacity={placed ? 0.45 : 0.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}
