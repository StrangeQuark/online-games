import { memo } from "react";
import { MAPS, type MapId } from "./map";

export const ArenaPicker = memo(function ArenaPicker({
  selected,
  host,
  playing,
  onSelect,
}: {
  selected: MapId;
  host: boolean;
  playing: boolean;
  onSelect: (map: MapId) => void;
}) {
  return (
    <div className="rift-arena-picker" aria-label="Choose an arena">
      <div className="rift-arena-heading">
        <span className="custom-eyebrow">FIELD OPERATIONS / 04 ARENAS</span>
        <span>
          {!host
            ? "The host chooses the arena"
            : playing
              ? "New match to change arena"
              : "Choose your battleground"}
        </span>
      </div>
      <div className="rift-arena-grid">
        {MAPS.map((map, index) => (
          <button
            key={map.id}
            className={`rift-arena-card theme-${map.theme}${map.id === selected ? " selected" : ""}`}
            aria-pressed={map.id === selected}
            aria-label={`Select ${map.name}`}
            disabled={!host || playing}
            onClick={() => onSelect(map.id)}
          >
            <svg
              viewBox={`${-map.width / 2 - 2} ${-map.depth / 2 - 2} ${map.width + 4} ${map.depth + 4}`}
              aria-hidden="true"
            >
              <rect
                x={-map.width / 2}
                y={-map.depth / 2}
                width={map.width}
                height={map.depth}
                className="rift-plan-floor"
              />
              {map.solids.map((solid, i) => (
                <rect
                  key={i}
                  x={solid.x - solid.w / 2}
                  y={solid.z - solid.d / 2}
                  width={solid.w}
                  height={solid.d}
                  className={`rift-plan-${solid.kind}`}
                />
              ))}
              {map.ramps.map((ramp, i) => (
                <rect
                  key={`r${i}`}
                  x={ramp.x - ramp.w / 2}
                  y={ramp.z - ramp.d / 2}
                  width={ramp.w}
                  height={ramp.d}
                  className="rift-plan-ramp"
                />
              ))}
              {map.spawns.map((spawn, i) => (
                <circle
                  key={`s${i}`}
                  cx={spawn.x}
                  cy={spawn.z}
                  r="0.75"
                  className="rift-plan-spawn"
                />
              ))}
            </svg>
            <span className="rift-arena-index">
              0{index + 1} / {map.id === selected ? "SELECTED" : "ARENA"}
            </span>
            <strong>{map.name}</strong>
            <span>{map.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
