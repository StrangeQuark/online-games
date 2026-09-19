export type Platform = {
  x: number;
  y: number;
  w: number;
  spring?: boolean;
  checkpoint?: boolean;
};
export type Lantern = { x: number; y: number; platform: number };
export type Thorn = { x: number; y: number; w: number };
export type Grove = {
  name: string;
  note: string;
  width: number;
  platforms: Platform[];
  lanterns: Lantern[];
  thorns: Thorn[];
  exit: { x: number; y: number };
  tint: string;
};
const make = (
  name: string,
  note: string,
  rows: number[][],
  lanternPlatforms: number[],
  thornPlatforms: number[],
  tint: string,
): Grove => {
  const platforms = rows.map(([x, y, w, spring = 0], i) => ({
      x,
      y,
      w,
      spring: Boolean(spring),
      checkpoint: i === 3 || i === 6,
    })),
    last = platforms[platforms.length - 1];
  return {
    name,
    note,
    width: last.x + last.w + 140,
    platforms,
    lanterns: lanternPlatforms.map((i) => ({
      x: platforms[i].x + platforms[i].w * 0.43,
      y: platforms[i].y - 37,
      platform: i,
    })),
    thorns: thornPlatforms.map((i) => ({
      x: platforms[i].x + platforms[i].w * 0.72,
      y: platforms[i].y,
      w: 42,
    })),
    exit: { x: last.x + last.w - 65, y: last.y },
    tint,
  };
};
export const GROVES: Grove[] = [
  make(
    "The first firefly",
    "Move with A D or ← →. A little jump can take you a long way.",
    [
      [-80, 570, 450],
      [460, 550, 260],
      [810, 495, 250],
      [1150, 550, 280],
      [1525, 510, 270],
      [1885, 545, 285],
      [2260, 505, 340],
    ],
    [1, 3, 5],
    [],
    "#67916b",
  ),
  make(
    "Fern stairway",
    "Jump again in the air. There is always a little more lift.",
    [
      [-80, 570, 410],
      [420, 525, 230],
      [740, 450, 230],
      [1060, 385, 265],
      [1420, 450, 245],
      [1755, 390, 270],
      [2120, 455, 270],
      [2480, 510, 350],
    ],
    [2, 4, 6],
    [],
    "#81a776",
  ),
  make(
    "A thorny afternoon",
    "Jump over the brambles. Hold Shift to dash through danger.",
    [
      [-80, 570, 430],
      [445, 545, 280],
      [820, 500, 280],
      [1195, 545, 320],
      [1605, 480, 280],
      [1980, 520, 320],
      [2390, 490, 340],
    ],
    [1, 3, 5],
    [1, 2, 4, 5],
    "#adac75",
  ),
  make(
    "The spring garden",
    "Golden moss is springy. Let the garden give you a lift.",
    [
      [-80, 570, 430],
      [440, 570, 240, 1],
      [795, 410, 270],
      [1160, 480, 300],
      [1550, 510, 245, 1],
      [1910, 345, 300],
      [2300, 420, 280],
      [2670, 470, 330],
    ],
    [2, 3, 6],
    [3, 6],
    "#a6bc7d",
  ),
  make(
    "Lantern crossing",
    "Each little arch remembers you. A fall is only a pause.",
    [
      [-80, 570, 400],
      [410, 540, 220],
      [735, 485, 225],
      [1060, 430, 280],
      [1440, 480, 230],
      [1770, 420, 245],
      [2120, 480, 280],
      [2500, 445, 335],
    ],
    [2, 4, 6],
    [1, 4, 6],
    "#769e99",
  ),
  make(
    "Above the old roots",
    "A dash carries you across. Land, breathe, go again.",
    [
      [-80, 570, 400],
      [435, 520, 225],
      [795, 470, 240],
      [1150, 420, 280],
      [1560, 480, 250],
      [1930, 435, 250],
      [2300, 385, 300],
      [2710, 450, 335],
    ],
    [1, 4, 6],
    [2, 4, 5],
    "#8e96ac",
  ),
  make(
    "The moonlit grove",
    "Three small lights are enough to find a way home.",
    [
      [-80, 570, 430],
      [450, 540, 245, 1],
      [810, 385, 245],
      [1160, 455, 300],
      [1550, 390, 260],
      [1910, 455, 270, 1],
      [2280, 300, 300],
      [2685, 390, 350],
    ],
    [2, 4, 6],
    [3, 4, 6],
    "#999cc5",
  ),
  make(
    "A light in the window",
    "One last little leap. Your lanterns know the way.",
    [
      [-80, 570, 430],
      [450, 515, 260],
      [820, 445, 245],
      [1170, 385, 290],
      [1550, 455, 275, 1],
      [1940, 300, 290],
      [2330, 385, 280],
      [2710, 445, 380],
    ],
    [1, 3, 6],
    [1, 2, 3, 5, 6],
    "#cfb68e",
  ),
];
export type WispInput = { move: number; jump: boolean; dash: boolean };
export type Wisp = {
  id: string;
  level: number;
  phase: "intro" | "playing" | "paused" | "clear" | "complete";
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  ground: number | null;
  jumps: number;
  coyote: number;
  jumpBuffer: number;
  wasJump: boolean;
  wasDash: boolean;
  dashTime: number;
  dashCooldown: number;
  respawn: number;
  checkpoint: { x: number; y: number; platform: number };
  lanterns: number[];
  time: number;
  totalTime: number;
  deaths: number;
  totalDeaths: number;
  score: number;
  cleared: number;
  remainder: number;
  events: (
    "jump" | "dash" | "lantern" | "checkpoint" | "spring" | "fall" | "clear"
  )[];
  notice: string;
  noticeTime: number;
};
export function groveOf(g: Wisp) {
  return GROVES[g.level];
}
export function newWisp(level = 0): Wisp {
  const p = GROVES[level].platforms[0];
  return {
    id: crypto.randomUUID(),
    level,
    phase: "intro",
    x: 100,
    y: p.y - 20,
    vx: 0,
    vy: 0,
    facing: 1,
    ground: 0,
    jumps: 0,
    coyote: 0.12,
    jumpBuffer: 0,
    wasJump: false,
    wasDash: false,
    dashTime: 0,
    dashCooldown: 0,
    respawn: 0,
    checkpoint: { x: 100, y: p.y - 20, platform: 0 },
    lanterns: [],
    time: 0,
    totalTime: 0,
    deaths: 0,
    totalDeaths: 0,
    score: 0,
    cleared: 0,
    remainder: 0,
    events: [],
    notice: GROVES[level].note,
    noticeTime: 7,
  };
}
export function startWisp(g: Wisp) {
  if (g.phase === "intro" || g.phase === "paused") g.phase = "playing";
}
export function pauseWisp(g: Wisp) {
  if (g.phase === "playing") g.phase = "paused";
  else if (g.phase === "paused") g.phase = "playing";
}
export function nextGrove(g: Wisp) {
  if (g.phase !== "clear") return false;
  if (g.level === GROVES.length - 1) {
    g.phase = "complete";
    return true;
  }
  const next = newWisp(g.level + 1);
  Object.assign(g, next, {
    id: g.id,
    phase: "playing",
    score: g.score,
    cleared: g.cleared,
    totalDeaths: g.totalDeaths,
    totalTime: g.totalTime,
  });
  return true;
}
function fall(g: Wisp) {
  g.deaths++;
  g.totalDeaths++;
  g.respawn = 0.55;
  g.vx = 0;
  g.vy = 0;
  g.dashTime = 0;
  g.events.push("fall");
  g.notice = "Just a little tumble. Your lanterns are still with you.";
  g.noticeTime = 2.5;
}
function step(g: Wisp, input: WispInput, dt: number) {
  g.time += dt;
  g.totalTime += dt;
  g.noticeTime = Math.max(0, g.noticeTime - dt);
  g.dashCooldown = Math.max(0, g.dashCooldown - dt);
  g.coyote = Math.max(0, g.coyote - dt);
  g.jumpBuffer = Math.max(0, g.jumpBuffer - dt);
  if (g.respawn > 0) {
    g.respawn = Math.max(0, g.respawn - dt);
    if (!g.respawn) {
      g.x = g.checkpoint.x;
      g.y = g.checkpoint.y;
      g.ground = g.checkpoint.platform;
      g.jumps = 0;
      g.coyote = 0.12;
      g.dashCooldown = 0;
      g.wasJump = input.jump;
      g.wasDash = input.dash;
    }
    return;
  }
  if (input.jump && !g.wasJump) g.jumpBuffer = 0.12;
  g.wasJump = input.jump;
  if (input.move) g.facing = input.move > 0 ? 1 : -1;
  if (input.dash && !g.wasDash && g.dashCooldown <= 0) {
    g.dashTime = 0.17;
    g.dashCooldown = 0.85;
    g.vy = 0;
    g.events.push("dash");
  }
  g.wasDash = input.dash;
  if (g.jumpBuffer > 0 && (g.ground !== null || g.coyote > 0 || g.jumps < 2)) {
    const first = g.ground !== null || g.coyote > 0;
    g.vy = first ? -560 : -520;
    g.jumps = first ? 1 : 2;
    g.ground = null;
    g.coyote = 0;
    g.jumpBuffer = 0;
    g.events.push("jump");
  }
  const oldBottom = g.y + 20;
  if (g.dashTime > 0) {
    g.dashTime = Math.max(0, g.dashTime - dt);
    g.vx = g.facing * 650;
    g.vy = 0;
  } else {
    const target = Math.max(-1, Math.min(1, input.move)) * 245,
      acceleration = g.ground !== null ? 1700 : 1150;
    g.vx += Math.max(
      -acceleration * dt,
      Math.min(acceleration * dt, target - g.vx),
    );
    g.vy = Math.min(850, g.vy + 1250 * dt);
  }
  g.x = Math.max(15, Math.min(groveOf(g).width - 20, g.x + g.vx * dt));
  g.y += g.vy * dt;
  const grove = groveOf(g);
  g.ground = null;
  if (g.vy >= 0)
    for (let i = 0; i < grove.platforms.length; i++) {
      const p = grove.platforms[i];
      if (
        g.x + 12 > p.x &&
        g.x - 12 < p.x + p.w &&
        oldBottom <= p.y + 2 &&
        g.y + 20 >= p.y
      ) {
        g.y = p.y - 20;
        g.vy = 0;
        g.ground = i;
        g.jumps = 0;
        g.coyote = 0.12;
        if (p.checkpoint && i > g.checkpoint.platform) {
          g.checkpoint = { x: p.x + 38, y: p.y - 20, platform: i };
          g.events.push("checkpoint");
          g.notice = "A little light to come back to. Checkpoint saved.";
          g.noticeTime = 2.5;
        }
        if (p.spring) {
          g.vy = -780;
          g.ground = null;
          g.jumps = 1;
          g.coyote = 0;
          g.events.push("spring");
          g.notice = "Up you go!";
          g.noticeTime = 1;
        }
        break;
      }
    }
  if (g.ground === null && g.jumps === 0 && g.coyote <= 0) g.jumps = 1;
  for (let i = 0; i < grove.lanterns.length; i++) {
    const l = grove.lanterns[i];
    if (!g.lanterns.includes(i) && Math.hypot(g.x - l.x, g.y - l.y) < 35) {
      g.lanterns.push(i);
      g.events.push("lantern");
      g.notice = `${g.lanterns.length} of 3 little lights found.`;
      g.noticeTime = 2;
    }
  }
  if (
    g.dashTime <= 0 &&
    grove.thorns.some(
      (t) =>
        g.x + 10 > t.x &&
        g.x - 10 < t.x + t.w &&
        g.y + 18 > t.y - 22 &&
        g.y - 18 < t.y + 4,
    )
  ) {
    fall(g);
    return;
  }
  if (g.y > 850) {
    fall(g);
    return;
  }
  if (
    Math.abs(g.x - grove.exit.x) < 43 &&
    Math.abs(g.y - (grove.exit.y - 25)) < 65
  ) {
    if (g.lanterns.length === 3) {
      g.phase = "clear";
      g.score +=
        1450 +
        Math.max(0, 1000 - Math.floor(g.time * 8)) -
        Math.min(600, g.deaths * 50);
      g.cleared++;
      g.events.push("clear");
      g.notice = "Three little lights. One lovely journey.";
    } else {
      g.notice = `The arch needs ${3 - g.lanterns.length} more little ${g.lanterns.length === 2 ? "light" : "lights"}. Follow the lantern markers.`;
      g.noticeTime = 2;
    }
  }
}
export function updateWisp(g: Wisp, input: WispInput, delta: number) {
  g.events = [];
  if (g.phase !== "playing" || !Number.isFinite(delta) || delta <= 0) return;
  g.remainder += Math.min(delta, 0.05);
  while (g.remainder + 1e-10 >= 1 / 120 && g.phase === "playing") {
    g.remainder -= 1 / 120;
    step(g, input, 1 / 120);
  }
}
