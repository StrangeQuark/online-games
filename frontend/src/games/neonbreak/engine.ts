export const WIDTH = 900,
  HEIGHT = 620,
  PADDLE_Y = 563;
export type Power = "wide" | "multi" | "slow" | "shield" | "laser";
export type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
};
export type Brick = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: number;
  blast: boolean;
  hit: number;
};
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
};
export type Drop = { id: number; x: number; y: number; kind: Power };
export type Beam = { x: number; y: number };
export type Difficulty = "chill" | "classic" | "expert";
export type Breaker = {
  id: string;
  phase: "ready" | "playing" | "paused" | "between" | "over" | "won";
  difficulty: Difficulty;
  stage: number;
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  paddle: number;
  target: number;
  paddleWidth: number;
  balls: Ball[];
  bricks: Brick[];
  particles: Particle[];
  drops: Drop[];
  beams: Beam[];
  wide: number;
  slow: number;
  laser: number;
  shields: number;
  laserClock: number;
  time: number;
  shake: number;
  flash: number;
  notice: string;
  noticeTime: number;
  hits: number;
  lost: number;
  rng: number;
  nextId: number;
};
export const STAGES = [
  "First light",
  "The diamond",
  "Double vision",
  "Signal bloom",
  "The corridor",
  "Prism rain",
  "Neon cathedral",
  "Afterglow",
];
export const POWER_LABELS: Record<Power, string> = {
  wide: "WIDE PADDLE",
  multi: "MULTIBALL",
  slow: "SLOW MOTION",
  shield: "SAFETY NET",
  laser: "LASER PADDLE",
};
export const COLORS = [
  "#6fe0d0",
  "#8cbcff",
  "#b49bff",
  "#f496b6",
  "#ffc180",
  "#d9ef9a",
];
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function random(g: Breaker) {
  g.rng = (Math.imul(g.rng, 1664525) + 1013904223) >>> 0;
  return g.rng / 4294967296;
}
function speed(g: Breaker) {
  return (
    (g.difficulty === "chill" ? 305 : g.difficulty === "expert" ? 435 : 355) +
    g.stage * 24
  );
}
function ball(g: Breaker, x: number, y: number, vx: number, vy: number): Ball {
  return { id: g.nextId++, x, y, vx, vy, trail: [] };
}
function announce(g: Breaker, text: string) {
  g.notice = text;
  g.noticeTime = 2.5;
}
export function makeBricks(stage: number): Brick[] {
  const result: Brick[] = [];
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 11; col++) {
      const dx = Math.abs(col - 5),
        dy = Math.abs(row - 3);
      let include = true;
      if (stage === 0) include = row < 5;
      if (stage === 1) include = dx + dy <= 5;
      if (stage === 2) include = col !== 5 && row !== 3;
      if (stage === 3) include = dx === 0 || dy === 0 || Math.abs(dx - dy) <= 1;
      if (stage === 4) include = row === 0 || row === 6 || col % 3 !== 1;
      if (stage === 5) include = (col + row) % 3 !== 0;
      if (stage === 6) include = dx <= row + 1 && (row < 5 || col % 2 === 0);
      if (stage === 7) include = dx + dy <= 6;
      if (!include) continue;
      const hp = stage >= 2 && (row + col) % 4 === 0 ? (stage >= 5 ? 3 : 2) : 1;
      result.push({
        id: row * 11 + col,
        x: 33 + col * 76,
        y: 87 + row * 31,
        w: 70,
        h: 24,
        hp,
        maxHp: hp,
        color: (row + stage) % 6,
        blast: stage > 0 && (row * 11 + col + stage) % 13 === 0,
        hit: 0,
      });
    }
  return result;
}
export function newBreaker(
  difficulty: Difficulty = "classic",
  seed = Date.now(),
): Breaker {
  const g: Breaker = {
    id: crypto.randomUUID(),
    phase: "ready",
    difficulty,
    stage: 0,
    score: 0,
    lives: difficulty === "chill" ? 5 : 3,
    combo: 0,
    bestCombo: 0,
    paddle: 450,
    target: 450,
    paddleWidth: 112,
    balls: [],
    bricks: makeBricks(0),
    particles: [],
    drops: [],
    beams: [],
    wide: 0,
    slow: 0,
    laser: 0,
    shields: 0,
    laserClock: 0,
    time: 0,
    shake: 0,
    flash: 0,
    notice: "Find your rhythm. Launch when ready.",
    noticeTime: 4,
    hits: 0,
    lost: 0,
    rng: seed >>> 0,
    nextId: 100,
  };
  g.balls = [ball(g, 450, PADDLE_Y - 10, 0, 0)];
  return g;
}
export function launch(g: Breaker) {
  if (g.phase !== "ready") return;
  g.phase = "playing";
  const angle = (random(g) - 0.5) * 0.65,
    velocity = speed(g);
  for (const b of g.balls) {
    b.vx = Math.sin(angle) * velocity;
    b.vy = -Math.cos(angle) * velocity;
  }
  announce(g, STAGES[g.stage].toUpperCase());
}
export function nextStage(g: Breaker) {
  if (g.phase !== "between") return;
  g.stage++;
  if (g.stage >= STAGES.length) {
    g.phase = "won";
    return;
  }
  g.bricks = makeBricks(g.stage);
  g.balls = [ball(g, g.paddle, PADDLE_Y - 10, 0, 0)];
  g.drops = [];
  g.beams = [];
  g.combo = 0;
  g.phase = "ready";
  g.lives = Math.min(7, g.lives + 1);
  announce(
    g,
    `STAGE ${g.stage + 1} · ${STAGES[g.stage].toUpperCase()} · +1 LIFE`,
  );
}
export function togglePause(g: Breaker) {
  if (g.phase === "playing") g.phase = "paused";
  else if (g.phase === "paused") g.phase = "playing";
}
function burst(g: Breaker, x: number, y: number, color: number, count = 11) {
  for (let i = 0; i < count; i++) {
    const angle = random(g) * Math.PI * 2,
      velocity = 35 + random(g) * 145,
      life = 0.35 + random(g) * 0.35;
    g.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life,
      maxLife: life,
      color,
      size: 2 + random(g) * 4,
    });
  }
  if (g.particles.length > 350) g.particles.splice(0, g.particles.length - 350);
}
export function collectPower(g: Breaker, kind: Power) {
  if (kind === "wide") g.wide = 16;
  if (kind === "slow") g.slow = 12;
  if (kind === "laser") g.laser = 13;
  if (kind === "shield") g.shields = Math.min(3, g.shields + 1);
  if (kind === "multi") {
    const source = g.balls[0];
    if (source)
      for (const offset of [-0.55, 0.55]) {
        if (g.balls.length >= 6) break;
        const length = Math.hypot(source.vx, source.vy) || speed(g),
          angle = Math.atan2(source.vy, source.vx) + offset;
        g.balls.push(
          ball(
            g,
            source.x,
            source.y,
            Math.cos(angle) * length,
            -Math.max(100, Math.abs(Math.sin(angle) * length)),
          ),
        );
      }
  }
  g.score += 75;
  announce(g, POWER_LABELS[kind]);
  burst(g, g.paddle, PADDLE_Y, 0, 18);
}
function hitBrick(g: Breaker, brick: Brick, chain = false) {
  if (brick.hp <= 0) return;
  brick.hp--;
  brick.hit = 0.12;
  g.hits++;
  if (brick.hp > 0) {
    burst(g, brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 4);
    return;
  }
  g.combo++;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  const multiplier = Math.min(8, 1 + Math.floor(g.combo / 4));
  g.score += (50 + brick.maxHp * 25) * multiplier;
  burst(
    g,
    brick.x + brick.w / 2,
    brick.y + brick.h / 2,
    brick.color,
    brick.blast ? 24 : 11,
  );
  g.shake = brick.blast ? 5 : 1.5;
  if (!chain && random(g) < 0.18 && g.drops.length < 6) {
    const types: Power[] = ["wide", "multi", "slow", "shield", "laser"];
    g.drops.push({
      id: g.nextId++,
      x: brick.x + brick.w / 2,
      y: brick.y,
      kind: types[Math.floor(random(g) * types.length)],
    });
  }
  if (brick.blast) {
    g.flash = 0.08;
    for (const other of g.bricks)
      if (
        other.hp > 0 &&
        Math.hypot(other.x - brick.x, other.y - brick.y) < 90
      ) {
        other.hp = 1;
        hitBrick(g, other, true);
      }
  }
}
export function stepBreaker(g: Breaker, dt: number) {
  if (g.phase === "paused" || g.phase === "over" || g.phase === "won") return;
  dt = clamp(dt, 0, 0.06);
  g.paddleWidth = g.wide > 0 ? 170 : 112;
  g.target = clamp(
    g.target,
    g.paddleWidth / 2 + 10,
    WIDTH - g.paddleWidth / 2 - 10,
  );
  g.paddle += (g.target - g.paddle) * (1 - Math.exp(-dt * 25));
  g.noticeTime = Math.max(0, g.noticeTime - dt);
  g.shake = Math.max(0, g.shake - dt * 24);
  g.flash = Math.max(0, g.flash - dt);
  for (const p of g.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 85 * dt;
    p.life -= dt;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const brick of g.bricks) brick.hit = Math.max(0, brick.hit - dt);
  if (g.phase === "ready") {
    for (const b of g.balls) {
      b.x = g.paddle;
      b.y = PADDLE_Y - 10;
    }
    return;
  }
  if (g.phase !== "playing") return;
  g.time += dt;
  g.wide = Math.max(0, g.wide - dt);
  g.slow = Math.max(0, g.slow - dt);
  g.laser = Math.max(0, g.laser - dt);
  if (g.laser > 0) {
    g.laserClock -= dt;
    if (g.laserClock <= 0) {
      g.laserClock = 0.24;
      g.beams.push(
        { x: g.paddle - g.paddleWidth / 2 + 9, y: PADDLE_Y - 8 },
        { x: g.paddle + g.paddleWidth / 2 - 9, y: PADDLE_Y - 8 },
      );
    }
  }
  for (const beam of g.beams) {
    beam.y -= 690 * dt;
    const target = g.bricks.find(
      (b) =>
        b.hp > 0 &&
        beam.x >= b.x &&
        beam.x <= b.x + b.w &&
        beam.y <= b.y + b.h &&
        beam.y >= b.y - 14,
    );
    if (target) {
      hitBrick(g, target);
      beam.y = -100;
    }
  }
  g.beams = g.beams.filter((b) => b.y > 20);
  for (const b of g.balls) {
    b.trail.unshift({ x: b.x, y: b.y });
    if (b.trail.length > 10) b.trail.pop();
    const steps = Math.max(1, Math.ceil(dt / 0.007));
    for (let i = 0; i < steps; i++) {
      const h = (dt / steps) * (g.slow > 0 ? 0.7 : 1),
        px = b.x,
        py = b.y;
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.x < 15) {
        b.x = 15;
        b.vx = Math.abs(b.vx);
      }
      if (b.x > WIDTH - 15) {
        b.x = WIDTH - 15;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < 44) {
        b.y = 44;
        b.vy = Math.abs(b.vy);
      }
      if (
        b.vy > 0 &&
        py + 7 <= PADDLE_Y + 8 &&
        b.y + 7 >= PADDLE_Y &&
        Math.abs(b.x - g.paddle) < g.paddleWidth / 2 + 7
      ) {
        const offset = clamp((b.x - g.paddle) / (g.paddleWidth / 2), -1, 1),
          angle = offset * 1.12,
          velocity = Math.min(
            680,
            Math.max(speed(g), Math.hypot(b.vx, b.vy) + 3),
          );
        b.vx = Math.sin(angle) * velocity;
        b.vy = -Math.cos(angle) * velocity;
        b.y = PADDLE_Y - 7;
        g.combo = 0;
        burst(g, b.x, PADDLE_Y, 0, 4);
      }
      if (b.y > HEIGHT - 20 && b.vy > 0 && g.shields > 0) {
        g.shields--;
        b.y = HEIGHT - 23;
        b.vy = -Math.abs(b.vy);
        announce(g, "SAFETY NET SAVED YOU");
        burst(g, b.x, b.y, 1, 18);
      }
      for (const brick of g.bricks) {
        if (brick.hp <= 0) continue;
        const nx = clamp(b.x, brick.x, brick.x + brick.w),
          ny = clamp(b.y, brick.y, brick.y + brick.h);
        if ((b.x - nx) ** 2 + (b.y - ny) ** 2 > 49) continue;
        if (py + 7 <= brick.y) {
          b.y = brick.y - 7;
          b.vy = -Math.abs(b.vy);
        } else if (py - 7 >= brick.y + brick.h) {
          b.y = brick.y + brick.h + 7;
          b.vy = Math.abs(b.vy);
        } else if (px < brick.x) {
          b.x = brick.x - 7;
          b.vx = -Math.abs(b.vx);
        } else {
          b.x = brick.x + brick.w + 7;
          b.vx = Math.abs(b.vx);
        }
        hitBrick(g, brick);
        break;
      }
    }
  }
  g.balls = g.balls.filter((b) => b.y < HEIGHT + 15);
  for (const drop of g.drops) {
    drop.y += 118 * dt;
    if (
      Math.abs(drop.y - PADDLE_Y) < 18 &&
      Math.abs(drop.x - g.paddle) < g.paddleWidth / 2 + 15
    ) {
      collectPower(g, drop.kind);
      drop.y = HEIGHT + 100;
    }
  }
  g.drops = g.drops.filter((d) => d.y < HEIGHT + 20);
  if (g.bricks.every((b) => b.hp <= 0)) {
    g.score += 1000 * (g.stage + 1);
    g.phase = g.stage === STAGES.length - 1 ? "won" : "between";
    g.drops = [];
    announce(g, "SECTOR CLEAR");
    burst(g, WIDTH / 2, HEIGHT / 2, 4, 60);
    return;
  }
  if (!g.balls.length) {
    g.lives--;
    g.lost++;
    g.combo = 0;
    g.wide = g.slow = g.laser = 0;
    g.drops = [];
    g.beams = [];
    g.shake = 7;
    if (g.lives <= 0) {
      g.phase = "over";
      announce(g, "THE LIGHT LINGERS");
    } else {
      g.phase = "ready";
      g.balls = [ball(g, g.paddle, PADDLE_Y - 10, 0, 0)];
      announce(g, "A FRESH SPARK. YOU’VE GOT THIS.");
    }
  }
}
