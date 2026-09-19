import type { Color, PieceKind } from "./chessRules";
import { useId } from "react";

// Original vector silhouettes: one continuous ink contour and restrained engraved details.
export function ChessPiece({ kind, color }: { kind: PieceKind; color: Color }) {
  const gradient = useId();
  const fill = color === "white" ? "#f5e7c3" : "#253f40";
  const edge = color === "white" ? "#59442d" : "#c4d0bd";
  const detail = color === "white" ? "#b98e50" : "#81a095";
  const shapes: Record<PieceKind, React.ReactNode> = {
    p: (
      <>
        <path d="M26 44c4-7 5-13 5-17a9 9 0 1 1 10 0c0 4 1 10 5 17l-3 5H29z" />
        <path d="M28 30h16M30 35h12" fill="none" stroke={detail} />
      </>
    ),
    r: (
      <>
        <path
          d="M22 12h9v7h5v-7h5v7h5v-7h9v17l-7 5 3 17H25l3-17-6-5z"
          transform="translate(-2 0)"
        />
        <path d="M25 27h22M31 34v11m10-11v11" fill="none" stroke={detail} />
      </>
    ),
    n: (
      <>
        <path d="m22 49 2-13 6-9-7 5-8-5 6-11 11-6 3-5 6 5c15 5 18 19 12 31l-5 10H22Z" />
        <path
          d="m35 14 5 3-2 8-8 8m15-17c7 9 6 19 1 25M23 23l5-2"
          fill="none"
          stroke={detail}
        />
        <circle cx="32" cy="18" r="1.6" fill={edge} stroke="none" />
      </>
    ),
    b: (
      <>
        <path d="M25 47c6-8 8-15 7-18-11-7-1-18 4-23 5 5 15 16 4 23-1 3 1 10 7 18l-4 4H29z" />
        <path d="m39 14-6 10m-4 9h14m-12 5h10" stroke={detail} fill="none" />
        <circle cx="36" cy="6" r="2.3" />
      </>
    ),
    q: (
      <>
        <path d="m23 18 7 8 6-13 6 13 8-8-5 18-1 7 5 8H23l5-8-1-7z" />
        <path d="M28 34h16M29 40h14" stroke={detail} fill="none" />
        <circle cx="22" cy="16" r="3.4" />
        <circle cx="36" cy="11" r="3.4" />
        <circle cx="51" cy="16" r="3.4" />
      </>
    ),
    k: (
      <>
        <path d="M33 5h6v6h6v6h-6v6h-6v-6h-6v-6h6z" />
        <path d="M27 23c-12 0-9 14 2 16l-3 12h20l-3-12c11-2 14-16 2-16-4 0-7 3-9 7-2-4-5-7-9-7z" />
        <path
          d="M30 39h12M31 44h10m5-17c5 0 5 7-1 9"
          stroke={detail}
          fill="none"
        />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 72 72"
      fill={`url(#${gradient})`}
      stroke={edge}
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2=".6">
          <stop stopColor={color === "white" ? "#fff7db" : "#5f8177"} />
          <stop offset=".42" stopColor={fill} />
          <stop
            offset="1"
            stopColor={color === "white" ? "#d3b782" : "#192e31"}
          />
        </linearGradient>
      </defs>
      <ellipse
        cx="36"
        cy="62"
        rx="23"
        ry="4"
        fill="#091a25"
        opacity=".18"
        stroke="none"
      />
      {shapes[kind]}
      <path d="M24 49h24l4 6H20z" />
      <path d="M20 55h32l3 6H17z" />
      <path d="M23 58h26" fill="none" stroke={detail} />
    </svg>
  );
}

export function CheckerPiece({ king, red }: { king: boolean; red: boolean }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x2=".7" y2="1">
          <stop stopColor={red ? "#f6bf82" : "#7daca2"} />
          <stop offset="1" stopColor={red ? "#a85038" : "#233d3c"} />
        </linearGradient>
      </defs>
      <ellipse cx="36" cy="42" rx="26" ry="22" fill="#0e2425" opacity=".5" />
      <ellipse
        cx="36"
        cy="37"
        rx="25"
        ry="24"
        fill={red ? "#8c3e2f" : "#203c3a"}
        stroke={red ? "#eac39b" : "#abc4b4"}
        strokeWidth="1.5"
      />
      <circle
        cx="36"
        cy="33"
        r="25"
        fill={`url(#${gradient})`}
        stroke={red ? "#fce1b2" : "#a7c7b7"}
        strokeWidth="1.5"
      />
      <circle
        cx="36"
        cy="33"
        r="19"
        fill="none"
        stroke={red ? "#783b2c" : "#193431"}
        strokeWidth="1.5"
      />
      <circle
        cx="36"
        cy="33"
        r="16"
        fill="none"
        stroke={red ? "#ffd6a0" : "#b2d3be"}
        opacity=".6"
      />
      {king ? (
        <path
          d="m24 27 7 6 5-10 5 10 7-6-3 16H27z"
          fill={red ? "#fff0bd" : "#e0eaca"}
          stroke={red ? "#8a4f35" : "#254941"}
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="m36 25 3 5 6 3-6 3-3 5-3-5-6-3 6-3z"
          fill={red ? "#fbd29a" : "#a4c5ae"}
        />
      )}
    </svg>
  );
}
