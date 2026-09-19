import {
  ENEMIES,
  LINK_RADIUS,
  MINE_RADIUS,
  STRUCTURES,
  WORLD_H,
  WORLD_W,
  dist,
} from "./catalog";
import type { Point, StructureKind } from "./catalog";
import { placementError, stats } from "./engine";
import type { Asteroid, Enemy, Expedition, Structure } from "./engine";

export type StarfallView = {
  width: number;
  height: number;
  camera: { x: number; y: number; zoom: number };
  selected: number | null;
  blueprint: StructureKind | null;
  pointer: Point & { inside: boolean };
  settings: {
    energyLines: boolean;
    movingStars: boolean;
    colorBlind: boolean;
    smooth: boolean;
    fastLasers?: boolean;
  };
  hover: number | null;
};

const TAU = Math.PI * 2;
const clamp = (n: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, n));
const random = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return n - Math.floor(n);
};
const stars = Array.from({ length: 300 }, (_, i) => ({
  x: random(i + 1),
  y: random(i + 370),
  size: 0.45 + random(i + 800) * 1.05,
  alpha: 0.18 + random(i + 1000) * 0.56,
  warm: i % 7 === 0,
  phase: random(i + 2010) * TAU,
}));
const skyCache = new WeakMap<
  CanvasRenderingContext2D,
  { width: number; height: number; canvas: HTMLCanvasElement }
>();
const rockCache = new Map<
  string,
  { stone: HTMLCanvasElement; ore: HTMLCanvasElement; extent: number }
>();
const unitCache = new Map<
  string,
  { canvas: HTMLCanvasElement; extent: number }
>();
type StationSprite = Pick<
  Structure,
  | "id"
  | "kind"
  | "level"
  | "angle"
  | "energy"
  | "capacity"
  | "connected"
  | "working"
>;

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, TAU);
}
function polygon(
  ctx: CanvasRenderingContext2D,
  radius: number,
  sides = 6,
  angle = 0,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = angle + (i * TAU) / sides;
    if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
    else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
}
function path(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
function line(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color = "#a6bbc9",
  size = 10,
) {
  ctx.font = `${size}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function sky(ctx: CanvasRenderingContext2D, view: StarfallView, now: number) {
  const { width, height, camera, settings } = view;
  let cache = skyCache.get(ctx);
  if (!cache || cache.width !== width || cache.height !== height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#07111d";
    c.fillRect(0, 0, width, height);
    const clouds: [number, number, number, string][] = [
      [0.33, 0.35, 0.68, "#193b422a"],
      [0.7, 0.61, 0.55, "#382e5426"],
      [0.91, 0.02, 0.38, "#56636d23"],
      [0.12, 0.95, 0.48, "#69523517"],
    ];
    for (const [x, y, radius, color] of clouds) {
      const g = c.createRadialGradient(
        width * x,
        height * y,
        0,
        width * x,
        height * y,
        Math.max(width, height) * radius,
      );
      g.addColorStop(0, color);
      g.addColorStop(1, "#07111d00");
      c.fillStyle = g;
      c.fillRect(0, 0, width, height);
    }
    // Long, faint dust filaments keep the field atmospheric without competing
    // with the much brighter resource lines and ships.
    for (let i = 0; i < 22; i++) {
      c.strokeStyle = i % 2 ? "#abb1c002" : "#78aea503";
      c.lineWidth = 7 + random(i + 850) * 26;
      c.beginPath();
      c.moveTo(-width * 0.1, height * (0.2 + i * 0.031));
      c.bezierCurveTo(
        width * 0.32,
        height * (0.9 - i * 0.017),
        width * 0.63,
        height * (0.1 + i * 0.015),
        width * 1.1,
        height * (0.45 + i * 0.024),
      );
      c.stroke();
    }
    const vignette = c.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.2,
      width / 2,
      height / 2,
      Math.hypot(width, height) * 0.62,
    );
    vignette.addColorStop(0, "#00000000");
    vignette.addColorStop(1, "#01060b88");
    c.fillStyle = vignette;
    c.fillRect(0, 0, width, height);
    cache = { width, height, canvas };
    skyCache.set(ctx, cache);
  }
  ctx.drawImage(cache.canvas, 0, 0, width, height);
  const phase = settings.movingStars && settings.smooth ? now * 0.0002 : 0;
  const parallaxX = settings.movingStars ? camera.x * 0.045 : 0;
  const parallaxY = settings.movingStars ? camera.y * 0.045 : 0;
  for (const star of stars) {
    const x = (((star.x * width - parallaxX) % width) + width) % width;
    const y = (((star.y * height - parallaxY) % height) + height) % height;
    ctx.globalAlpha =
      star.alpha *
      (settings.movingStars ? 0.82 + Math.sin(phase + star.phase) * 0.18 : 1);
    ctx.fillStyle = star.warm ? "#ebd4ad" : "#bbd4e4";
    ctx.fillRect(x, y, star.size, star.size);
    if (star.size > 1.45) {
      ctx.globalAlpha *= 0.28;
      ctx.fillRect(x - 2, y + 0.5, 5, 0.6);
      ctx.fillRect(x + 0.5, y - 2, 0.6, 5);
    }
  }
  ctx.globalAlpha = 1;
}

function asteroidSprite(asteroid: Asteroid) {
  const { seed, radius } = asteroid;
  const key = `${seed}:${radius}`;
  const cached = rockCache.get(key);
  if (cached) return cached;
  const extent = Math.ceil(radius + 7),
    stone = document.createElement("canvas"),
    ore = document.createElement("canvas");
  for (const canvas of [stone, ore]) {
    canvas.width = extent * 4;
    canvas.height = extent * 4;
  }
  const c = stone.getContext("2d")!,
    g = ore.getContext("2d")!;
  for (const context of [c, g]) {
    context.scale(2, 2);
    context.translate(extent, extent);
  }
  const vertices = Array.from({ length: 13 }, (_, i) => {
    const angle = (i * TAU) / 13,
      r = radius * (0.79 + random(seed + i * 11) * 0.21);
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
  c.fillStyle = "#02081166";
  c.save();
  c.translate(3, 4);
  path(c, vertices);
  c.fill();
  c.restore();
  const mineral = c.createLinearGradient(-radius, -radius, radius, radius);
  mineral.addColorStop(0, "#99a2a2");
  mineral.addColorStop(0.35, "#586770");
  mineral.addColorStop(0.78, "#2c3948");
  mineral.addColorStop(1, "#152337");
  path(c, vertices);
  c.fillStyle = mineral;
  c.fill();
  c.strokeStyle = "#bac4ba66";
  c.lineWidth = 0.7;
  c.stroke();
  c.save();
  c.clip();
  for (let i = 0; i < 13; i++) {
    const center = [
      (random(seed + 39) - 0.5) * radius * 0.45,
      (random(seed + 57) - 0.5) * radius * 0.45,
    ];
    path(c, [center, vertices[i], vertices[(i + 1) % vertices.length]]);
    c.fillStyle = ["#d9d4b51b", "#c9d6d00b", "#02101d38", "#13283927"][i % 4];
    c.fill();
  }
  for (let i = 0; i < 8; i++) {
    const x = (random(seed + i * 29 + 20) - 0.5) * radius * 1.55;
    const y = (random(seed + i * 19 + 39) - 0.5) * radius * 1.5;
    const r = radius * (0.07 + random(seed + i + 8) * 0.13);
    c.fillStyle = "#111e2e70";
    circle(c, x, y, r);
    c.fill();
    c.strokeStyle = "#c0c8b12a";
    c.lineWidth = 0.75;
    c.beginPath();
    c.arc(x, y, r, 0.2, Math.PI * 1.1);
    c.stroke();
  }
  c.restore();
  for (let i = 0; i < 7; i++) {
    const x = (random(seed + i * 43 + 12) - 0.5) * radius * 1.25;
    const y = (random(seed + i * 23 + 23) - 0.5) * radius * 1.2;
    const r = radius * (0.08 + random(seed + i * 41) * 0.12);
    g.save();
    g.translate(x, y);
    g.rotate(random(seed + i + 12) * TAU);
    path(g, [
      [-r, 0],
      [-r * 0.1, -r * 1.4],
      [r * 0.8, -r * 0.5],
      [r, r * 0.7],
      [-r * 0.1, r],
    ]);
    g.fillStyle = "#9d7e44";
    g.fill();
    g.strokeStyle = "#d8bb6c";
    g.lineWidth = 0.7;
    g.stroke();
    path(g, [
      [-r * 0.1, -r * 1.4],
      [r * 0.25, 0],
      [-r, 0],
    ]);
    g.fillStyle = "#f3d594";
    g.fill();
    path(g, [
      [r * 0.25, 0],
      [r, r * 0.7],
      [-r * 0.1, r],
    ]);
    g.fillStyle = "#c59a50";
    g.fill();
    g.restore();
  }
  const result = { stone, ore, extent };
  if (rockCache.size > 160) rockCache.delete(rockCache.keys().next().value!);
  rockCache.set(key, result);
  return result;
}

function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: Asteroid,
  time: number,
  zoom: number,
  highlighted: boolean,
) {
  const fill = clamp(asteroid.ore / Math.max(1, asteroid.initialOre));
  const { stone, ore, extent } = asteroidSprite(asteroid);
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.seed * 0.03 + time * 0.003);
  const scale = 0.62 + fill * 0.38;
  ctx.scale(scale, scale);
  ctx.globalAlpha = fill > 0 ? 1 : 0.42;
  ctx.drawImage(stone, -extent, -extent, extent * 2, extent * 2);
  if (fill > 0) {
    ctx.globalAlpha = Math.sqrt(fill);
    ctx.drawImage(ore, -extent, -extent, extent * 2, extent * 2);
  }
  ctx.restore();
  if (highlighted) {
    const r = asteroid.radius + 7;
    ctx.strokeStyle = fill > 0 ? "#e3c984bb" : "#788c9c";
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([3 / zoom, 4 / zoom]);
    circle(ctx, asteroid.x, asteroid.y, r);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    text(
      ctx,
      fill > 0
        ? `${Math.ceil(asteroid.ore).toLocaleString()} minerals`
        : "Exhausted",
      asteroid.x,
      asteroid.y + r + 14 / zoom,
      "#e4d2a3",
      10 / zoom,
    );
  }
}

function stationBody(
  ctx: CanvasRenderingContext2D,
  n: StationSprite,
  time: number,
  colorBlind: boolean,
) {
  const spec = STRUCTURES[n.kind],
    r = spec.radius;
  const accent =
    colorBlind && ["miner", "repair", "pulser"].includes(n.kind)
      ? "#78c8f0"
      : spec.color;
  const active = n.connected || n.energy > 0 || n.kind === "missile";
  const fill = n.capacity > 0 ? clamp(n.energy / n.capacity) : 1;
  ctx.fillStyle = "#030a11b0";
  circle(ctx, 1.5, 2.5, r + 2);
  ctx.fill();
  ctx.fillStyle = "#122331";
  ctx.strokeStyle = active ? "#7d929f" : "#42525f";
  ctx.lineWidth = 1;
  if (n.kind === "relay") {
    ctx.strokeStyle = "#5d83a1";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3 - Math.PI / 2;
      line(
        ctx,
        { x: Math.cos(a) * 3, y: Math.sin(a) * 3 },
        { x: Math.cos(a) * 10, y: Math.sin(a) * 10 },
      );
      ctx.fillStyle = "#97bacd";
      circle(ctx, Math.cos(a) * 10, Math.sin(a) * 10, 1.4);
      ctx.fill();
    }
    polygon(ctx, 4.8, 6, Math.PI / 6);
    ctx.fillStyle = "#213b51";
    ctx.fill();
    ctx.strokeStyle = "#9ec7df";
    ctx.stroke();
    circle(ctx, 0, 0, 2);
    ctx.fillStyle = active ? "#c7ecff" : "#506174";
    ctx.fill();
    return;
  }
  polygon(ctx, r, n.kind === "battery" ? 8 : 6, Math.PI / 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#b4cbd22d";
  ctx.lineWidth = 0.6;
  polygon(ctx, r - 3, 6, Math.PI / 6);
  ctx.stroke();
  if (n.kind === "solar") {
    ctx.save();
    ctx.rotate(time * 0.035 + n.id * 0.63);
    const panels = n.level === 3 ? 6 : 4;
    for (let i = 0; i < panels; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / panels);
      ctx.fillStyle = "#384e60";
      ctx.fillRect(4, -1.2, 15, 2.4);
      path(ctx, [
        [9, -3],
        [18, -7],
        [23, -4.5],
        [23, 5.5],
        [10, 5],
      ]);
      ctx.fillStyle = n.level > 1 ? "#668caa" : "#446783";
      ctx.fill();
      ctx.strokeStyle = "#a7c4cf";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.strokeStyle = "#173e5988";
      for (let j = 0; j < 3; j++)
        line(ctx, { x: 12 + j * 3.5, y: -3.8 }, { x: 12 + j * 3.5, y: 4.5 });
      line(ctx, { x: 10, y: 0 }, { x: 22, y: 0 });
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = "#d4c18f";
    polygon(ctx, 7.5, 6, time * 0.035);
    ctx.fill();
    ctx.fillStyle = "#fff0b6";
    circle(ctx, -1, -1, 2.8);
    ctx.fill();
  } else if (n.kind === "battery") {
    for (const x of [-8, 0, 8]) {
      ctx.fillStyle = "#050e1a";
      ctx.fillRect(x - 2.7, -11, 5.4, 22);
      ctx.fillStyle = "#566685";
      ctx.fillRect(x - 3.5, -13, 7, 2);
      ctx.fillRect(x - 3.5, 11, 7, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(x - 1.8, 10 - fill * 20, 3.6, fill * 20);
      ctx.fillStyle = "#eeeffe66";
      ctx.fillRect(x - 1.8, -10, 1, 20);
    }
    if (n.level > 1) {
      ctx.strokeStyle = "#b4b8f4";
      ctx.lineWidth = 1;
      circle(ctx, 0, 0, 21);
      ctx.stroke();
    }
  } else if (n.kind === "repair") {
    ctx.save();
    ctx.rotate(time * 0.04);
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4 + Math.PI / 4;
      const x = Math.cos(a) * 12,
        y = Math.sin(a) * 12;
      ctx.strokeStyle = "#718e94";
      line(ctx, { x: 0, y: 0 }, { x, y });
      ctx.fillStyle = "#193b43";
      circle(ctx, x, y, 4);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.stroke();
      circle(ctx, x, y, 1.4);
      ctx.fillStyle = "#bbf1d9";
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#98d7bc";
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillRect(-6, -2, 12, 4);
    if (n.level > 1) {
      ctx.strokeStyle = accent;
      circle(ctx, 0, 0, 8.5);
      ctx.stroke();
    }
  } else {
    ctx.save();
    ctx.rotate(n.angle);
    if (n.kind === "miner") {
      ctx.fillStyle = "#3f575d";
      ctx.fillRect(-10, -8, 14, 16);
      ctx.strokeStyle = "#c4be8a";
      ctx.strokeRect(-10, -8, 14, 16);
      ctx.fillStyle = "#a2b29c";
      path(ctx, [
        [2, -5],
        [15, -4],
        [18, 0],
        [15, 4],
        [2, 5],
      ]);
      ctx.fill();
      ctx.fillStyle = "#18393d";
      ctx.fillRect(5, -2, 9, 4);
      ctx.fillStyle = accent;
      circle(ctx, 15, 0, n.working ? 3 : 2);
      ctx.fill();
      ctx.fillStyle = "#6c877b";
      ctx.fillRect(-8, -12, n.level > 1 ? 17 : 10, 3);
      ctx.fillRect(-8, 9, n.level > 1 ? 17 : 10, 3);
    } else if (n.kind === "laser") {
      ctx.fillStyle = "#65737d";
      polygon(ctx, 8, 4, Math.PI / 4);
      ctx.fill();
      ctx.fillStyle = "#9da4a5";
      ctx.fillRect(1, -3, 17, 6);
      ctx.fillStyle = "#2b4556";
      ctx.fillRect(5, -1, 11, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(16, -3, 3, 6);
      ctx.fillStyle = "#edc4b2";
      circle(ctx, -2, 0, 2.7);
      ctx.fill();
    } else if (n.kind === "pulser") {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      circle(ctx, 0, 0, 12);
      ctx.stroke();
      ctx.fillStyle = "#5c818d";
      polygon(ctx, 9, 6);
      ctx.fill();
      for (const y of [-5, 5]) {
        ctx.fillStyle = "#aac9c9";
        ctx.fillRect(1, y - 2, 18, 4);
        ctx.fillStyle = "#1b4353";
        ctx.fillRect(6, y - 1, 9, 2);
        ctx.fillStyle = accent;
        ctx.fillRect(17, y - 2, 3, 4);
      }
      ctx.fillStyle = "#d3ffef";
      circle(ctx, -1, 0, 3);
      ctx.fill();
    } else if (n.kind === "thel") {
      ctx.fillStyle = "#67728b";
      path(ctx, [
        [-15, -9],
        [5, -8],
        [16, -3],
        [16, 3],
        [5, 8],
        [-15, 9],
      ]);
      ctx.fill();
      ctx.strokeStyle = "#d4c1e0";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = "#afc2d0";
      ctx.fillRect(1, -2.5, 24, 5);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      for (const x of [-7, -1, 5, 11]) {
        ctx.beginPath();
        ctx.moveTo(x, -6);
        ctx.lineTo(x, 6);
        ctx.stroke();
      }
      ctx.fillStyle = "#e5c8f4";
      ctx.fillRect(22, -3.5, 4, 7);
      ctx.fillStyle = "#ead8f3";
      circle(ctx, -11, 0, 3.5);
      ctx.fill();
    } else if (n.kind === "missile") {
      ctx.fillStyle = "#6f7d88";
      polygon(ctx, 14, 6);
      ctx.fill();
      const slots =
        n.level === 3 ? [-10, -5, 0, 5, 10] : n.level === 2 ? [-6, 6] : [0];
      for (const y of slots) {
        ctx.fillStyle = "#bd956d";
        ctx.fillRect(-8, y - 2.1, 23, 4.2);
        ctx.fillStyle = "#1a2a36";
        ctx.fillRect(-4, y - 1, 15, 2);
        ctx.fillStyle = accent;
        path(ctx, [
          [13, y - 2],
          [19, y],
          [13, y + 2],
        ]);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (n.level > 1) {
    ctx.fillStyle = accent;
    for (let i = 0; i < n.level; i++)
      ctx.fillRect((i - (n.level - 1) / 2) * 4 - 1, r - 3, 2, 2);
  }
}

// Distant units share cached artwork. Full vector detail is used at closer zooms;
// a busy whole-sector view avoids redrawing thousands of tiny panel edges.
function cachedUnit(
  ctx: CanvasRenderingContext2D,
  key: string,
  extent: number,
  rotation: number,
  paint: (c: CanvasRenderingContext2D) => void,
) {
  let cached = unitCache.get(key);
  if (!cached) {
    const canvas = document.createElement("canvas");
    canvas.width = extent * 4;
    canvas.height = extent * 4;
    const c = canvas.getContext("2d")!;
    c.scale(2, 2);
    c.translate(extent, extent);
    paint(c);
    cached = { canvas, extent };
    unitCache.set(key, cached);
    if (unitCache.size > 128) unitCache.delete(unitCache.keys().next().value!);
  }
  ctx.save();
  ctx.rotate(rotation);
  ctx.drawImage(
    cached.canvas,
    -cached.extent,
    -cached.extent,
    cached.extent * 2,
    cached.extent * 2,
  );
  ctx.restore();
}

function enemyBody(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  time: number,
  colorBlind: boolean,
) {
  const spec = ENEMIES[enemy.kind],
    r = spec.radius;
  const accent =
    enemy.hit > 0 ? "#fff0d7" : colorBlind ? "#f1ae73" : spec.color;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);
  ctx.fillStyle = "#1b2634";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  if (enemy.kind === "ringer") {
    ctx.save();
    ctx.rotate(-enemy.angle + time * 0.23);
    ctx.strokeStyle = enemy.hit > 0 ? "#fff0b6" : "#d3bf615b";
    ctx.lineWidth = 2.3;
    circle(ctx, 0, 0, r + 5 + (enemy.hit > 0 ? enemy.hit * 7 : 0));
    ctx.stroke();
    ctx.fillStyle = "#d8c96a07";
    circle(ctx, 0, 0, r + 4);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r, (i * TAU) / 4, (i * TAU) / 4 + 1.1);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r - 5, (i * TAU) / 4, (i * TAU) / 4 + 1.1);
      ctx.strokeStyle = "#524f3a";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#ceb86e";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = (i * TAU) / 3;
      line(
        ctx,
        { x: Math.cos(a) * 9, y: Math.sin(a) * 9 },
        { x: Math.cos(a) * 20, y: Math.sin(a) * 20 },
      );
    }
    polygon(ctx, 10, 6);
    ctx.fillStyle = "#474c42";
    ctx.fill();
    ctx.stroke();
    circle(ctx, 0, 0, 4);
    ctx.fillStyle = accent;
    ctx.fill();
  } else if (enemy.kind === "mothership") {
    path(ctx, [
      [r, 0],
      [r * 0.62, -13],
      [r * 0.1, -16],
      [-r * 0.35, -36],
      [-r * 0.78, -31],
      [-r * 0.72, -13],
      [-r, -8],
      [-r, 8],
      [-r * 0.72, 13],
      [-r * 0.78, 31],
      [-r * 0.35, 36],
      [r * 0.1, 16],
      [r * 0.62, 13],
    ]);
    ctx.fillStyle = "#3b3555";
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (const side of [-1, 1]) {
      path(ctx, [
        [-29, side * 28],
        [-16, side * 30],
        [9, side * 8],
        [-14, side * 12],
      ]);
      ctx.fillStyle = "#736986";
      ctx.fill();
      ctx.strokeStyle = "#bba1d075";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = "#111c32";
      ctx.fillRect(-18, side < 0 ? -16 : 9, 15, 7);
      ctx.fillStyle = "#c1a2e6";
      ctx.fillRect(-17, side < 0 ? -13 : 11, 11, 2);
      ctx.fillStyle = "#d1b8ff";
      ctx.fillRect(-37, side * 7 - 2, 3, 4);
    }
    ctx.fillStyle = "#8e7e9f";
    path(ctx, [
      [-27, -6],
      [24, -7],
      [39, 0],
      [24, 7],
      [-27, 6],
    ]);
    ctx.fill();
    ctx.fillStyle = "#30263f";
    ctx.fillRect(-18, -3, 37, 6);
    ctx.fillStyle = "#e5c3fb";
    path(ctx, [
      [16, -4],
      [31, 0],
      [16, 4],
    ]);
    ctx.fill();
    ctx.fillStyle = "#d7b1f230";
    path(ctx, [
      [-44, -6],
      [-59 - Math.sin(time * 17) * 3, 0],
      [-44, 6],
    ]);
    ctx.fill();
    ctx.strokeStyle = "#b498cd";
    ctx.lineWidth = 0.8;
    for (const x of [-19, -7, 5]) {
      ctx.beginPath();
      ctx.moveTo(x, -7);
      ctx.lineTo(x - 4, 7);
      ctx.stroke();
    }
  } else if (enemy.kind === "missileShip") {
    path(ctx, [
      [23, 0],
      [10, -7],
      [-17, -9],
      [-23, 0],
      [-17, 9],
      [10, 7],
    ]);
    ctx.fillStyle = "#3b4840";
    ctx.fill();
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#6e8260";
      ctx.fillRect(-13, side < 0 ? -16 : 8, 23, 8);
      ctx.strokeStyle = accent;
      ctx.strokeRect(-13, side < 0 ? -16 : 8, 23, 8);
      ctx.fillStyle = "#1a2925";
      ctx.fillRect(-9, side < 0 ? -14 : 10, 12, 4);
      ctx.fillStyle = "#e1d494";
      path(ctx, [
        [8, side * 12 - 2],
        [15, side * 12],
        [8, side * 12 + 2],
      ]);
      ctx.fill();
    }
    ctx.fillStyle = "#cbd59d";
    path(ctx, [
      [5, -3],
      [15, 0],
      [5, 3],
    ]);
    ctx.fill();
    ctx.fillStyle = "#b7d87565";
    ctx.fillRect(-24, -3, 4, 6);
  } else if (enemy.kind === "suicide") {
    ctx.save();
    ctx.rotate(time * 1.5 + enemy.id);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 3);
      path(ctx, [
        [3, -4],
        [14, -3],
        [10, 4],
        [3, 4],
      ]);
      ctx.fillStyle = "#a46d46";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = "#553b2f";
    polygon(ctx, 8, 6);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.fillStyle = Math.sin(time * 12 + enemy.id) > 0 ? "#ffe5b1" : accent;
    polygon(ctx, 4, 3);
    ctx.fill();
  } else {
    const small = enemy.kind === "swarmer",
      purple = enemy.kind === "attackFighter";
    path(ctx, [
      [r * 1.2, 0],
      [-r * 0.85, -r * 0.75],
      [-r * 0.4, 0],
      [-r * 0.85, r * 0.75],
    ]);
    ctx.fillStyle = small ? "#77848d" : purple ? "#5a496f" : "#76454b";
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = small ? 0.7 : 1;
    ctx.stroke();
    ctx.fillStyle = "#e6dce8";
    path(ctx, [
      [r * 0.7, 0],
      [-r * 0.2, -r * 0.22],
      [-r * 0.2, r * 0.22],
    ]);
    ctx.fill();
    ctx.fillStyle = small ? "#9dacbd70" : "#e8a88170";
    path(ctx, [
      [-r * 0.6, -2],
      [-r * (1.25 + Math.sin(time * 20 + enemy.id) * 0.12), 0],
      [-r * 0.6, 2],
    ]);
    ctx.fill();
  }
  ctx.restore();
}

function selectionRange(
  ctx: CanvasRenderingContext2D,
  p: Point,
  radius: number,
  color: string,
  zoom: number,
) {
  if (radius <= 0) return;
  circle(ctx, p.x, p.y, radius);
  ctx.fillStyle = color + "09";
  ctx.fill();
  ctx.strokeStyle = color + "70";
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 5 / zoom]);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const x = p.x + Math.cos(angle) * radius,
      y = p.y + Math.sin(angle) * radius;
    ctx.strokeStyle = color + "9c";
    line(
      ctx,
      {
        x: x - (Math.sin(angle) * 3) / zoom,
        y: y + (Math.cos(angle) * 3) / zoom,
      },
      {
        x: x + (Math.sin(angle) * 3) / zoom,
        y: y - (Math.cos(angle) * 3) / zoom,
      },
    );
  }
}

function healthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  fill: number,
  zoom: number,
) {
  ctx.fillStyle = "#06101deb";
  ctx.fillRect(x - width / 2 - 1, y - 1, width + 2, 4 / zoom + 2);
  ctx.fillStyle = fill < 0.3 ? "#ec9b72" : "#c4d6b5";
  ctx.fillRect(x - width / 2, y, width * clamp(fill), 3 / zoom);
}

function drawStation(
  ctx: CanvasRenderingContext2D,
  node: Structure,
  time: number,
  view: StarfallView,
) {
  const selected = view.selected === node.id,
    hover = view.hover === node.id;
  const r = STRUCTURES[node.kind].radius,
    zoom = view.camera.zoom;
  ctx.save();
  ctx.translate(node.x, node.y);
  const incomplete = node.progress < 1;
  if (incomplete) ctx.globalAlpha = 0.16 + node.progress * 0.55;
  else if (!node.connected && node.energy <= 0 && node.kind !== "missile")
    ctx.globalAlpha = 0.64;
  if (zoom < 0.85) {
    const charge =
      node.kind === "battery"
        ? Math.round(clamp(node.energy / Math.max(1, node.capacity)) * 10) / 10
        : node.energy > 0
          ? 1
          : 0;
    const key = `station:${node.kind}:${node.level}:${node.connected}:${charge}:${node.working}:${view.settings.colorBlind}`;
    const rotation =
      node.kind === "solar"
        ? time * 0.035 + node.id * 0.63
        : node.kind === "repair"
          ? time * 0.04
          : ["relay", "battery"].includes(node.kind)
            ? 0
            : node.angle;
    cachedUnit(ctx, key, r + 10, rotation, (c) =>
      stationBody(
        c,
        { ...node, id: 0, angle: 0, capacity: 1, energy: charge },
        0,
        view.settings.colorBlind,
      ),
    );
  } else stationBody(ctx, node, time, view.settings.colorBlind);
  ctx.globalAlpha = 1;
  if (selected || hover) {
    ctx.strokeStyle = selected ? "#efe0b4" : "#a6bdcf";
    ctx.lineWidth = (selected ? 1.5 : 1) / zoom;
    const radius = r + 7;
    for (let i = 0; i < 4; i++) {
      const angle = (i * TAU) / 4 + Math.PI / 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius, angle - 0.22, angle + 0.22);
      ctx.stroke();
    }
  }
  if (incomplete || node.upgrading) {
    const progress = node.upgrading?.progress ?? node.progress;
    const radius = r + (selected ? 11 : 6);
    ctx.strokeStyle = "#587b963b";
    ctx.lineWidth = 2 / zoom;
    circle(ctx, 0, 0, radius);
    ctx.stroke();
    ctx.strokeStyle = "#b5dce9";
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(progress));
    ctx.stroke();
    if (node.connected) {
      ctx.fillStyle = "#ebf6ff";
      circle(
        ctx,
        Math.cos(-Math.PI / 2 + progress * TAU) * radius,
        Math.sin(-Math.PI / 2 + progress * TAU) * radius,
        2 / zoom,
      );
      ctx.fill();
    }
  } else if (
    node.capacity > 0 &&
    (selected || hover || node.kind === "battery")
  ) {
    ctx.strokeStyle = "#264359";
    ctx.lineWidth = 1.7 / zoom;
    circle(ctx, 0, 0, r + 3);
    ctx.stroke();
    ctx.strokeStyle = "#8bbbdc";
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      r + 3,
      -Math.PI / 2,
      -Math.PI / 2 + TAU * clamp(node.energy / node.capacity),
    );
    ctx.stroke();
  }
  if (!node.connected && node.kind !== "missile") {
    ctx.translate(0, -r - 8 / zoom);
    ctx.scale(1 / zoom, 1 / zoom);
    ctx.fillStyle = "#c39770";
    polygon(ctx, 4.5, 4);
    ctx.fill();
    ctx.fillStyle = "#14212c";
    ctx.fillRect(-0.65, -2.5, 1.3, 3);
    ctx.fillRect(-0.65, 1.3, 1.3, 1.2);
  } else if (node.depleted) {
    ctx.strokeStyle = "#94a3af";
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(-4 / zoom, -r - 7 / zoom);
    ctx.lineTo(4 / zoom, -r - 7 / zoom);
    ctx.stroke();
  }
  ctx.restore();
  if (node.hp < node.maxHp || selected || hover)
    healthBar(
      ctx,
      node.x,
      node.y + r + 9 / zoom,
      Math.max(23, r * 1.5),
      node.hp / node.maxHp,
      zoom,
    );
}

type MissileTrail = { points: Point[]; time: number };
const trailCache = new WeakMap<
  CanvasRenderingContext2D,
  { tag: string; missiles: Map<number, MissileTrail> }
>();

function combat(
  ctx: CanvasRenderingContext2D,
  game: Expedition,
  view: StarfallView,
  nodes: Map<number, Structure>,
) {
  const zoom = view.camera.zoom;
  const motionTime = view.settings.smooth ? game.time : 0;
  let cache = trailCache.get(ctx);
  if (!cache || cache.tag !== game.tag) {
    cache = { tag: game.tag, missiles: new Map() };
    trailCache.set(ctx, cache);
  }
  const live = new Set(game.projectiles.map((p) => p.id));
  for (const id of cache.missiles.keys())
    if (!live.has(id)) cache.missiles.delete(id);
  for (const missile of game.projectiles) {
    let trail = cache.missiles.get(missile.id);
    if (!trail) {
      trail = { points: [], time: -1 };
      cache.missiles.set(missile.id, trail);
    }
    if (trail.time !== game.time) {
      trail.points.push({ x: missile.x, y: missile.y });
      if (trail.points.length > 13) trail.points.shift();
      trail.time = game.time;
    }
    const color = missile.enemy ? "#ecad78" : "#cbdff1";
    for (let i = 1; i < trail.points.length; i++) {
      ctx.globalAlpha = (i / trail.points.length) * 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      line(ctx, trail.points[i - 1], trail.points[i]);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(missile.x, missile.y);
    ctx.rotate(missile.angle);
    ctx.fillStyle = missile.enemy ? "#e28c5d55" : "#9bbde255";
    path(ctx, [
      [-4, -2.5],
      [-14, 0],
      [-4, 2.5],
    ]);
    ctx.fill();
    ctx.fillStyle = "#fbe4bc";
    path(ctx, [
      [-4, -1.4],
      [-9, 0],
      [-4, 1.4],
    ]);
    ctx.fill();
    ctx.fillStyle = missile.enemy ? "#dca479" : "#d6dfe0";
    path(ctx, [
      [6, 0],
      [-4, -2],
      [-3, 2],
    ]);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = "round";
  for (const beam of game.beams) {
    const color =
      beam.kind === "enemy"
        ? "#e2a1a0"
        : beam.kind === "thel"
          ? "#d9b4f2"
          : beam.kind === "pulser"
            ? "#9fe8e4"
            : "#e8b897";
    const strong = beam.kind === "thel";
    ctx.globalAlpha = clamp(beam.life / (beam.kind === "enemy" ? 0.18 : 0.13));
    if (view.settings.fastLasers) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 / zoom;
      line(ctx, beam, { x: beam.tx, y: beam.ty });
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.strokeStyle = color + "24";
    ctx.lineWidth = strong ? 9 : 4.5;
    line(ctx, beam, { x: beam.tx, y: beam.ty });
    ctx.strokeStyle = color;
    ctx.lineWidth = strong ? 2.7 : 1.25;
    line(ctx, beam, { x: beam.tx, y: beam.ty });
    ctx.strokeStyle = "#fff3e5";
    ctx.lineWidth = strong ? 0.85 : 0.45;
    line(ctx, beam, { x: beam.tx, y: beam.ty });
    ctx.fillStyle = color;
    circle(ctx, beam.tx, beam.ty, strong ? 3 : 1.6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const drone of game.drones) {
    const home = nodes.get(drone.home);
    if (!home) continue;
    const target = drone.target === null ? home : nodes.get(drone.target);
    if (drone.working && target) {
      ctx.strokeStyle = "#86d8ba88";
      ctx.lineWidth = 1;
      const endpoint = {
        x: target.x + Math.cos(motionTime * 5 + drone.phase) * 8,
        y: target.y + Math.sin(motionTime * 5 + drone.phase) * 8,
      };
      line(ctx, drone, endpoint);
      ctx.fillStyle = "#d5f6d9";
      circle(ctx, endpoint.x, endpoint.y, 1.4);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(
      target ? Math.atan2(target.y - drone.y, target.x - drone.x) : drone.phase,
    );
    ctx.fillStyle = "#a4d9c8";
    path(ctx, [
      [4, 0],
      [-3, -3],
      [-1, 0],
      [-3, 3],
    ]);
    ctx.fill();
    ctx.strokeStyle = "#203d45";
    ctx.lineWidth = 0.65;
    ctx.stroke();
    ctx.fillStyle = "#f2f4d4";
    circle(ctx, 0, 0, 1);
    ctx.fill();
    ctx.restore();
  }
  for (const burst of game.bursts) {
    const progress = 1 - clamp(burst.life / burst.maxLife);
    const radius = burst.size * (0.18 + progress * 0.7);
    ctx.globalAlpha = (1 - progress) * 0.35;
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = (1 - progress) * 3 + 0.5;
    circle(ctx, burst.x, burst.y, radius);
    ctx.stroke();
    ctx.globalAlpha = (1 - progress) * 0.09;
    ctx.fillStyle = burst.color;
    circle(ctx, burst.x, burst.y, radius * 0.85);
    ctx.fill();
    for (let i = 0; i < (burst.size > 60 ? 18 : 9); i++) {
      const angle = random(burst.seed + i * 37) * TAU;
      const reach =
        burst.size * (0.3 + random(burst.seed + i + 18) * 0.7) * progress;
      const x = burst.x + Math.cos(angle) * reach,
        y = burst.y + Math.sin(angle) * reach;
      ctx.globalAlpha = (1 - progress) * 0.9;
      ctx.strokeStyle = i % 3 ? burst.color : "#fff2cd";
      ctx.lineWidth = (i % 3 === 0 ? 1.8 : 1) / Math.max(0.75, zoom);
      line(
        ctx,
        { x, y },
        {
          x: x - Math.cos(angle) * (3 + progress * 5),
          y: y - Math.sin(angle) * (3 + progress * 5),
        },
      );
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineCap = "butt";
}

/** Playable part of the minimap, in CSS pixels; shared with pointer handling. */
export function minimapBounds(width: number, height: number) {
  const w = clamp(width * 0.19, 112, 148),
    h = (w * WORLD_H) / WORLD_W;
  return { x: width - w - 18, y: height - h - 18, width: w, height: h };
}

function minimap(
  ctx: CanvasRenderingContext2D,
  game: Expedition,
  view: StarfallView,
  nodes: Map<number, Structure>,
) {
  const bounds = minimapBounds(view.width, view.height);
  const { x, y, width, height } = bounds;
  const sx = width / WORLD_W,
    sy = height / WORLD_H;
  ctx.fillStyle = "#06111bea";
  ctx.strokeStyle = "#5269788c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 23, width + 16, height + 31, 5);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "left";
  text(ctx, "SECTOR MAP", x + 1, y - 9, "#a9bdca", 9);
  ctx.textAlign = "right";
  text(
    ctx,
    `${Math.round(view.camera.zoom * 100)}%`,
    x + width - 1,
    y - 9,
    "#d6c7a4",
    9,
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.fillStyle = "#102030";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#294050";
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 3; i++)
    line(
      ctx,
      { x: x + (width * i) / 3, y },
      { x: x + (width * i) / 3, y: y + height },
    );
  line(ctx, { x, y: y + height / 2 }, { x: x + width, y: y + height / 2 });
  for (const asteroid of game.asteroids) {
    ctx.fillStyle = asteroid.ore > 0 ? "#c2a66b" : "#394959";
    circle(
      ctx,
      x + asteroid.x * sx,
      y + asteroid.y * sy,
      asteroid.ore > 0 ? 1.1 : 0.7,
    );
    ctx.fill();
  }
  if (view.settings.energyLines) {
    ctx.strokeStyle = "#75a8cd65";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const node of game.structures)
      for (const id of node.connections) {
        const neighbor = nodes.get(id);
        if (!neighbor || id <= node.id) continue;
        ctx.moveTo(x + node.x * sx, y + node.y * sy);
        ctx.lineTo(x + neighbor.x * sx, y + neighbor.y * sy);
      }
    ctx.stroke();
  }
  for (const node of game.structures) {
    ctx.fillStyle =
      node.id === view.selected
        ? "#fff0c1"
        : node.connected
          ? "#a5d1e5"
          : "#b07f64";
    const r = node.kind === "solar" ? 1.8 : 1.15;
    ctx.fillRect(x + node.x * sx - r, y + node.y * sy - r, r * 2, r * 2);
  }
  for (const enemy of game.enemies) {
    ctx.fillStyle = view.settings.colorBlind
      ? "#e6a56f"
      : ENEMIES[enemy.kind].color;
    circle(
      ctx,
      x + enemy.x * sx,
      y + enemy.y * sy,
      enemy.kind === "mothership" ? 2.4 : 1.25,
    );
    ctx.fill();
  }
  for (const incoming of game.incoming) {
    const tx = x + width / 2 + Math.cos(incoming.angle) * (width / 2 - 4);
    const ty = y + height / 2 + Math.sin(incoming.angle) * (height / 2 - 4);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(incoming.angle + Math.PI);
    ctx.fillStyle = "#f1b084";
    path(ctx, [
      [4, 0],
      [-3, -3],
      [-3, 3],
    ]);
    ctx.fill();
    ctx.restore();
  }
  const vw = (view.width / view.camera.zoom) * sx,
    vh = (view.height / view.camera.zoom) * sy;
  const vx = x + view.camera.x * sx - vw / 2,
    vy = y + view.camera.y * sy - vh / 2;
  ctx.fillStyle = "#9ac5db10";
  ctx.fillRect(vx, vy, vw, vh);
  ctx.strokeStyle = "#d4e7eba6";
  ctx.lineWidth = 1;
  ctx.strokeRect(vx, vy, vw, vh);
  ctx.restore();
}

function sector(ctx: CanvasRenderingContext2D, zoom: number) {
  ctx.strokeStyle = "#6c93ab10";
  ctx.lineWidth = 0.65 / zoom;
  for (let x = 0; x <= WORLD_W; x += 300)
    for (let y = 0; y <= WORLD_H; y += 300) {
      line(ctx, { x: x - 4 / zoom, y }, { x: x + 4 / zoom, y });
      line(ctx, { x, y: y - 4 / zoom }, { x, y: y + 4 / zoom });
    }
  ctx.strokeStyle = "#8eabc531";
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([10 / zoom, 7 / zoom]);
  ctx.strokeRect(20, 20, WORLD_W - 40, WORLD_H - 40);
  ctx.setLineDash([]);
  ctx.textAlign = "left";
  text(ctx, "AFTERHOURS · MINERAL OPERATIONS", 38, 47, "#839cab70", 10 / zoom);
  ctx.textAlign = "right";
  text(
    ctx,
    "OUTER SECTOR / 09",
    WORLD_W - 38,
    WORLD_H - 36,
    "#839cab70",
    9 / zoom,
  );
}

function label(
  ctx: CanvasRenderingContext2D,
  view: StarfallView,
  point: Point,
  title: string,
  detail: string,
) {
  const screenX = view.width / 2 + (point.x - view.camera.x) * view.camera.zoom;
  const screenY =
    view.height / 2 + (point.y - view.camera.y) * view.camera.zoom;
  ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
  const titleWidth = ctx.measureText(title).width;
  ctx.font = '9px "IBM Plex Mono", ui-monospace, monospace';
  const width = Math.min(
    view.width - 16,
    Math.max(titleWidth, ctx.measureText(detail).width) + 22,
  );
  const wrap = (value: string, size: number) => {
    ctx.font = `${size}px "IBM Plex Mono", ui-monospace, monospace`;
    const rows: string[] = [];
    for (const word of value.split(" ")) {
      const last = rows.length - 1;
      if (
        last < 0 ||
        ctx.measureText(`${rows[last]} ${word}`).width > width - 20
      )
        rows.push(word);
      else rows[last] += ` ${word}`;
    }
    return rows;
  };
  const titles = wrap(title, 10),
    details = wrap(detail, 9);
  const height = 12 + titles.length * 15 + details.length * 13;
  const x = clamp(screenX - width / 2, 8, view.width - width - 8);
  const y = clamp(screenY - height - 28, 8, view.height - height - 8);
  ctx.fillStyle = "#081723ef";
  ctx.strokeStyle = "#587386a0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "left";
  titles.forEach((row, i) =>
    text(ctx, row, x + 10, y + 16 + i * 15, "#e2e8de", 10),
  );
  details.forEach((row, i) =>
    text(ctx, row, x + 10, y + 16 + titles.length * 15 + i * 13, "#9fb9c9", 9),
  );
}

/** Paints in logical pixels and preserves the caller's canvas/DPR transform. */
export function renderStarfall(
  ctx: CanvasRenderingContext2D,
  game: Expedition,
  now: number,
  view: StarfallView,
) {
  const { width, height, camera, blueprint, pointer } = view;
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(camera.zoom) ||
    camera.zoom <= 0
  )
    return;
  const zoom = camera.zoom,
    nodes = new Map(game.structures.map((n) => [n.id, n]));
  const rocks = new Map(game.asteroids.map((a) => [a.id, a]));
  const selected =
    view.selected === null ? undefined : nodes.get(view.selected);
  const time = view.settings.smooth ? game.time : 0;
  const visible = (p: Point, margin: number) =>
    Math.abs(p.x - camera.x) <= width / zoom / 2 + margin &&
    Math.abs(p.y - camera.y) <= height / zoom / 2 + margin;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  sky(ctx, view, now);
  ctx.save();
  ctx.translate(width / 2 - camera.x * zoom, height / 2 - camera.y * zoom);
  ctx.scale(zoom, zoom);
  sector(ctx, zoom);
  if (selected)
    selectionRange(
      ctx,
      selected,
      stats(selected).range,
      STRUCTURES[selected.kind].color,
      zoom,
    );
  if (view.settings.energyLines) {
    const groups: [Structure, Structure][][] = [[], [], []];
    for (const node of game.structures)
      for (const id of node.connections) {
        const neighbor = nodes.get(id);
        if (
          !neighbor ||
          id <= node.id ||
          (!visible(node, LINK_RADIUS) && !visible(neighbor, LINK_RADIUS))
        )
          continue;
        const active = node.connected && neighbor.connected;
        const selectedLink =
          selected?.id === node.id || selected?.id === neighbor.id;
        groups[active ? (selectedLink ? 2 : 1) : 0].push([node, neighbor]);
      }
    groups.forEach((links, index) => {
      ctx.strokeStyle = ["#7c677440", "#619dcd43", "#8ccbf29c"][index];
      ctx.lineWidth = index === 2 ? 1.5 : 0.85;
      ctx.beginPath();
      for (const [a, b] of links) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    });
    ctx.strokeStyle = "#b4dcfba0";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let group = 1; group < 3; group++)
      for (const [node, neighbor] of groups[group]) {
        if (
          node.working ||
          neighbor.working ||
          node.kind === "solar" ||
          neighbor.kind === "solar"
        ) {
          const progress = (time * 0.42 + (node.id + neighbor.id) * 0.137) % 1,
            end = Math.min(1, progress + 0.065);
          ctx.moveTo(
            node.x + (neighbor.x - node.x) * progress,
            node.y + (neighbor.y - node.y) * progress,
          );
          ctx.lineTo(
            node.x + (neighbor.x - node.x) * end,
            node.y + (neighbor.y - node.y) * end,
          );
        }
      }
    ctx.stroke();
  }
  for (const asteroid of game.asteroids)
    if (visible(asteroid, 70))
      drawAsteroid(
        ctx,
        asteroid,
        time,
        zoom,
        view.hover === asteroid.id || view.selected === asteroid.id,
      );
  for (const node of game.structures)
    if (node.kind === "miner" && node.working && node.target !== null) {
      const rock = rocks.get(node.target);
      if (!rock || !visible(node, MINE_RADIUS)) continue;
      ctx.strokeStyle = view.settings.colorBlind ? "#8ccce542" : "#c0d58b38";
      ctx.lineWidth = 3;
      line(ctx, node, rock);
      ctx.strokeStyle = view.settings.colorBlind ? "#a4ddf29c" : "#c1d998a0";
      ctx.lineWidth = 0.8;
      line(ctx, node, rock);
      const progress = (time * 0.9 + node.id * 0.19) % 1;
      ctx.fillStyle = "#f1dca5";
      circle(
        ctx,
        rock.x + (node.x - rock.x) * progress,
        rock.y + (node.y - rock.y) * progress,
        1.4,
      );
      ctx.fill();
    }
  for (const node of game.structures)
    if (visible(node, 60)) drawStation(ctx, node, time, view);
  for (const enemy of game.enemies)
    if (visible(enemy, 75)) {
      if (zoom < 0.85) {
        const key = `enemy:${enemy.kind}:${enemy.hit > 0}:${view.settings.colorBlind}`;
        const rotation =
          enemy.angle +
          (enemy.kind === "ringer"
            ? time * 0.23
            : enemy.kind === "suicide"
              ? time * 1.5 + enemy.id
              : 0);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        cachedUnit(ctx, key, ENEMIES[enemy.kind].radius + 24, rotation, (c) =>
          enemyBody(
            c,
            { ...enemy, x: 0, y: 0, angle: 0, id: 0 },
            0,
            view.settings.colorBlind,
          ),
        );
        ctx.restore();
      } else enemyBody(ctx, enemy, time, view.settings.colorBlind);
      if (enemy.hp < enemy.maxHp * 0.98 || view.hover === enemy.id)
        healthBar(
          ctx,
          enemy.x,
          enemy.y + ENEMIES[enemy.kind].radius + 7 / zoom,
          Math.max(18, ENEMIES[enemy.kind].radius * 1.35),
          enemy.hp / enemy.maxHp,
          zoom,
        );
    }
  combat(ctx, game, view, nodes);
  let placement: string | null = null;
  if (blueprint && pointer.inside) {
    placement = placementError(game, blueprint, pointer.x, pointer.y);
    const accent = placement ? "#e7a382" : "#b5d0a7";
    selectionRange(
      ctx,
      pointer,
      STRUCTURES[blueprint].levels[0].range,
      accent,
      zoom,
    );
    const links = game.structures
      .filter(
        (n) =>
          n.hp > 0 &&
          n.progress >= 1 &&
          n.connected &&
          n.connections.length < (n.kind === "solar" ? Infinity : 6) &&
          dist(n, pointer) <= LINK_RADIUS,
      )
      .sort((a, b) => dist(a, pointer) - dist(b, pointer));
    ctx.setLineDash([3 / zoom, 4 / zoom]);
    ctx.strokeStyle = placement ? "#c59c7740" : "#a6d3eead";
    ctx.lineWidth = 1 / zoom;
    for (const node of links.slice(0, blueprint === "solar" ? links.length : 6))
      line(ctx, pointer, node);
    ctx.setLineDash([]);
    if (blueprint === "miner")
      for (const rock of game.asteroids)
        if (rock.ore > 0 && dist(rock, pointer) <= MINE_RADIUS) {
          ctx.strokeStyle = "#d4d89d9c";
          ctx.lineWidth = 1 / zoom;
          line(ctx, pointer, rock);
        }
    ctx.save();
    ctx.translate(pointer.x, pointer.y);
    ctx.globalAlpha = placement ? 0.4 : 0.82;
    stationBody(
      ctx,
      {
        id: 0,
        kind: blueprint,
        level: 1,
        angle: -Math.PI / 2,
        capacity: 1,
        energy: 1,
        connected: !placement,
        working: false,
      },
      time,
      view.settings.colorBlind,
    );
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2 / zoom;
    circle(ctx, 0, 0, STRUCTURES[blueprint].radius + 7);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  if (blueprint && pointer.inside)
    label(
      ctx,
      view,
      pointer,
      STRUCTURES[blueprint].name,
      placement ?? `${STRUCTURES[blueprint].cost} minerals · click to build`,
    );
  else {
    const node = view.hover === null ? undefined : nodes.get(view.hover);
    const enemy =
      view.hover === null
        ? undefined
        : game.enemies.find((e) => e.id === view.hover);
    if (node) {
      const state =
        node.progress < 1
          ? `Building ${Math.floor(node.progress * 100)}%`
          : node.upgrading
            ? `Upgrading ${Math.floor(node.upgrading.progress * 100)}%`
            : node.depleted
              ? "Minerals exhausted"
              : !node.connected
                ? "No solar connection"
                : `${Math.ceil(node.hp)} / ${node.maxHp} hull`;
      label(
        ctx,
        view,
        node,
        `${STRUCTURES[node.kind].name} · ${node.level}`,
        `${state}${node.capacity > 0 ? ` · ${node.energy.toFixed(1)} / ${node.capacity} energy` : ""}`,
      );
    } else if (enemy)
      label(
        ctx,
        view,
        enemy,
        ENEMIES[enemy.kind].name,
        `${Math.ceil(enemy.hp)} / ${Math.ceil(enemy.maxHp)} hull${enemy.kind === "ringer" ? " · shielded" : ""}`,
      );
  }
  minimap(ctx, game, view, nodes);
  ctx.restore();
}
