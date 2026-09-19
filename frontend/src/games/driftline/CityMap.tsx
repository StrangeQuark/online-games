import { BUILDINGS, LANDMARKS, STREETS, routeTo, type CityDrive } from "./city";
export default function CityMap({
  game,
  destination,
  expanded = false,
  onSelect,
}: {
  game: Pick<CityDrive, "x" | "z" | "heading" | "visited">;
  destination: string;
  expanded?: boolean;
  onSelect?: (id: string) => void;
}) {
  const target = LANDMARKS.find((p) => p.id === destination);
  return (
    <svg
      className={`city-map${expanded ? " expanded" : ""}`}
      viewBox={
        expanded
          ? "-780 -780 1620 1560"
          : `${game.x - 230} ${game.z - 230} 460 460`
      }
      role="img"
      aria-label="City map: your car, roads, and destinations"
    >
      <rect x="-1300" y="-1300" width="2600" height="2600" fill="#263b3e" />
      <path d="M745 -1300H1300V1300H745Z" fill="#3b6973" />
      <rect x="18" y="18" width="124" height="124" rx="10" fill="#62826b" />
      <rect x="-142" y="-462" width="124" height="124" rx="10" fill="#62826b" />
      {BUILDINGS.map((b, i) => (
        <rect
          key={i}
          x={b.x - b.w / 2}
          y={b.z - b.d / 2}
          width={b.w}
          height={b.d}
          fill={b.style === 2 || b.style === 3 ? "#789192" : "#526a69"}
        />
      ))}
      {STREETS.map((s) => (
        <g key={s} stroke="#a8b7a9" strokeWidth="9" opacity=".5">
          <path d={`M${s} -710V710`} />
          <path d={`M-710 ${s}H710`} />
        </g>
      ))}
      {target && (
        <polyline
          points={routeTo(game, target)
            .map((p) => `${p.x},${p.z}`)
            .join(" ")}
          fill="none"
          stroke="#f5d599"
          strokeWidth={expanded ? 9 : 6}
          strokeLinejoin="round"
          strokeDasharray={expanded ? "18 12" : undefined}
        />
      )}
      {LANDMARKS.map((p) => (
        <g
          key={p.id}
          onClick={() => onSelect?.(p.id)}
          style={{ cursor: onSelect ? "pointer" : undefined }}
        >
          <circle
            cx={p.x}
            cy={p.z}
            r={expanded ? 22 : 24}
            fill={p.id === destination ? "#f4d193" : p.color}
            stroke="#263b3e"
            strokeWidth="8"
          />
          {expanded && (
            <text
              x={p.x - 8}
              y={p.z - 37}
              fill="#f5ebd3"
              fontSize="25"
              fontFamily="sans-serif"
              textAnchor={p.x > 500 ? "end" : "middle"}
            >
              {p.name}
            </text>
          )}
          {game.visited.includes(p.id) && (
            <circle cx={p.x} cy={p.z} r="7" fill="#244944" />
          )}
        </g>
      ))}
      <g
        transform={`translate(${game.x} ${game.z}) rotate(${(game.heading * 180) / Math.PI})`}
      >
        <circle r="37" fill="#f8e4b9" opacity=".12" />
        <path
          d="M0 -30L20 23L0 14L-20 23Z"
          fill="#fff0c8"
          stroke="#273c3d"
          strokeWidth="6"
        />
      </g>
      <text
        x={expanded ? -711 : game.x - 202}
        y={expanded ? -680 : game.z - 179}
        fill="#e6d9b7"
        fontSize={expanded ? 44 : 27}
        fontFamily="sans-serif"
      >
        N ↑
      </text>
    </svg>
  );
}
