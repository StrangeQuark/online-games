export const WIDTH = 900,
  HEIGHT = 620,
  BALL_RADIUS = 8;
export type Point = { x: number; y: number };
export type Rect = Point & { w: number; h: number };
export type Bumper = Point & { r: number };
export type Hole = {
  name: string;
  note: string;
  par: number;
  start: Point;
  cup: Point;
  walls: Rect[];
  sand: Rect[];
  water: Rect[];
  bumpers: Bumper[];
  portals?: [Point, Point];
  wind?: Point;
};
const hole = (
  name: string,
  note: string,
  par: number,
  start: Point,
  cup: Point,
  options: Partial<Hole> = {},
): Hole => ({
  name,
  note,
  par,
  start,
  cup,
  walls: [],
  sand: [],
  water: [],
  bumpers: [],
  ...options,
});
export const HOLES: Hole[] = [
  hole(
    "First light",
    "A gentle introduction. Find your touch.",
    2,
    { x: 150, y: 310 },
    { x: 750, y: 310 },
    { sand: [{ x: 415, y: 235, w: 115, h: 150 }] },
  ),
  hole(
    "Bank holiday",
    "Sometimes the long way is the lovely way.",
    3,
    { x: 160, y: 310 },
    { x: 740, y: 310 },
    { walls: [{ x: 420, y: 175, w: 38, h: 270 }] },
  ),
  hole(
    "The winding path",
    "Two corners. A little patience.",
    4,
    { x: 150, y: 470 },
    { x: 750, y: 145 },
    {
      walls: [
        { x: 310, y: 245, w: 38, h: 325 },
        { x: 560, y: 50, w: 38, h: 290 },
      ],
    },
  ),
  hole(
    "An island afternoon",
    "Admire the pond. Keep your ball dry.",
    3,
    { x: 155, y: 310 },
    { x: 750, y: 310 },
    {
      water: [{ x: 345, y: 190, w: 210, h: 240 }],
      sand: [{ x: 325, y: 80, w: 260, h: 60 }],
    },
  ),
  hole(
    "A little ricochet",
    "Brass bumpers give a little extra spring.",
    3,
    { x: 145, y: 310 },
    { x: 770, y: 310 },
    {
      bumpers: [
        { x: 385, y: 230, r: 37 },
        { x: 420, y: 405, r: 37 },
        { x: 605, y: 310, r: 44 },
      ],
    },
  ),
  hole(
    "The slow lane",
    "Sand takes the hurry out of a putt.",
    3,
    { x: 150, y: 480 },
    { x: 755, y: 140 },
    {
      sand: [
        { x: 265, y: 175, w: 120, h: 355 },
        { x: 510, y: 80, w: 120, h: 355 },
      ],
      walls: [{ x: 395, y: 275, w: 105, h: 32 }],
    },
  ),
  hole(
    "Across the water",
    "A narrow crossing, or a clever bank.",
    4,
    { x: 130, y: 320 },
    { x: 760, y: 300 },
    {
      water: [
        { x: 360, y: 50, w: 160, h: 215 },
        { x: 360, y: 355, w: 160, h: 215 },
      ],
      bumpers: [
        { x: 640, y: 240, r: 30 },
        { x: 640, y: 380, r: 30 },
      ],
    },
  ),
  hole(
    "Through the looking glass",
    "The paired rings are a shortcut, if you dare.",
    3,
    { x: 140, y: 420 },
    { x: 750, y: 160 },
    {
      walls: [{ x: 420, y: 145, w: 38, h: 425 }],
      portals: [
        { x: 290, y: 200 },
        { x: 610, y: 420 },
      ],
      sand: [{ x: 605, y: 220, w: 170, h: 85 }],
    },
  ),
  hole(
    "The quiet finale",
    "One last little journey around the garden.",
    4,
    { x: 140, y: 485 },
    { x: 690, y: 440 },
    {
      walls: [
        { x: 280, y: 240, w: 34, h: 330 },
        { x: 280, y: 240, w: 320, h: 34 },
        { x: 600, y: 240, w: 34, h: 205 },
      ],
      bumpers: [{ x: 450, y: 135, r: 27 }],
      sand: [{ x: 720, y: 230, w: 90, h: 150 }],
    },
  ),
];
export type Golf = {
  id: string;
  hole: number;
  daily: boolean;
  order: number[];
  ball: Point;
  vx: number;
  vy: number;
  phase: "aiming" | "rolling" | "sunk" | "finished";
  strokes: number;
  results: number[];
  score: number;
  time: number;
  remainder: number;
  rollTime: number;
  lastLie: Point;
  lastStrokes: number;
  mulligans: number;
  waterPenalty: number;
  portalCooldown: number;
  trail: Point[];
  events: ("wall" | "bumper" | "water" | "cup" | "portal")[];
  notice: string;
};
export function dailyOrder(seed: number) {
  const order = HOLES.map((_, i) => i);
  let s = seed >>> 0;
  for (let i = order.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function newGolf(
  daily = false,
  seed = Number(new Date().toISOString().slice(0, 10).replaceAll("-", "")),
): Golf {
  const order = daily ? dailyOrder(seed) : HOLES.map((_, i) => i),
    h = HOLES[order[0]];
  return {
    id: crypto.randomUUID(),
    hole: 0,
    daily,
    order,
    ball: { ...h.start },
    vx: 0,
    vy: 0,
    phase: "aiming",
    strokes: 0,
    results: [],
    score: 0,
    time: 0,
    remainder: 0,
    rollTime: 0,
    lastLie: { ...h.start },
    lastStrokes: 0,
    mulligans: 3,
    waterPenalty: 0,
    portalCooldown: 0,
    trail: [],
    events: [],
    notice: h.note,
  };
}
export function currentHole(g: Golf) {
  return HOLES[g.order[g.hole]];
}
export function putt(g: Golf, angle: number, power: number) {
  if (
    g.phase !== "aiming" ||
    !Number.isFinite(angle) ||
    !Number.isFinite(power)
  )
    return false;
  g.remainder = 0;
  g.lastLie = { ...g.ball };
  g.lastStrokes = g.strokes;
  g.strokes++;
  const speed = 20 + Math.max(0, Math.min(1, power)) * 580;
  g.vx = Math.cos(angle) * speed;
  g.vy = Math.sin(angle) * speed;
  g.phase = "rolling";
  g.rollTime = 0;
  g.trail = [];
  g.notice = "A little hope, a little follow-through.";
  return true;
}
export function mulligan(g: Golf) {
  if (
    g.phase !== "aiming" ||
    !g.strokes ||
    g.mulligans <= 0 ||
    g.strokes <= g.lastStrokes
  )
    return false;
  g.ball = { ...g.lastLie };
  g.vx = 0;
  g.vy = 0;
  g.strokes = g.lastStrokes;
  g.mulligans--;
  g.trail = [];
  g.notice = "A fresh chance. Make it a good one.";
  return true;
}
export function nextHole(g: Golf) {
  if (g.phase !== "sunk") return false;
  if (g.hole >= g.order.length - 1) {
    g.phase = "finished";
    g.notice = "Nine little adventures. Beautifully played.";
    return true;
  }
  g.hole++;
  const h = currentHole(g);
  g.ball = { ...h.start };
  g.lastLie = { ...h.start };
  g.lastStrokes = 0;
  g.strokes = 0;
  g.vx = 0;
  g.vy = 0;
  g.phase = "aiming";
  g.trail = [];
  g.portalCooldown = 0;
  g.notice = h.note;
  return true;
}
export function holeLabel(strokes: number, par: number) {
  return strokes === 1
    ? "Hole in one!"
    : strokes <= par - 2
      ? "Eagle!"
      : strokes === par - 1
        ? "Birdie!"
        : strokes === par
          ? "Right on par."
          : strokes === par + 1
            ? "A little bogey."
            : "In the cup. Lovely.";
}
function inside(p: Point, r: Rect, margin = 0) {
  return (
    p.x > r.x + margin &&
    p.x < r.x + r.w - margin &&
    p.y > r.y + margin &&
    p.y < r.y + r.h - margin
  );
}
function hitRect(g: Golf, r: Rect) {
  const nearX = Math.max(r.x, Math.min(r.x + r.w, g.ball.x)),
    nearY = Math.max(r.y, Math.min(r.y + r.h, g.ball.y));
  let dx = g.ball.x - nearX,
    dy = g.ball.y - nearY,
    dist = Math.hypot(dx, dy);
  if (dist >= BALL_RADIUS) return false;
  if (dist < 0.0001) {
    const edges = [
      { d: Math.abs(g.ball.x - r.x), x: -1, y: 0 },
      { d: Math.abs(g.ball.x - r.x - r.w), x: 1, y: 0 },
      { d: Math.abs(g.ball.y - r.y), x: 0, y: -1 },
      { d: Math.abs(g.ball.y - r.y - r.h), x: 0, y: 1 },
    ].sort((a, b) => a.d - b.d);
    dx = edges[0].x;
    dy = edges[0].y;
    dist = 1;
    g.ball.x =
      dx < 0 ? r.x - BALL_RADIUS : dx > 0 ? r.x + r.w + BALL_RADIUS : g.ball.x;
    g.ball.y =
      dy < 0 ? r.y - BALL_RADIUS : dy > 0 ? r.y + r.h + BALL_RADIUS : g.ball.y;
  } else {
    dx /= dist;
    dy /= dist;
    g.ball.x += dx * (BALL_RADIUS - dist + 0.01);
    g.ball.y += dy * (BALL_RADIUS - dist + 0.01);
  }
  const dot = g.vx * dx + g.vy * dy;
  if (dot < 0) {
    g.vx -= 1.78 * dot * dx;
    g.vy -= 1.78 * dot * dy;
    g.events.push("wall");
  }
  return true;
}
function stepGolf(g: Golf, delta: number) {
  g.events = [];
  if (!Number.isFinite(delta) || delta <= 0) return;
  const dt = Math.min(delta, 0.05);
  g.time += dt;
  g.portalCooldown = Math.max(0, g.portalCooldown - dt);
  if (g.phase !== "rolling") return;
  const h = currentHole(g),
    steps = Math.max(1, Math.ceil((Math.hypot(g.vx, g.vy) * dt) / 5)),
    step = dt / steps;
  g.rollTime += dt;
  for (let s = 0; s < steps && g.phase === "rolling"; s++) {
    const speed = Math.hypot(g.vx, g.vy),
      sand = h.sand.some((r) => inside(g.ball, r)),
      nextSpeed = Math.max(0, speed - (sand ? 390 : 75) * step);
    if (speed) {
      g.vx *= nextSpeed / speed;
      g.vy *= nextSpeed / speed;
    }
    g.ball.x += g.vx * step;
    g.ball.y += g.vy * step;
    if (g.ball.x < 58) {
      g.ball.x = 58;
      g.vx = Math.abs(g.vx) * 0.8;
      g.events.push("wall");
    }
    if (g.ball.x > 842) {
      g.ball.x = 842;
      g.vx = -Math.abs(g.vx) * 0.8;
      g.events.push("wall");
    }
    if (g.ball.y < 58) {
      g.ball.y = 58;
      g.vy = Math.abs(g.vy) * 0.8;
      g.events.push("wall");
    }
    if (g.ball.y > 562) {
      g.ball.y = 562;
      g.vy = -Math.abs(g.vy) * 0.8;
      g.events.push("wall");
    }
    for (const wall of h.walls) hitRect(g, wall);
    for (const b of h.bumpers) {
      let dx = g.ball.x - b.x,
        dy = g.ball.y - b.y,
        d = Math.hypot(dx, dy);
      if (d < b.r + BALL_RADIUS) {
        if (d < 0.001) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const nx = dx / d,
          ny = dy / d;
        g.ball.x = b.x + nx * (b.r + BALL_RADIUS + 0.01);
        g.ball.y = b.y + ny * (b.r + BALL_RADIUS + 0.01);
        const dot = g.vx * nx + g.vy * ny;
        if (dot < 0) {
          g.vx -= 1.94 * dot * nx;
          g.vy -= 1.94 * dot * ny;
          g.events.push("bumper");
        }
      }
    }
    if (h.water.some((r) => inside(g.ball, r, 3))) {
      g.ball = { ...g.lastLie };
      g.vx = 0;
      g.vy = 0;
      g.strokes++;
      g.waterPenalty++;
      g.phase = "aiming";
      g.notice =
        "A little splash. Back to your last spot, with one penalty stroke.";
      g.events.push("water");
      g.trail = [];
      break;
    }
    if (h.portals && g.portalCooldown <= 0) {
      for (let i = 0; i < 2; i++) {
        if (
          Math.hypot(g.ball.x - h.portals[i].x, g.ball.y - h.portals[i].y) < 19
        ) {
          g.ball = { ...h.portals[1 - i] };
          g.portalCooldown = 1;
          g.events.push("portal");
          g.trail = [];
          break;
        }
      }
    }
    const cupDistance = Math.hypot(g.ball.x - h.cup.x, g.ball.y - h.cup.y),
      v = Math.hypot(g.vx, g.vy);
    if (cupDistance < 17 && v < 230) {
      g.ball = { ...h.cup };
      g.vx = 0;
      g.vy = 0;
      g.phase = "sunk";
      g.results[g.hole] = g.strokes;
      g.score +=
        Math.max(100, 1000 + (h.par - g.strokes) * 250) +
        (g.strokes === 1 ? 500 : 0);
      g.notice = holeLabel(g.strokes, h.par);
      g.events.push("cup");
      g.trail = [];
      break;
    }
    if (v < 5 || g.rollTime > 15) {
      g.vx = 0;
      g.vy = 0;
      g.phase = "aiming";
      g.notice = sand
        ? "Soft sand. Give the next one a little more."
        : "Your line. Your moment.";
    }
  }
  if (g.phase === "rolling") {
    g.trail.push({ ...g.ball });
    if (g.trail.length > 24) g.trail.shift();
  }
}
/** Fixed simulation steps keep banks and cup capture identical across refresh rates. */
export function updateGolf(g: Golf, delta: number) {
  const events: Golf["events"] = [];
  if (!Number.isFinite(delta) || delta <= 0) {
    g.events = [];
    return;
  }
  g.remainder = (g.remainder ?? 0) + Math.min(delta, 0.05);
  while (g.remainder + 1e-10 >= 1 / 120) {
    g.remainder -= 1 / 120;
    stepGolf(g, 1 / 120);
    events.push(...g.events);
  }
  g.events = events;
}

export function previewPutt(g: Golf, angle: number, power: number) {
  const copy: Golf = {
    ...g,
    ball: { ...g.ball },
    lastLie: { ...g.lastLie },
    results: [...g.results],
    trail: [],
    events: [],
  };
  if (!putt(copy, angle, power)) return [];
  const points: Point[] = [];
  for (let i = 0; i < 130 && copy.phase === "rolling"; i++) {
    updateGolf(copy, 1 / 60);
    if (i % 5 === 0) points.push({ ...copy.ball });
  }
  return points;
}
