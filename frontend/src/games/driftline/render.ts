import {
  courseOf,
  curveAt,
  hillAt,
  ghostAt,
  ROAD_WIDTH,
  SEGMENT,
  type Drive,
  type Trace,
} from "./engine";
type Projected = {
  z: number;
  x: number;
  y: number;
  w: number;
  scale: number;
  index: number;
  visible: boolean;
};
function polygon(
  ctx: CanvasRenderingContext2D,
  color: string | CanvasGradient,
  points: number[],
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}
function car(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
  steer = 0,
  brake = false,
  boost = false,
  night = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(steer * 0.035);
  const h = w * 0.56;
  ctx.fillStyle = "#091b2566";
  ctx.beginPath();
  ctx.ellipse(0, 2, w * 0.6, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  if (boost) {
    for (const side of [-1, 1]) {
      const glow = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      glow.addColorStop(0, "#baf8ec");
      glow.addColorStop(0.4, "#66d7ed99");
      glow.addColorStop(1, "#66d7ed00");
      polygon(ctx, glow, [
        side * w * 0.27 - w * 0.07,
        0,
        side * w * 0.27 + w * 0.07,
        0,
        side * w * 0.27,
        h * (0.5 + Math.sin(performance.now() / 40) * 0.12),
      ]);
    }
  }
  ctx.fillStyle = "#172128";
  ctx.fillRect(-w * 0.49, -h * 0.49, w * 0.16, h * 0.55);
  ctx.fillRect(w * 0.33, -h * 0.49, w * 0.16, h * 0.55);
  polygon(ctx, color, [
    -w * 0.47,
    0,
    -w * 0.5,
    -h * 0.48,
    -w * 0.31,
    -h * 0.95,
    w * 0.29,
    -h * 0.95,
    w * 0.49,
    -h * 0.48,
    w * 0.46,
    0,
  ]);
  polygon(ctx, "#eff1dfbb", [
    -w * 0.5,
    -h * 0.48,
    -w * 0.31,
    -h * 0.95,
    w * 0.29,
    -h * 0.95,
    w * 0.49,
    -h * 0.48,
    w * 0.34,
    -h * 0.42,
    -w * 0.33,
    -h * 0.42,
  ]);
  polygon(ctx, night ? "#2c4258" : "#4d7682", [
    -w * 0.28,
    -h * 0.86,
    w * 0.26,
    -h * 0.86,
    w * 0.36,
    -h * 0.5,
    -w * 0.36,
    -h * 0.5,
  ]);
  polygon(ctx, "#ffffff20", [
    -w * 0.24,
    -h * 0.83,
    -w * 0.1,
    -h * 0.83,
    -w * 0.2,
    -h * 0.52,
    -w * 0.32,
    -h * 0.52,
  ]);
  ctx.fillStyle = color;
  ctx.fillRect(-w * 0.45, -h * 0.39, w * 0.9, h * 0.3);
  ctx.fillStyle = "#ffffff33";
  ctx.fillRect(-w * 0.43, -h * 0.37, w * 0.86, h * 0.045);
  ctx.fillStyle = brake ? "#ff6154" : "#c6695a";
  ctx.shadowColor = "#ff7054";
  ctx.shadowBlur = brake ? w * 0.12 : 0;
  ctx.fillRect(-w * 0.41, -h * 0.25, w * 0.2, h * 0.12);
  ctx.fillRect(w * 0.21, -h * 0.25, w * 0.2, h * 0.12);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#21313b";
  ctx.fillRect(-w * 0.4, -h * 0.075, w * 0.8, h * 0.045);
  ctx.fillStyle = "#e5d7af";
  ctx.fillRect(-w * 0.1, -h * 0.19, w * 0.2, h * 0.1);
  ctx.restore();
}
function tree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  coast: boolean,
) {
  ctx.fillStyle = "#514c3d";
  ctx.fillRect(x - s * 0.045, y - s * 0.75, s * 0.09, s * 0.75);
  if (coast) {
    ctx.fillStyle = "#294c47";
    ctx.beginPath();
    ctx.ellipse(
      x - s * 0.08,
      y - s * 0.79,
      s * 0.47,
      s * 0.22,
      -0.12,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#426555";
    ctx.beginPath();
    ctx.ellipse(
      x + s * 0.09,
      y - s * 0.9,
      s * 0.42,
      s * 0.15,
      -0.1,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else {
    polygon(ctx, "#254c45", [
      x - s * 0.35,
      y - s * 0.2,
      x,
      y - s * 1.25,
      x + s * 0.35,
      y - s * 0.2,
    ]);
    polygon(ctx, "#3c6757", [
      x - s * 0.25,
      y - s * 0.56,
      x,
      y - s * 1.25,
      x + s * 0.04,
      y - s * 0.56,
    ]);
  }
}
export function renderDrive(
  ctx: CanvasRenderingContext2D,
  g: Drive,
  now: number,
  reduced: boolean,
  ghost: Trace[] = [],
  paint = "#e4d9b8",
) {
  const w = 1000,
    h = (ctx.canvas.height / ctx.canvas.width) * w,
    c = courseOf(g),
    night = g.course === "night";
  ctx.setTransform(ctx.canvas.width / w, 0, 0, ctx.canvas.width / w, 0, 0);
  const horizon = h * 0.4,
    shift = curveAt(g.z, c) * 28 - g.x * 10,
    sky = ctx.createLinearGradient(0, 0, 0, horizon + 80);
  sky.addColorStop(0, c.sky[0]);
  sky.addColorStop(1, c.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (night) {
    for (let i = 0; i < 55; i++) {
      ctx.fillStyle = `rgba(234,222,192,${0.25 + (i % 4) * 0.15})`;
      ctx.fillRect(
        (i * 137 + 31) % 1000,
        (i * 53 + 18) % (horizon * 0.8),
        i % 3 === 0 ? 2 : 1,
        2,
      );
    }
  }
  const sunX = w * 0.76 - shift * 0.4,
    sunY = horizon * 0.4;
  const glow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 140);
  glow.addColorStop(0, night ? "#d9d9cc40" : "#f7d99b77");
  glow.addColorStop(1, "#f4d39700");
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = night ? "#e4dec4" : "#f1d39c";
  ctx.beginPath();
  ctx.arc(sunX, sunY, night ? 23 : 42, 0, Math.PI * 2);
  ctx.fill();
  for (let layer = 0; layer < 3; layer++) {
    const pts = [0, horizon + 80];
    for (let x = -60; x <= w + 100; x += 35) {
      const xx = x + shift * (layer + 1) * 0.55;
      const y =
        horizon -
        (35 + layer * 18) -
        Math.sin(xx / 140 + layer * 2) * 35 -
        Math.sin(xx / 58 + layer) * 17;
      pts.push(x, y);
    }
    pts.push(w, horizon + 80);
    polygon(
      ctx,
      night
        ? ["#34384c", "#424055", "#4e4b5c"][layer]
        : g.course === "coast"
          ? ["#9caba0", "#7f9d92", "#648b85"][layer]
          : ["#a5babb", "#799a9d", "#597e80"][layer],
      pts,
    );
  }
  ctx.fillStyle = c.ground[0];
  ctx.fillRect(0, horizon + 25, w, h - horizon);
  if (g.course === "coast") {
    ctx.fillStyle = "#4f969b";
    ctx.fillRect(0, horizon + 16, w * 0.5, h * 0.36);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? "#bad1b539" : "#b7d4be19";
      ctx.fillRect(0, horizon + 26 + i * i * 1.8, w * 0.5, 1 + i * 0.15);
    }
  }
  if (night) {
    for (let i = 0; i < 35; i++) {
      const x = ((i * 41 + shift * 2 + 2000) % 1100) - 50,
        bh = 20 + ((i * 37) % 95);
      ctx.fillStyle = i % 2 ? "#253546" : "#2d3b4d";
      ctx.fillRect(x, horizon - bh, 27, bh + 35);
      ctx.fillStyle = "#e3c79177";
      for (let y = 0; y < bh - 8; y += 12)
        for (let col = 0; col < 3; col++)
          if ((i + col + y) % 3)
            ctx.fillRect(x + 5 + col * 7, horizon - bh + 7 + y, 2, 3);
    }
  }
  const base = Math.floor(g.z / SEGMENT),
    percent = g.z / SEGMENT - base,
    cameraY = hillAt(g.z, c) + 1050;
  let roadX = 0,
    dx = -curveAt(g.z, c) * percent,
    maxY = Infinity;
  const points: Projected[] = [];
  for (let n = 0; n <= 180; n++) {
    const index = base + n,
      z = index * SEGMENT - g.z + 650,
      scale = 1.05 / Math.max(1, z),
      x = w * 0.5 + (roadX - g.x * ROAD_WIDTH) * scale * w * 0.5,
      y = Math.round(
        horizon - (hillAt(index * SEGMENT, c) - cameraY) * scale * h * 0.5,
      ),
      roadW = ROAD_WIDTH * scale * w * 0.5;
    const visible = y < maxY;
    if (visible) maxY = y;
    points.push({ z: index * SEGMENT, x, y, w: roadW, scale, index, visible });
    roadX += dx;
    dx += curveAt(index * SEGMENT, c);
  }
  const gp = ghostAt(ghost, g.elapsed);
  // Far-to-near painting lets nearer hills naturally cover distant road and traffic.
  for (let n = points.length - 2; n >= 0; n--) {
    const a = { ...points[n], y: points[n].y + 0.8 },
      b = points[n + 1];
    if (!a.visible || a.y <= b.y || a.y < horizon - 70) continue;
    const stripe = Math.floor(a.index / 3) % 2;
    if (n < 100)
      polygon(ctx, c.ground[stripe], [0, a.y, w, a.y, w, b.y, 0, b.y]);
    if (g.course === "coast") {
      polygon(ctx, stripe ? "#5d9fa0" : "#619f9e", [
        0,
        a.y,
        a.x - a.w * 1.6,
        a.y,
        b.x - b.w * 1.6,
        b.y,
        0,
        b.y,
      ]);
      polygon(ctx, "#c5b088", [
        a.x - a.w * 1.6,
        a.y,
        a.x - a.w * 1.42,
        a.y,
        b.x - b.w * 1.42,
        b.y,
        b.x - b.w * 1.6,
        b.y,
      ]);
    }
    const rumble = stripe
      ? night
        ? "#cf9da5"
        : "#ead3ad"
      : night
        ? "#566273"
        : "#b36e5a";
    polygon(ctx, rumble, [
      a.x - a.w * 1.12,
      a.y,
      a.x + a.w * 1.12,
      a.y,
      b.x + b.w * 1.12,
      b.y,
      b.x - b.w * 1.12,
      b.y,
    ]);
    polygon(ctx, c.road[stripe], [
      a.x - a.w,
      a.y,
      a.x + a.w,
      a.y,
      b.x + b.w,
      b.y,
      b.x - b.w,
      b.y,
    ]);
    const edge = night ? "#c1b7c2" : "#e5dbbd";
    for (const side of [-1, 1])
      polygon(ctx, edge, [
        a.x + side * a.w * 0.98,
        a.y,
        a.x + side * a.w * 0.958,
        a.y,
        b.x + side * b.w * 0.958,
        b.y,
        b.x + side * b.w * 0.98,
        b.y,
      ]);
    if (stripe)
      for (const side of [-1, 1])
        polygon(ctx, night ? "#b0a1b588" : "#d8d4b6bb", [
          a.x + (side * a.w) / 3 - a.w * 0.008,
          a.y,
          a.x + (side * a.w) / 3 + a.w * 0.008,
          a.y,
          b.x + (side * b.w) / 3 + b.w * 0.008,
          b.y,
          b.x + (side * b.w) / 3 - b.w * 0.008,
          b.y,
        ]);
    if (n % 6 === 0 && n > 2 && n < 140) {
      for (const side of [-1, 1]) {
        const at = a.x + side * a.w * 1.24;
        ctx.fillStyle = night ? "#e5c3a1" : "#e1d7b8";
        ctx.fillRect(
          at,
          a.y - a.w * 0.075,
          Math.max(1, a.w * 0.013),
          a.w * 0.075,
        );
        ctx.fillStyle = "#a96552";
        ctx.fillRect(
          at,
          a.y - a.w * 0.07,
          Math.max(1, a.w * 0.013),
          a.w * 0.025,
        );
      }
    }
    if (a.index % 13 === 0 && n > 4 && n < 145) {
      const side = a.index % 26 === 0 ? -1 : 1;
      tree(
        ctx,
        a.x + side * a.w * (1.55 + (a.index % 3) * 0.2),
        a.y,
        a.w * 0.7,
        g.course === "coast",
      );
    }
    if (a.index % 19 === 0 && n > 6 && n < 140) {
      const side = a.index % 38 === 0 ? -1 : 1;
      polygon(ctx, night ? "#314b51" : "#a08b69", [
        a.x + side * a.w * 1.8,
        a.y,
        a.x + side * a.w * 2.4,
        a.y - a.w * 0.13,
        a.x + side * a.w * 2.8,
        a.y,
      ]);
    }
    for (const carItem of g.traffic) {
      if (carItem.z >= a.z && carItem.z < b.z) {
        const f = (carItem.z - a.z) / SEGMENT,
          yy = a.y + (b.y - a.y) * f,
          ww = a.w + (b.w - a.w) * f,
          xx = a.x + (b.x - a.x) * f;
        car(
          ctx,
          xx + carItem.x * ww,
          yy,
          ww * 0.31,
          carItem.color,
          0,
          false,
          false,
          night,
        );
      }
    }
    if (gp && gp.z >= a.z && gp.z < b.z && gp.z > g.z + 450) {
      const f = (gp.z - a.z) / SEGMENT,
        yy = a.y + (b.y - a.y) * f,
        ww = a.w + (b.w - a.w) * f,
        xx = a.x + (b.x - a.x) * f;
      ctx.save();
      ctx.globalAlpha = 0.32;
      car(ctx, xx + gp.x * ww, yy, ww * 0.31, "#ade2db");
      ctx.restore();
    }
    for (const marker of [c.length / 3, (c.length * 2) / 3, c.length])
      if (marker >= a.z && marker < b.z) {
        const top = a.y - a.w * 0.8;
        ctx.fillStyle = "#e0c9a0";
        ctx.fillRect(a.x - a.w * 1.08, top, a.w * 0.025, a.w * 0.8);
        ctx.fillRect(a.x + a.w * 1.05, top, a.w * 0.025, a.w * 0.8);
        ctx.fillStyle = marker === c.length ? "#e6bb7c" : "#436d66";
        ctx.fillRect(a.x - a.w * 1.08, top, a.w * 2.16, a.w * 0.18);
        if (a.w > 35) {
          ctx.fillStyle = marker === c.length ? "#28363b" : "#f1e1bb";
          ctx.font = `700 ${Math.max(8, a.w * 0.1)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(
            marker === c.length ? "FINISH" : "CHECKPOINT",
            a.x,
            top + a.w * 0.125,
          );
        }
      }
  }
  if (night) {
    const beam = ctx.createRadialGradient(
      w / 2,
      h * 0.88,
      0,
      w / 2,
      h * 0.75,
      w * 0.28,
    );
    beam.addColorStop(0, "#ffe5aa10");
    beam.addColorStop(1, "#ffe5aa00");
    ctx.fillStyle = beam;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
  }
  const shake = reduced ? 0 : g.shake * Math.sin(now / 20) * 6,
    playerX = w * 0.5 + g.steer * 13 + shake,
    playerY =
      h * 0.9 +
      (reduced ? 0 : Math.sin(now / 55) * Math.min(1, g.speed / 7000) * 1.4);
  if (g.drift > 0.2) {
    ctx.save();
    ctx.globalAlpha = g.drift * 0.4;
    ctx.fillStyle = "#d3cfbc";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(
        playerX - g.steer * (35 + i * 8),
        playerY + 8 + i * 5,
        5 + i * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }
  if (g.invincible > 0) ctx.globalAlpha = 0.65 + Math.sin(now / 45) * 0.25;
  car(
    ctx,
    playerX,
    playerY,
    w * 0.19,
    paint,
    g.steer * (1 + g.drift * 2),
    g.speed > 0 && g.events.includes("hit"),
    g.boosting,
    night,
  );
  ctx.globalAlpha = 1;
  if (g.boosting && !reduced) {
    ctx.strokeStyle = "#d3eee044";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1,
        x = w / 2 + side * (w * 0.31 + (i % 3) * 35),
        y = h * 0.4 + ((now * 0.4 + i * 89) % (h * 0.5));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * 22, y + 60);
      ctx.stroke();
    }
  }
  if (g.offroad && g.speed > 1000) {
    ctx.fillStyle = "#d4b98355";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(
        playerX + (i % 2 ? 1 : -1) * (55 + i * 9),
        playerY + 5,
        5 + i * 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    w * 0.2,
    w / 2,
    h / 2,
    w * 0.75,
  );
  vignette.addColorStop(0, "#10233100");
  vignette.addColorStop(1, "#10233177");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  if (g.flash > 0 && !reduced) {
    ctx.fillStyle = `rgba(237,224,177,${g.flash * 0.12})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#f2e6ce";
  ctx.font = "700 13px sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(c.name.toUpperCase(), 27, 32);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#efe4cb88";
  ctx.font = "11px sans-serif";
  ctx.fillText(
    g.phase === "ready"
      ? "YOUR NEXT LITTLE ESCAPE"
      : `${Math.min(100, Math.floor((g.z / c.length) * 100))}% OF THE ROAD`,
    27,
    51,
  );
  // Course ribbon gives a readable preview of upcoming bends.
  ctx.save();
  ctx.translate(w - 48, 30);
  ctx.strokeStyle = "#e8d9bb33";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i <= 35; i++) {
    const z = g.z + i * 600,
      x = curveAt(z, c) * 9,
      y = i * 3;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#f1dba8";
  ctx.beginPath();
  ctx.arc(curveAt(g.z, c) * 9, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (g.messageTime > 0 && g.phase === "racing") {
    ctx.textAlign = "center";
    ctx.font = "700 17px sans-serif";
    ctx.fillStyle = "#142f3ab8";
    ctx.fillRect(w * 0.22, h * 0.19, w * 0.56, 38);
    ctx.fillStyle = "#f6e5c1";
    ctx.fillText(g.message, w / 2, h * 0.19 + 25);
  }
}
