import { isRed, type Card, type Suit } from "./solitaireRules";

export function SuitMark({
  suit,
  x = 0,
  y = 0,
  size = 20,
}: {
  suit: Suit;
  x?: number;
  y?: number;
  size?: number;
}) {
  const path = {
    hearts: "M10 18S0 12 0 6C0 0 7-1 10 4c3-5 10-4 10 2 0 6-10 12-10 12Z",
    diamonds: "m10 0 10 10-10 10L0 10Z",
    clubs:
      "M7 19h6l-2-6c7 7 14-4 6-7-1 0-3 0-4 1 5-10-11-10-6 0-1-1-3-1-4-1-8 3-1 14 6 7Z",
    spades: "M7 20h6l-2-6c9 7 17-4-1-14C-8 10 0 21 9 14Z",
  }[suit];
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 20})`}>
      <path d={path} />
    </g>
  );
}

export function CardBack() {
  return (
    <svg viewBox="0 0 88 124" aria-hidden="true">
      <rect x="1" y="1" width="86" height="122" rx="6" fill="#e9dfc6" />
      <rect x="5" y="5" width="78" height="114" rx="3" fill="#234a4e" />
      <path
        d="M10 24 44 9l34 15v76l-34 15-34-15z"
        fill="none"
        stroke="#bbac77"
        strokeWidth=".7"
      />
      <path
        d="m14 30 30-15 30 15v64l-30 15-30-15zM9 62h70M44 9v106"
        fill="none"
        stroke="#739486"
        strokeWidth=".6"
      />
      <path d="m44 29 7 20 19 13-19 13-7 20-7-20-19-13 19-13z" fill="#ad985d" />
      <path
        d="m44 38 5 16 13 8-13 8-5 16-5-16-13-8 13-8z"
        fill="#234a4e"
        stroke="#e9d8a3"
        strokeWidth=".8"
      />
      <circle cx="44" cy="62" r="10" fill="none" stroke="#d8c38a" />
      <circle cx="44" cy="62" r="4" fill="#d8c38a" />
      {[20, 68].flatMap((x) =>
        [19, 105].map((y) => (
          <path
            key={`${x}${y}`}
            d={`m${x} ${y - 4} 2 3 3 1-3 1-2 3-2-3-3-1 3-1z`}
            fill="#c5b17c"
          />
        )),
      )}
      <path
        d="m12 44 6 6-6 6m64-12-6 6 6 6M12 68l6 6-6 6m64-12-6 6 6 6"
        fill="none"
        stroke="#c5b17c"
        strokeWidth=".8"
      />
    </svg>
  );
}

const pipPositions: Record<number, [number, number][]> = {
  1: [[44, 62]],
  2: [
    [44, 32],
    [44, 92],
  ],
  3: [
    [44, 32],
    [44, 62],
    [44, 92],
  ],
  4: [
    [29, 32],
    [59, 32],
    [29, 92],
    [59, 92],
  ],
  5: [
    [29, 32],
    [59, 32],
    [44, 62],
    [29, 92],
    [59, 92],
  ],
  6: [
    [29, 32],
    [59, 32],
    [29, 62],
    [59, 62],
    [29, 92],
    [59, 92],
  ],
  7: [
    [29, 32],
    [59, 32],
    [44, 47],
    [29, 62],
    [59, 62],
    [29, 92],
    [59, 92],
  ],
  8: [
    [29, 32],
    [59, 32],
    [44, 47],
    [29, 62],
    [59, 62],
    [44, 77],
    [29, 92],
    [59, 92],
  ],
  9: [
    [29, 29],
    [59, 29],
    [29, 51],
    [59, 51],
    [44, 62],
    [29, 73],
    [59, 73],
    [29, 95],
    [59, 95],
  ],
  10: [
    [29, 29],
    [59, 29],
    [44, 40],
    [29, 51],
    [59, 51],
    [29, 73],
    [59, 73],
    [44, 84],
    [29, 95],
    [59, 95],
  ],
};

export function CardFace({ card }: { card: Card }) {
  const ink = isRed(card) ? "#aa453d" : "#234443";
  const rank =
    ({ 1: "A", 11: "J", 12: "Q", 13: "K" } as Record<number, string>)[
      card.rank
    ] || card.rank;
  return (
    <svg viewBox="0 0 88 124" aria-hidden="true">
      <rect
        x=".75"
        y=".75"
        width="86.5"
        height="122.5"
        rx="6"
        fill="#faf3df"
        stroke="#d4c7a7"
        strokeWidth="1.5"
      />
      <rect
        x="3.5"
        y="3.5"
        width="81"
        height="117"
        rx="4"
        fill="none"
        stroke="#eae0c9"
        strokeWidth=".5"
      />
      <g fill={ink}>
        <text
          x="11"
          y="19"
          textAnchor="middle"
          fontFamily="Georgia,serif"
          fontWeight="bold"
          fontSize="16"
        >
          {rank}
        </text>
        <SuitMark suit={card.suit} x={6} y={22} size={10} />
        <g transform="rotate(180 44 62)">
          <text
            x="11"
            y="19"
            textAnchor="middle"
            fontFamily="Georgia,serif"
            fontWeight="bold"
            fontSize="16"
          >
            {rank}
          </text>
          <SuitMark suit={card.suit} x={6} y={22} size={10} />
        </g>
        {card.rank <= 10 ? (
          pipPositions[card.rank].map(([x, y], index) => (
            <SuitMark
              key={index}
              suit={card.suit}
              x={x - (card.rank === 1 ? 15 : 7)}
              y={y - (card.rank === 1 ? 15 : 7)}
              size={card.rank === 1 ? 30 : 14}
            />
          ))
        ) : (
          <g>
            <rect
              x="23"
              y="23"
              width="42"
              height="78"
              rx="18"
              fill="#eee2c4"
              stroke={ink}
              strokeWidth=".8"
            />
            <path d="M25 86c1-18 37-18 38 0v10H25z" fill={ink} />
            <path d="m29 86 15-9 15 9m-15-9v20" fill="none" stroke="#c3a666" />
            <path
              d="M34 48c-4 27 24 27 20 0"
              fill="#f1ce9e"
              stroke={ink}
              strokeWidth="1.3"
            />
            <path d="M31 51c-2-24 27-24 27 0l-9-7-6 3-9-1-3 5z" fill={ink} />
            <path
              d={
                card.rank === 12
                  ? "m31 38 3-11 7 7 3-13 4 13 7-7 3 11z"
                  : card.rank === 13
                    ? "m30 38-1-12 9 6 6-12 6 12 9-6-1 12z"
                    : "m29 37 10-13 17 7 3 9-15-4z"
              }
              fill="#bea065"
              stroke={ink}
              strokeWidth="1"
            />
            <path
              d="M37 54h3m8 0h3m-9 10h5m-3-9-1 5h3"
              fill="none"
              stroke={ink}
              strokeWidth="1"
            />
            {card.rank === 13 && (
              <path d="m36 62 8 4 8-4-3 11h-10z" fill={ink} />
            )}
            <SuitMark suit={card.suit} x={39} y={86} size={10} />
            <circle cx="44" cy="30" r="2" fill="#f8e1a2" />
          </g>
        )}
      </g>
      {card.rank === 1 && (
        <text
          x="44"
          y="95"
          textAnchor="middle"
          fill="#af9d75"
          fontSize="5"
          letterSpacing="2"
          fontFamily="Georgia,serif"
        >
          AFTER HOURS
        </text>
      )}
    </svg>
  );
}
