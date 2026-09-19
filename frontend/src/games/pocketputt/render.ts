import {
  WIDTH,
  HEIGHT,
  BALL_RADIUS,
  currentHole,
  previewPutt,
  type Golf,
  type Rect,
} from "./engine";
export type Aim = {
  angle: number;
  power: number;
  preview: boolean;
  dragging: boolean;
};
function rounded(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  radius: number,
  fill: string | CanvasGradient,
  stroke?: string,
) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.35, size * 0.24, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function plant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
) {
  for (let i = 0; i < 6; i++)
    leaf(
      ctx,
      x,
      y,
      size,
      (i / 6) * Math.PI * 2 + seed,
      i % 2 ? "#416b57" : "#618768",
    );
  ctx.fillStyle = "#88a170";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
}
export function renderGolf(
  ctx: CanvasRenderingContext2D,
  g: Golf,
  aim: Aim,
  now: number,
  reduced = false,
) {
  ctx.setTransform(
    ctx.canvas.width / WIDTH,
    0,
    0,
    ctx.canvas.height / HEIGHT,
    0,
    0,
  );
  const h = currentHole(g),
    gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#233d35");
  gradient.addColorStop(1, "#132c2d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Hand-placed garden details stay outside the playable stone border.
  for (let i = 0; i < 28; i++) {
    const x = 20 + ((i * 137) % 860),
      y = i % 2 ? 17 : 603;
    ctx.fillStyle = i % 3 ? "#a0986d22" : "#d9bd8340";
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + (i % 3), 2.5, i, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, size, seed] of [
    [24, 90, 24, 1],
    [873, 130, 23, 2],
    [25, 475, 29, 3],
    [876, 480, 27, 4],
    [215, 21, 24, 5],
    [685, 604, 25, 6],
  ])
    plant(ctx, x, y, size, seed);
  ctx.shadowColor = "#07191477";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 7;
  rounded(ctx, { x: 34, y: 34, w: 832, h: 552 }, 21, "#958969");
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  rounded(ctx, { x: 39, y: 39, w: 822, h: 542 }, 17, "#c5b58e");
  rounded(ctx, { x: 47, y: 47, w: 806, h: 526 }, 10, "#263d2c");
  const turf = ctx.createLinearGradient(50, 50, 850, 570);
  turf.addColorStop(0, "#6a8a5d");
  turf.addColorStop(0.5, "#5e8054");
  turf.addColorStop(1, "#456f4c");
  rounded(ctx, { x: 50, y: 50, w: 800, h: 520 }, 8, turf);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(50, 50, 800, 520, 8);
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? "#e1d79b05" : "#173e2807";
    ctx.fillRect(50 + i * 60, 50, 60, 520);
  }
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = i % 2 ? "#c6d29612" : "#294e3610";
    ctx.fillRect(55 + ((i * 197) % 790), 56 + ((i * 83) % 507), 1, 1);
  }
  for (const sand of h.sand) {
    ctx.shadowColor = "#263c2944";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    rounded(ctx, sand, 17, "#d8c591");
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    rounded(
      ctx,
      { x: sand.x + 4, y: sand.y + 4, w: sand.w - 8, h: sand.h - 8 },
      13,
      "#dfcd9d",
    );
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(sand.x + 4, sand.y + 4, sand.w - 8, sand.h - 8, 13);
    ctx.clip();
    ctx.strokeStyle = "#b2a27755";
    ctx.lineWidth = 1;
    for (let y = sand.y + 12; y < sand.y + sand.h; y += 9) {
      ctx.beginPath();
      ctx.moveTo(sand.x + 8, y);
      ctx.bezierCurveTo(
        sand.x + sand.w * 0.3,
        y - 5,
        sand.x + sand.w * 0.7,
        y + 4,
        sand.x + sand.w - 8,
        y,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const water of h.water) {
    rounded(
      ctx,
      { x: water.x - 5, y: water.y - 5, w: water.w + 10, h: water.h + 10 },
      20,
      "#c0b185",
    );
    const blue = ctx.createLinearGradient(
      water.x,
      water.y,
      water.x + water.w,
      water.y + water.h,
    );
    blue.addColorStop(0, "#428e91");
    blue.addColorStop(1, "#286574");
    rounded(ctx, water, 16, blue);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(water.x, water.y, water.w, water.h, 16);
    ctx.clip();
    ctx.strokeStyle = "#b1d3b43d";
    ctx.lineWidth = 1.5;
    for (let row = 0; row < 8; row++) {
      const y = water.y + 15 + row * 32;
      ctx.beginPath();
      for (let x = water.x; x < water.x + water.w; x += 5) {
        const yy = y + Math.sin(x / 24 + (reduced ? 0 : now / 1800) + row) * 3;
        if (x === water.x) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    for (const [px, py] of [
      [water.x + 24, water.y + 22],
      [water.x + water.w - 30, water.y + water.h - 25],
    ]) {
      ctx.fillStyle = "#79a66f";
      ctx.beginPath();
      ctx.arc(px, py, 10, 0.3, Math.PI * 2 - 0.2);
      ctx.lineTo(px, py);
      ctx.fill();
    }
  }
  for (const wall of h.walls) {
    ctx.shadowColor = "#203b3177";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 5;
    rounded(ctx, wall, 5, "#b7a580");
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    rounded(
      ctx,
      { x: wall.x + 3, y: wall.y + 3, w: wall.w - 6, h: wall.h - 6 },
      3,
      "#d4c198",
    );
    ctx.strokeStyle = "#897e6266";
    ctx.lineWidth = 1;
    if (wall.w > wall.h) {
      for (let x = wall.x + 30; x < wall.x + wall.w - 10; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, wall.y + 2);
        ctx.lineTo(x, wall.y + wall.h - 2);
        ctx.stroke();
      }
    } else
      for (let y = wall.y + 30; y < wall.y + wall.h - 10; y += 35) {
        ctx.beginPath();
        ctx.moveTo(wall.x + 2, y);
        ctx.lineTo(wall.x + wall.w - 2, y);
        ctx.stroke();
      }
  }
  for (const bumper of h.bumpers) {
    ctx.shadowColor = "#183d3177";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#a58d54";
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const brass = ctx.createRadialGradient(
      bumper.x - bumper.r * 0.3,
      bumper.y - bumper.r * 0.3,
      1,
      bumper.x,
      bumper.y,
      bumper.r,
    );
    brass.addColorStop(0, "#eed5a1");
    brass.addColorStop(1, "#b49c65");
    ctx.fillStyle = brass;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y - 2, bumper.r - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#92774c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y - 2, bumper.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#c6ab71";
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y - 2, bumper.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  if (h.portals)
    h.portals.forEach((portal, i) => {
      ctx.strokeStyle = i ? "#e6bea7" : "#a9d6d0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = i ? "#b88f8377" : "#76afa977";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = i ? "#e4b6a12a" : "#b0e4d92a";
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2d8b2";
      ctx.font = "13px Georgia";
      ctx.textAlign = "center";
      ctx.fillText("✧", portal.x, portal.y + 4);
    });
  ctx.strokeStyle = "#d0d6a777";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(h.start.x, h.start.y, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Cup, subtle putting target, and a folded cloth flag.
  ctx.fillStyle = "#28463166";
  ctx.beginPath();
  ctx.ellipse(h.cup.x + 3, h.cup.y + 3, 17, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#182d27";
  ctx.beginPath();
  ctx.arc(h.cup.x, h.cup.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b6b38a";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#0a211d";
  ctx.beginPath();
  ctx.arc(h.cup.x + 1, h.cup.y + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#233c2d33";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(h.cup.x, h.cup.y);
  ctx.lineTo(h.cup.x + 39, h.cup.y + 17);
  ctx.stroke();
  ctx.strokeStyle = "#e1cc99";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(h.cup.x, h.cup.y);
  ctx.lineTo(h.cup.x, h.cup.y - 62);
  ctx.stroke();
  const flutter = reduced ? 0 : Math.sin(now / 500) * 2;
  ctx.fillStyle = "#d68f7c";
  ctx.beginPath();
  ctx.moveTo(h.cup.x, h.cup.y - 61);
  ctx.lineTo(h.cup.x + 34, h.cup.y - 53 + flutter);
  ctx.lineTo(h.cup.x, h.cup.y - 41);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f5ddad";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(g.hole + 1), h.cup.x + 12, h.cup.y - 49);
  if (g.phase === "aiming") {
    if (aim.preview) {
      const path = previewPutt(g, aim.angle, aim.power);
      for (let i = 0; i < path.length; i++) {
        ctx.globalAlpha = 0.6 * (1 - i / path.length);
        ctx.fillStyle = "#f7e6b7";
        ctx.beginPath();
        ctx.arc(path[i].x, path[i].y, i < 4 ? 2.7 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const len = 35 + aim.power * 50;
    ctx.strokeStyle = "#f0dfaf";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      g.ball.x + Math.cos(aim.angle) * 15,
      g.ball.y + Math.sin(aim.angle) * 15,
    );
    ctx.lineTo(
      g.ball.x + Math.cos(aim.angle) * len,
      g.ball.y + Math.sin(aim.angle) * len,
    );
    ctx.stroke();
    const tip = {
      x: g.ball.x + Math.cos(aim.angle) * len,
      y: g.ball.y + Math.sin(aim.angle) * len,
    };
    ctx.beginPath();
    ctx.moveTo(
      tip.x - Math.cos(aim.angle - 0.6) * 8,
      tip.y - Math.sin(aim.angle - 0.6) * 8,
    );
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(
      tip.x - Math.cos(aim.angle + 0.6) * 8,
      tip.y - Math.sin(aim.angle + 0.6) * 8,
    );
    ctx.stroke();
    if (aim.dragging) {
      ctx.strokeStyle = "#dbc89199";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(
        g.ball.x - Math.cos(aim.angle) * 25,
        g.ball.y - Math.sin(aim.angle) * 25,
      );
      ctx.lineTo(
        g.ball.x - Math.cos(aim.angle) * (55 + aim.power * 80),
        g.ball.y - Math.sin(aim.angle) * (55 + aim.power * 80),
      );
      ctx.stroke();
    }
  }
  if (!reduced && g.trail.length) {
    for (let i = 0; i < g.trail.length; i++) {
      ctx.fillStyle = `rgba(248,239,207,${(i / g.trail.length) * 0.15})`;
      ctx.beginPath();
      ctx.arc(
        g.trail[i].x,
        g.trail[i].y,
        BALL_RADIUS * (i / g.trail.length) * 0.7,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  if (g.phase !== "sunk" && g.phase !== "finished") {
    ctx.shadowColor = "#1b322977";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 3;
    const ball = ctx.createRadialGradient(
      g.ball.x - 3,
      g.ball.y - 4,
      1,
      g.ball.x,
      g.ball.y,
      10,
    );
    ball.addColorStop(0, "#fffdf1");
    ball.addColorStop(1, "#d6d2ba");
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(g.ball.x, g.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#c4c4ac88";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(
        g.ball.x + Math.cos(i * 2) * 4,
        g.ball.y + Math.sin(i * 2) * 4,
        1,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = "#d9d4af";
  ctx.font = "9px sans-serif";
  ctx.letterSpacing = "2px";
  ctx.textAlign = "left";
  ctx.fillText("THE POCKET GARDEN", 56, 28);
  ctx.textAlign = "right";
  ctx.fillText(`${String(g.hole + 1).padStart(2, "0")} / 09`, 844, 28);
  ctx.letterSpacing = "0px";
}
