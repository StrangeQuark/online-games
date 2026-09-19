export type Direction = "up" | "right" | "down" | "left";
export const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];
export type Puzzle = {
  title: string;
  note: string;
  width: number;
  height: number;
  walls: number[];
  goals: number[];
  boxes: number[];
  player: number;
  par: number;
};
export type Position = { player: number; boxes: number[] };
export type Delivery = Position & {
  moves: number;
  pushes: number;
  history: (Position & { push: boolean })[];
  won: boolean;
};
const deltas = (width: number) => [-width, 1, width, -1];
export function neighbor(
  p: Puzzle,
  cell: number,
  direction: Direction,
): number {
  const n = cell + deltas(p.width)[DIRECTIONS.indexOf(direction)];
  if (
    n < 0 ||
    n >= p.width * p.height ||
    Math.abs((n % p.width) - (cell % p.width)) +
      Math.abs(Math.floor(n / p.width) - Math.floor(cell / p.width)) !==
      1
  )
    return -1;
  return n;
}
export const solved = (p: Puzzle, boxes: number[]) =>
  boxes.length === p.goals.length && boxes.every((b) => p.goals.includes(b));
export const createDelivery = (p: Puzzle): Delivery => ({
  player: p.player,
  boxes: [...p.boxes],
  moves: 0,
  pushes: 0,
  history: [],
  won: solved(p, p.boxes),
});
export function moveParcel(
  p: Puzzle,
  state: Delivery,
  d: Direction,
): Delivery | null {
  if (state.won) return null;
  const next = neighbor(p, state.player, d);
  if (next < 0 || p.walls.includes(next)) return null;
  const index = state.boxes.indexOf(next),
    boxes = [...state.boxes];
  if (index >= 0) {
    const beyond = neighbor(p, next, d);
    if (beyond < 0 || p.walls.includes(beyond) || boxes.includes(beyond))
      return null;
    boxes[index] = beyond;
  }
  return {
    player: next,
    boxes,
    moves: state.moves + 1,
    pushes: state.pushes + Number(index >= 0),
    history: [
      ...state.history,
      { player: state.player, boxes: state.boxes, push: index >= 0 },
    ].slice(-500),
    won: solved(p, boxes),
  };
}
export function undoParcel(p: Puzzle, state: Delivery): Delivery {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return {
    player: previous.player,
    boxes: [...previous.boxes],
    moves: Math.max(0, state.moves - 1),
    pushes: Math.max(0, state.pushes - Number(previous.push)),
    history: state.history.slice(0, -1),
    won: solved(p, previous.boxes),
  };
}
export function walkPaths(p: Puzzle, position: Position) {
  const blocked = new Set([...p.walls, ...position.boxes]),
    paths = new Map<number, Direction[]>([[position.player, []]]),
    queue = [position.player];
  for (let i = 0; i < queue.length; i++)
    for (const d of DIRECTIONS) {
      const n = neighbor(p, queue[i], d);
      if (n < 0 || blocked.has(n) || paths.has(n)) continue;
      paths.set(n, [...paths.get(queue[i])!, d]);
      queue.push(n);
    }
  return paths;
}
function frozen(p: Puzzle, cell: number) {
  if (p.goals.includes(cell)) return false;
  const blocked = (d: Direction) => {
    const n = neighbor(p, cell, d);
    return n < 0 || p.walls.includes(n);
  };
  return (
    (blocked("up") || blocked("down")) && (blocked("left") || blocked("right"))
  );
}
export function solveParcel(
  p: Puzzle,
  position: Position,
  limit = 100000,
): Direction[] | null {
  if (solved(p, position.boxes)) return [];
  type Node = Position & { parent: number; path: Direction[] };
  const initialPaths = walkPaths(p, position),
    key = (boxes: number[], paths: Map<number, Direction[]>) =>
      `${[...boxes].sort((a, b) => a - b).join(",")}|${Math.min(...paths.keys())}`;
  const queue: Node[] = [{ ...position, parent: -1, path: [] }],
    seen = new Set([key(position.boxes, initialPaths)]);
  for (let head = 0; head < queue.length && head < limit; head++) {
    const node = queue[head],
      paths = walkPaths(p, node);
    for (let bi = 0; bi < node.boxes.length; bi++)
      for (let di = 0; di < 4; di++) {
        const box = node.boxes[bi],
          dest = neighbor(p, box, DIRECTIONS[di]),
          behind = neighbor(p, box, DIRECTIONS[(di + 2) % 4]);
        if (
          dest < 0 ||
          !paths.has(behind) ||
          p.walls.includes(dest) ||
          node.boxes.includes(dest) ||
          frozen(p, dest)
        )
          continue;
        const boxes = [...node.boxes];
        boxes[bi] = dest;
        const next: Node = {
          player: box,
          boxes,
          parent: head,
          path: [...paths.get(behind)!, DIRECTIONS[di]],
        };
        if (solved(p, boxes)) {
          const segments: Direction[][] = [next.path];
          let parent = head;
          while (parent >= 0) {
            segments.push(queue[parent].path);
            parent = queue[parent].parent;
          }
          return segments.reverse().flat();
        }
        const id = key(boxes, walkPaths(p, next));
        if (seen.has(id)) continue;
        seen.add(id);
        queue.push(next);
      }
  }
  return null;
}
export function scoreDelivery(p: Puzzle, g: Delivery, hints: number) {
  return Math.max(
    250,
    1500 -
      Math.max(0, g.pushes - p.par) * 35 -
      hints * 80 -
      Math.max(0, g.moves - 60) * 3,
  );
}
export function reversePuzzle(
  template: Puzzle,
  seed: number,
  steps = 240,
): Puzzle {
  let rng = seed >>> 0;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  let player = template.player,
    boxes = [...template.goals],
    last = -1;
  for (let i = 0; i < steps; i++) {
    const choices: {
      player: number;
      boxes: number[];
      pull: boolean;
      direction: number;
    }[] = [];
    for (let di = 0; di < 4; di++) {
      const dest = neighbor(template, player, DIRECTIONS[di]);
      if (dest < 0 || template.walls.includes(dest) || boxes.includes(dest))
        continue;
      choices.push({ player: dest, boxes, pull: false, direction: di });
      const behind = neighbor(template, player, DIRECTIONS[(di + 2) % 4]),
        index = boxes.indexOf(behind);
      if (index >= 0) {
        const moved = [...boxes];
        moved[index] = player;
        choices.push({ player: dest, boxes: moved, pull: true, direction: di });
      }
    }
    if (!choices.length) break;
    const pulls = choices.filter(
        (c) => c.pull && c.direction !== (last + 2) % 4,
      ),
      pool = pulls.length && random() < 0.85 ? pulls : choices;
    const chosen = pool[Math.floor(random() * pool.length)];
    player = chosen.player;
    boxes = chosen.boxes;
    last = chosen.direction;
  }
  return { ...template, player, boxes, par: 0 };
}
export function dailyParcel(
  templates: Puzzle[],
  date = new Date().toISOString().slice(0, 10),
): Puzzle {
  const seed = [...date].reduce(
      (h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0,
      17,
    ),
    pool = templates.filter((p) => p.par >= 6),
    base = (pool.length ? pool : templates)[
      seed % (pool.length || templates.length)
    ];
  for (let attempt = 0; attempt < 12; attempt++) {
    const p = reversePuzzle(base, seed + attempt * 997, 350);
    if (solved(p, p.boxes)) continue;
    const solution = solveParcel(p, p, 20000);
    if (!solution) continue;
    let state = createDelivery(p);
    for (const d of solution) state = moveParcel(p, state, d)!;
    if (state.pushes >= 5)
      return {
        ...p,
        title: "The daily delivery",
        note: `One route for everyone · ${date}`,
        par: state.pushes,
      };
  }
  return {
    ...base,
    title: "The daily delivery",
    note: `One route for everyone · ${date}`,
  };
}
