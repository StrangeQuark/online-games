export const SIZE = 7;
export type Kind = 0 | 1 | 2 | 3 | 4 | 5;
export type Special = "row" | "column" | "bloom" | "prism";
export type Gem = { id: number; kind: Kind; special?: Special };
export type Goal = { kind: Kind; target: number; collected: number };
export type Garden = {
  id: string;
  board: (Gem | null)[];
  level: number;
  zen: boolean;
  seed: number;
  rng: number;
  nextId: number;
  score: number;
  moves: number;
  turns: number;
  goals: Goal[];
  won: boolean;
  ended: boolean;
  bestCascade: number;
  shuffles: number;
};
export type Frame = {
  board: (Gem | null)[];
  clear: number[];
  label: string;
  duration: number;
};
export type Turn = { state: Garden; frames: Frame[]; valid: boolean };
export const KINDS = [
  { name: "Coral blossom", color: "#ee9b9d" },
  { name: "Mint clover", color: "#90d3af" },
  { name: "Blue dew", color: "#8abede" },
  { name: "Golden sun", color: "#e4c77b" },
  { name: "Violet bloom", color: "#b6a2da" },
  { name: "Ivory moon", color: "#e0dbad" },
];
export const GARDENS = [
  {
    name: "A pocket of spring",
    moves: 23,
    goals: [
      [0, 12],
      [1, 12],
    ],
  },
  {
    name: "Dew in the morning",
    moves: 24,
    goals: [
      [2, 15],
      [3, 15],
    ],
  },
  {
    name: "The violet hour",
    moves: 25,
    goals: [
      [4, 16],
      [5, 16],
    ],
  },
  {
    name: "Wildflower waltz",
    moves: 30,
    goals: [
      [0, 15],
      [2, 15],
      [4, 15],
    ],
  },
  {
    name: "Sunroom sanctuary",
    moves: 26,
    goals: [
      [1, 19],
      [3, 19],
    ],
  },
  {
    name: "After the rain",
    moves: 31,
    goals: [
      [2, 19],
      [4, 19],
      [5, 14],
    ],
  },
  {
    name: "A moonlit meadow",
    moves: 29,
    goals: [
      [0, 20],
      [1, 20],
      [5, 20],
    ],
  },
  {
    name: "The endless spring",
    moves: 30,
    goals: [
      [0, 15],
      [1, 15],
      [2, 15],
      [3, 15],
      [4, 15],
      [5, 15],
    ],
  },
];
function random(g: Garden) {
  g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0;
  return g.rng / 4294967296;
}
function newGem(g: Garden, kind = Math.floor(random(g) * 6) as Kind): Gem {
  return { id: g.nextId++, kind };
}
export function matches(board: (Gem | null)[]): number[][] {
  const groups: number[][] = [];
  for (let axis = 0; axis < 2; axis++)
    for (let line = 0; line < SIZE; line++) {
      let run: number[] = [];
      for (let at = 0; at <= SIZE; at++) {
        const index = axis === 0 ? line * SIZE + at : at * SIZE + line;
        if (
          at < SIZE &&
          board[index] &&
          (!run.length || board[index]!.kind === board[run[0]]!.kind)
        )
          run.push(index);
        else {
          if (run.length >= 3) groups.push(run);
          run = at < SIZE && board[index] ? [index] : [];
        }
      }
    }
  return groups;
}
export function adjacent(a: number, b: number) {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    a < SIZE * SIZE &&
    b < SIZE * SIZE &&
    Math.abs((a % SIZE) - (b % SIZE)) +
      Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) ===
      1
  );
}
export function legalSwaps(
  board: (Gem | null)[],
): { from: number; to: number; value: number }[] {
  const result: { from: number; to: number; value: number }[] = [];
  for (let from = 0; from < SIZE * SIZE; from++)
    for (const to of [from + 1, from + SIZE]) {
      if (!adjacent(from, to) || !board[from] || !board[to]) continue;
      if (
        board[from]!.special === "prism" ||
        board[to]!.special === "prism" ||
        (board[from]!.special && board[to]!.special)
      ) {
        result.push({ from, to, value: 15 });
        continue;
      }
      const copy = board.slice();
      [copy[from], copy[to]] = [copy[to], copy[from]];
      const found = matches(copy);
      if (found.some((m) => m.includes(from) || m.includes(to)))
        result.push({ from, to, value: new Set(found.flat()).size });
    }
  return result;
}
function fill(g: Garden) {
  g.board = Array(SIZE * SIZE).fill(null);
  for (let i = 0; i < SIZE * SIZE; i++) {
    let kind: Kind;
    do {
      kind = Math.floor(random(g) * 6) as Kind;
    } while (
      (i % SIZE >= 2 &&
        g.board[i - 1]?.kind === kind &&
        g.board[i - 2]?.kind === kind) ||
      (i >= SIZE * 2 &&
        g.board[i - SIZE]?.kind === kind &&
        g.board[i - SIZE * 2]?.kind === kind)
    );
    g.board[i] = newGem(g, kind);
  }
}
export function newGarden(
  level = 0,
  zen = false,
  seed = 44983 + level * 17137 + ([3, 5].includes(level) ? 997 : 0),
): Garden {
  level = Math.max(0, Math.min(GARDENS.length - 1, level));
  const g: Garden = {
    id: crypto.randomUUID(),
    board: [],
    level,
    zen,
    seed,
    rng: seed >>> 0,
    nextId: 1,
    score: 0,
    moves: GARDENS[level].moves,
    turns: 0,
    goals: GARDENS[level].goals.map(([kind, target]) => ({
      kind: kind as Kind,
      target,
      collected: 0,
    })),
    won: false,
    ended: false,
    bestCascade: 0,
    shuffles: 0,
  };
  do {
    fill(g);
  } while (!legalSwaps(g.board).length);
  return g;
}
function shuffle(g: Garden) {
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = g.board.length - 1; i > 0; i--) {
      const j = Math.floor(random(g) * (i + 1));
      [g.board[i], g.board[j]] = [g.board[j], g.board[i]];
    }
    if (!matches(g.board).length && legalSwaps(g.board).length) {
      g.shuffles++;
      return;
    }
  }
  do {
    fill(g);
  } while (!legalSwaps(g.board).length);
  g.shuffles++;
}
export function chooseSwap(g: Garden) {
  const moves = legalSwaps(g.board);
  return (
    moves
      .map((move) => {
        const copy = g.board.slice();
        [copy[move.from], copy[move.to]] = [copy[move.to], copy[move.from]];
        let value = move.value;
        for (const index of new Set(matches(copy).flat()))
          if (
            g.goals.some(
              (goal) =>
                goal.kind === copy[index]?.kind && goal.collected < goal.target,
            )
          )
            value += 3;
        return { ...move, value };
      })
      .sort((a, b) => b.value - a.value)[0] ?? null
  );
}
export function swapGarden(before: Garden, from: number, to: number): Turn {
  if (
    before.ended ||
    !adjacent(from, to) ||
    !before.board[from] ||
    !before.board[to]
  )
    return { state: before, frames: [], valid: false };
  const g: Garden = {
    ...before,
    board: before.board.map((gem) => (gem ? { ...gem } : null)),
    goals: before.goals.map((goal) => ({ ...goal })),
  };
  [g.board[from], g.board[to]] = [g.board[to], g.board[from]];
  const frames: Frame[] = [
    { board: g.board.slice(), clear: [], label: "", duration: 140 },
  ];
  const first = g.board[from]!,
    second = g.board[to]!;
  let forced = new Set<number>();
  if (first.special === "prism" || second.special === "prism") {
    const both = first.special === "prism" && second.special === "prism",
      kind = first.special === "prism" ? second.kind : first.kind;
    g.board.forEach((gem, index) => {
      if (gem && (both || gem.kind === kind)) forced.add(index);
    });
    forced.add(from);
    forced.add(to);
  } else if (first.special && second.special) {
    forced.add(from);
    forced.add(to);
  }
  let groups = matches(g.board);
  if (!forced.size && !groups.some((m) => m.includes(from) || m.includes(to)))
    return {
      state: before,
      frames: [
        ...frames,
        {
          board: before.board.slice(),
          clear: [],
          label: "Swap beside a matching pair.",
          duration: 140,
        },
      ],
      valid: false,
    };
  g.turns++;
  if (!g.zen) g.moves--;
  let cascade = 0;
  while ((groups.length || forced.size) && cascade < 50) {
    cascade++;
    const cleared = new Set([...groups.flat(), ...forced]),
      specials = new Map<number, Special>();
    if (!forced.size) {
      const long = groups.find((m) => m.length >= 5),
        cross = groups.find((a, i) =>
          groups.some(
            (b, j) => i !== j && a.some((index) => b.includes(index)),
          ),
        );
      if (long) {
        const anchor = long.includes(to)
          ? to
          : long.includes(from)
            ? from
            : long[Math.floor(long.length / 2)];
        specials.set(anchor, "prism");
      } else if (cross) {
        const anchor = cross.find(
          (index) => groups.filter((group) => group.includes(index)).length > 1,
        )!;
        specials.set(anchor, "bloom");
      } else
        for (const group of groups.filter((group) => group.length === 4)) {
          const anchor = group.includes(to)
            ? to
            : group.includes(from)
              ? from
              : group[1];
          specials.set(anchor, group[1] - group[0] === 1 ? "row" : "column");
        }
    }
    const expanded = new Set<number>();
    // Existing special flowers bloom when touched by another match or special.
    for (let changed = true; changed;) {
      changed = false;
      for (const index of [...cleared]) {
        if (expanded.has(index)) continue;
        expanded.add(index);
        const special = g.board[index]?.special;
        if (!special) continue;
        if (special === "prism" && forced.size && cascade === 1) continue;
        const row = Math.floor(index / SIZE),
          col = index % SIZE;
        for (let i = 0; i < SIZE * SIZE; i++) {
          const hit =
            special === "row"
              ? Math.floor(i / SIZE) === row
              : special === "column"
                ? i % SIZE === col
                : special === "bloom"
                  ? Math.abs(Math.floor(i / SIZE) - row) <= 1 &&
                    Math.abs((i % SIZE) - col) <= 1
                  : g.board[i]?.kind === g.board[index]?.kind;
          if (hit && !cleared.has(i)) {
            cleared.add(i);
            changed = true;
          }
        }
      }
    }
    for (const index of specials.keys()) cleared.delete(index);
    const label =
      cascade >= 3
        ? `${cascade}× FLOWERFALL`
        : specials.size
          ? "A SPECIAL LITTLE BLOOM"
          : cascade === 2
            ? "LOVELY CASCADE"
            : "";
    frames.push({
      board: g.board.slice(),
      clear: [...cleared],
      label,
      duration: 190,
    });
    for (const index of cleared) {
      const gem = g.board[index];
      if (!gem) continue;
      for (const goal of g.goals) if (goal.kind === gem.kind) goal.collected++;
      g.score += 40 * cascade;
      g.board[index] = null;
    }
    for (const [index, special] of specials) {
      const gem = g.board[index];
      if (gem) g.board[index] = { ...gem, special };
    }
    for (let col = 0; col < SIZE; col++) {
      const remaining: Gem[] = [];
      for (let row = SIZE - 1; row >= 0; row--) {
        const gem = g.board[row * SIZE + col];
        if (gem) remaining.push(gem);
      }
      for (let row = SIZE - 1; row >= 0; row--)
        g.board[row * SIZE + col] = remaining[SIZE - 1 - row] ?? newGem(g);
    }
    frames.push({ board: g.board.slice(), clear: [], label, duration: 210 });
    forced = new Set();
    groups = matches(g.board);
  }
  g.bestCascade = Math.max(g.bestCascade, cascade);
  // End only on a settled board; a pathological chain is reshuffled cleanly.
  if (groups.length) shuffle(g);
  if (!g.zen && g.goals.every((goal) => goal.collected >= goal.target)) {
    g.won = true;
    g.ended = true;
    g.score += g.moves * 100;
  } else if (!g.zen && g.moves <= 0) g.ended = true;
  if (!g.ended && !legalSwaps(g.board).length) {
    shuffle(g);
    frames.push({
      board: g.board.slice(),
      clear: [],
      label: "A FRESH BREEZE · FREE RESHUFFLE",
      duration: 550,
    });
  }
  return { state: g, frames, valid: true };
}
export function gardenStars(g: Garden) {
  return !g.won
    ? 0
    : g.moves >= GARDENS[g.level].moves * 0.45
      ? 3
      : g.moves >= GARDENS[g.level].moves * 0.2
        ? 2
        : 1;
}
