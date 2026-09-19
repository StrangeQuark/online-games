import { useId } from "react";
import { KINDS, type Gem } from "./engine";
export function Flower({ gem }: { gem: Gem }) {
  const id = useId();
  const color = KINDS[gem.kind].color;
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`petal-flower flower-${gem.kind}${gem.special ? " special-flower" : ""}`}
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="75%">
          <stop stopColor="#fff1d2" stopOpacity=".85" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".65" />
        </radialGradient>
      </defs>
      <g
        fill={`url(#${id})`}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        {gem.kind === 0 && (
          <>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse
                key={angle}
                cx="32"
                cy="20"
                rx="10"
                ry="14"
                transform={`rotate(${angle} 32 32)`}
              />
            ))}
            <circle cx="32" cy="32" r="8" fill="#f7d6a1" stroke="#eac28c" />
            <circle cx="30" cy="30" r="2" fill="#fff0bd" stroke="none" />
          </>
        )}
        {gem.kind === 1 && (
          <>
            <path d="M32 31C7 34 8 11 20 13C26 8 36 17 32 31Z" />
            <path d="M32 31C29 7 54 8 51 20C58 28 45 36 32 31Z" />
            <path d="M32 31C57 29 57 54 43 51C35 58 28 45 32 31Z" />
            <path d="M32 31C36 55 10 58 13 43C6 35 18 27 32 31Z" />
            <path
              d="M32 32q-3 14-10 22"
              fill="none"
              stroke="#cee8b0"
              strokeWidth="2"
            />
          </>
        )}
        {gem.kind === 2 && (
          <>
            <path d="M32 7C28 16 13 30 13 41a19 19 0 0 0 38 0C51 30 36 16 32 7Z" />
            <path
              d="M21 32c-4 8-3 14 3 17"
              fill="none"
              stroke="#e0f3e8"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".65"
            />
          </>
        )}
        {gem.kind === 3 && (
          <>
            <path d="m32 5 7 15 16-3-7 15 7 15-16-3-7 15-7-15-16 3 7-15-7-15 16 3Z" />
            <circle cx="32" cy="32" r="12" fill="#d4a65d" />
            <circle cx="29" cy="28" r="7" fill="#f6da8e" stroke="none" />
          </>
        )}
        {gem.kind === 4 && (
          <>
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <path
                key={angle}
                d="M32 32Q15 24 32 5Q49 24 32 32Z"
                transform={`rotate(${angle} 32 32)`}
              />
            ))}
            <circle cx="32" cy="32" r="7" fill="#ddd2ef" stroke="#a796d1" />
          </>
        )}
        {gem.kind === 5 && (
          <>
            <path d="M46 9A25 25 0 1 0 52 48C25 55 14 20 46 9Z" />
            <path
              d="m43 21 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"
              fill="#f6e8ba"
              stroke="none"
            />
          </>
        )}
      </g>
      {gem.special && (
        <g
          className="petal-special-mark"
          fill="none"
          stroke="#fffbd5"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {gem.special === "row" ? (
            <>
              <path d="M6 30h12M46 30h12M6 35h12M46 35h12" />
            </>
          ) : gem.special === "column" ? (
            <path d="M29 5v12M35 5v12M29 47v12M35 47v12" />
          ) : gem.special === "bloom" ? (
            <circle cx="32" cy="32" r="27" strokeDasharray="4 5" />
          ) : (
            <>
              <circle cx="32" cy="32" r="27" />
              <path
                d="m32 18 4 10 11 4-11 4-4 11-4-11-11-4 11-4Z"
                fill="#fff6d5"
              />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
