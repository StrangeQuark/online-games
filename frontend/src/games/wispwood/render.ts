import { groveOf, type Wisp } from "./engine";
export function wispViewport(canvas: HTMLCanvasElement) {
  return { width: (720 * canvas.width) / canvas.height, height: 720 };
}
export function wispCamera(g: Wisp, width: number) {
  return Math.max(0, Math.min(groveOf(g).width - width, g.x - width * 0.36));
}
function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#e9da8f00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
  ctx.ellipse(0, -size * 0.4, size * 0.25, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function littleLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lit: boolean,
  time: number,
) {
  if (lit) glow(ctx, x, y, 37, "#f6dc9477");
  ctx.strokeStyle = lit ? "#ddc58a" : "#66816a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 11, 5, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "#856c47";
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 8, 16, 21, 4);
  ctx.fill();
  ctx.fillStyle = lit ? "#f5dfa0" : "#42675b";
  ctx.fillRect(x - 5, y - 5, 10, 14);
  ctx.fillStyle = lit ? "#fff7c5" : "#789976";
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 3, 5 + Math.sin(time * 3) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}
function character(
  ctx: CanvasRenderingContext2D,
  g: Wisp,
  time: number,
  reduced: boolean,
) {
  const speed = Math.min(1, Math.abs(g.vx) / 245),
    bob = g.ground !== null && !reduced ? Math.sin(time * 16) * speed * 1.8 : 0;
  ctx.save();
  ctx.translate(g.x, g.y + bob);
  ctx.scale(g.facing, 1);
  if (g.respawn > 0) ctx.globalAlpha = Math.max(0, 1 - g.respawn / 0.55);
  if (g.dashTime > 0) {
    for (let i = 1; i <= 5; i++) {
      ctx.fillStyle = `rgba(197,231,191,${0.16 - i * 0.025})`;
      ctx.beginPath();
      ctx.ellipse(-i * 13, 0, 16, 21 - i, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  glow(ctx, 0, 0, 45, "#d9e3af28");
  ctx.fillStyle = "#092c3266";
  ctx.beginPath();
  ctx.ellipse(0, 22, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Little leaf cloak, cream hood, and feet that follow the walking rhythm.
  ctx.fillStyle = "#6a9477";
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.quadraticCurveTo(-18, 8, -17 - g.vx * 0.006, 21);
  ctx.quadraticCurveTo(-7, 17, 0, 23);
  ctx.quadraticCurveTo(9, 18, 16, 20);
  ctx.lineTo(11, -8);
  ctx.fill();
  ctx.fillStyle = "#b6c594";
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.quadraticCurveTo(-8, 12, -3, 17);
  ctx.lineTo(2, -5);
  ctx.fill();
  const hood = ctx.createRadialGradient(-5, -12, 2, 0, -7, 20);
  hood.addColorStop(0, "#f6eccb");
  hood.addColorStop(1, "#d4d7b0");
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.moveTo(-15, -6);
  ctx.quadraticCurveTo(-17, -24, -5, -29);
  ctx.quadraticCurveTo(0, -19, 10, -22);
  ctx.quadraticCurveTo(23, -14, 14, 0);
  ctx.quadraticCurveTo(0, 11, -12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#eef0d0";
  ctx.beginPath();
  ctx.ellipse(3, -6, 13, 11, -0.1, 0, Math.PI * 2);
  ctx.fill();
  const blink = Math.sin(time * 0.9) > 0.994;
  ctx.fillStyle = "#345746";
  for (const x of [-2, 8]) {
    ctx.beginPath();
    ctx.ellipse(x, -7, 2, blink ? 0.7 : 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#c8997c55";
  ctx.beginPath();
  ctx.ellipse(11, -1, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2dbb4";
  for (const side of [-1, 1]) {
    const step = reduced ? 0 : Math.sin(time * 16 + side) * speed * 3;
    ctx.beginPath();
    ctx.ellipse(side * 7 + step, 21, 5, 3, -side * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#597e60";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -25);
  ctx.quadraticCurveTo(-13, -33, -5, -36);
  ctx.stroke();
  leaf(ctx, -6, -32, 9, -0.7, "#91b483");
  ctx.restore();
}
export function renderWisp(
  ctx: CanvasRenderingContext2D,
  g: Wisp,
  now: number,
  background: HTMLImageElement | null,
  reduced: boolean,
) {
  const { width: w, height: h } = wispViewport(ctx.canvas),
    camera = wispCamera(g, w),
    grove = groveOf(g),
    time = reduced ? 0 : now / 1000;
  ctx.setTransform(
    ctx.canvas.height / 720,
    0,
    0,
    ctx.canvas.height / 720,
    0,
    0,
  );
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#143039");
  sky.addColorStop(1, "#284c46");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (background?.complete && background.naturalWidth) {
    const scale = Math.max(
        (w + 300) / background.naturalWidth,
        h / background.naturalHeight,
      ),
      bh = background.naturalHeight * scale;
    ctx.globalAlpha = 0.72;
    ctx.drawImage(
      background,
      -camera * 0.045,
      -(bh - h) * 0.28,
      background.naturalWidth * scale,
      bh,
    );
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle =
    g.level > 5 ? "#1e27463b" : g.level > 2 ? "#24433022" : "#12332c22";
  ctx.fillRect(0, 0, w, h);
  // Distant hanging vines and quiet drifting fireflies.
  for (let i = 0; i < 8; i++) {
    const x = ((i * 231 - camera * 0.16 + w * 3) % (w + 240)) - 100;
    ctx.strokeStyle = "#173c3766";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 28, 90, x - 25, 160, x + 10, 230 + (i % 3) * 30);
    ctx.stroke();
    for (let j = 0; j < 6; j++)
      leaf(
        ctx,
        x + Math.sin(j) * 10,
        j * 34 + 30,
        11,
        (j % 2 ? 1 : -1) * 0.8,
        "#3b675044",
      );
  }
  for (let i = 0; i < 28; i++) {
    const x =
        (i * 167 + Math.sin(time * 0.25 + i) * 22 - camera * 0.27 + w * 5) %
        (w + 90),
      y = 80 + ((i * 83) % 500) + Math.sin(time * 0.5 + i) * 9;
    glow(ctx, x, y, 8, "#d5e6a633");
    ctx.fillStyle = `rgba(224,237,177,${0.25 + Math.sin(time + i) * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(-camera, 0);
  for (let i = 0; i < grove.platforms.length; i++) {
    const p = grove.platforms[i];
    if (p.x + p.w < camera - 80 || p.x > camera + w + 80) continue;
    const soil = ctx.createLinearGradient(0, p.y, 0, p.y + 80);
    soil.addColorStop(0, "#3c5041");
    soil.addColorStop(0.55, "#263e37");
    soil.addColorStop(1, "#17332d00");
    ctx.fillStyle = soil;
    ctx.beginPath();
    ctx.moveTo(p.x + 8, p.y + 2);
    ctx.lineTo(p.x + p.w - 7, p.y + 2);
    ctx.quadraticCurveTo(p.x + p.w + 7, p.y + 28, p.x + p.w - 18, p.y + 42);
    for (let x = p.x + p.w - 18; x > p.x + 10; x -= 33)
      ctx.lineTo(x, p.y + 37 + Math.sin(x * 0.1) * 14);
    ctx.lineTo(p.x - 3, p.y + 24);
    ctx.closePath();
    ctx.fill();
    for (let root = 0; root < 4; root++) {
      const x = p.x + 25 + (root * (p.w - 40)) / 4;
      ctx.strokeStyle = "#365246";
      ctx.lineWidth = 3 - root * 0.35;
      ctx.beginPath();
      ctx.moveTo(x, p.y + 25);
      ctx.bezierCurveTo(x + 13, p.y + 43, x - 15, p.y + 55, x + 7, p.y + 73);
      ctx.stroke();
    }
    ctx.fillStyle = p.spring ? "#b5a36a" : "#557c55";
    ctx.beginPath();
    ctx.roundRect(p.x, p.y - 3, p.w, 14, 7);
    ctx.fill();
    ctx.fillStyle = p.spring ? "#e0c789" : "#8cab6f";
    ctx.beginPath();
    ctx.roundRect(p.x + 3, p.y - 4, p.w - 6, 5, 3);
    ctx.fill();
    for (let x = p.x + 9; x < p.x + p.w - 6; x += 14) {
      ctx.strokeStyle = p.spring ? "#dccb8b" : "#88a970";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, p.y - 3);
      ctx.lineTo(x - 3, p.y - 9 - Math.sin(x) * 3);
      ctx.moveTo(x, p.y - 3);
      ctx.lineTo(x + 3, p.y - 7);
      ctx.stroke();
    }
    if (p.spring) {
      for (let j = 0; j < 5; j++) {
        const x = p.x + 30 + (j * (p.w - 60)) / 4;
        glow(ctx, x, p.y - 6, 13, "#e8d28c22");
        ctx.strokeStyle = "#d2c28a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, p.y - 6);
        ctx.lineTo(x, p.y - 19);
        ctx.stroke();
        ctx.fillStyle = "#e1c17b";
        ctx.beginPath();
        ctx.ellipse(x, p.y - 19, 11, 5, -0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (p.checkpoint) {
      const x = p.x + 38;
      ctx.strokeStyle = "#938469";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, p.y);
      ctx.lineTo(x, p.y - 51);
      ctx.quadraticCurveTo(x + 10, p.y - 62, x + 17, p.y - 48);
      ctx.stroke();
      littleLantern(ctx, x + 16, p.y - 38, g.checkpoint.platform >= i, time);
    }
    for (let j = 0; j < 3; j++) {
      const x = p.x + p.w * 0.2 + j * 31;
      if (p.checkpoint && x < p.x + 65) continue;
      leaf(ctx, x, p.y - 2, 9, -0.8, "#7d9c60");
      leaf(ctx, x, p.y - 2, 8, 0.6, "#668b5b");
    }
  }
  for (const thorn of grove.thorns) {
    ctx.strokeStyle = "#b8908177";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#735663";
    for (let i = 0; i < 4; i++) {
      const x = thorn.x + i * 11;
      ctx.beginPath();
      ctx.moveTo(x, thorn.y - 2);
      ctx.lineTo(x + 5, thorn.y - 24);
      ctx.lineTo(x + 11, thorn.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = "#614953";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(thorn.x, thorn.y - 1);
    ctx.lineTo(thorn.x + thorn.w, thorn.y - 1);
    ctx.stroke();
  }
  for (let i = 0; i < grove.lanterns.length; i++) {
    const lantern = grove.lanterns[i];
    if (!g.lanterns.includes(i)) {
      const bob = reduced ? 0 : Math.sin(time * 2 + i) * 4;
      littleLantern(ctx, lantern.x, lantern.y + bob, true, time);
      ctx.fillStyle = "#e1d09a55";
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.arc(
          lantern.x + Math.cos(time + s * 2) * 20,
          lantern.y + Math.sin(time + s * 2) * 17,
          1.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  const gate = grove.exit,
    lit = g.lanterns.length === 3;
  if (lit) glow(ctx, gate.x, gate.y - 45, 93, "#e4d79b44");
  ctx.strokeStyle = "#5a7660";
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(gate.x - 36, gate.y);
  ctx.lineTo(gate.x - 36, gate.y - 56);
  ctx.arc(gate.x, gate.y - 56, 36, Math.PI, 0);
  ctx.lineTo(gate.x + 36, gate.y);
  ctx.stroke();
  ctx.strokeStyle = "#91a27a";
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.fillStyle = lit ? "#d7db9b44" : "#14332d88";
  ctx.beginPath();
  ctx.moveTo(gate.x - 28, gate.y);
  ctx.lineTo(gate.x - 28, gate.y - 55);
  ctx.arc(gate.x, gate.y - 55, 28, Math.PI, 0);
  ctx.lineTo(gate.x + 28, gate.y);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < g.lanterns.length ? "#f0dda0" : "#4e7160";
    ctx.beginPath();
    ctx.arc(
      gate.x - 16 + i * 16,
      gate.y - 67 - (i === 1 ? 5 : 0),
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  leaf(ctx, gate.x - 38, gate.y - 70, 18, -0.8, "#678e65");
  leaf(ctx, gate.x + 38, gate.y - 40, 21, 0.7, "#6c9467");
  character(ctx, g, time, reduced);
  ctx.restore();
  const mist = ctx.createLinearGradient(0, 560, 0, 720);
  mist.addColorStop(0, "#1c373b00");
  mist.addColorStop(1, "#102c39ee");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 560, w, 160);
  // The little lantern compass remains useful after a missed jump or detour.
  ctx.textAlign = "left";
  ctx.fillStyle = "#e1d9b4";
  ctx.font = "700 12px sans-serif";
  ctx.letterSpacing = "1.5px";
  ctx.fillText(
    `${String(g.level + 1).padStart(2, "0")} · ${grove.name.toUpperCase()}`,
    25,
    31,
  );
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#bdcbb277";
  ctx.font = "10px sans-serif";
  ctx.fillText("FOLLOW THE LITTLE LIGHTS", 25, 50);
  const barX = 25,
    barW = w - 50;
  ctx.fillStyle = "#b9c49d22";
  ctx.fillRect(barX, 680, barW, 2);
  ctx.fillStyle = "#c7d6a7";
  ctx.fillRect(barX, 680, (barW * g.x) / grove.width, 2);
  for (let i = 0; i < grove.lanterns.length; i++) {
    ctx.fillStyle = g.lanterns.includes(i) ? "#ead58f" : "#758e78";
    ctx.beginPath();
    ctx.arc(
      barX + (barW * grove.lanterns[i].x) / grove.width,
      681,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#d3c28d";
  ctx.beginPath();
  ctx.arc(barX + (barW * gate.x) / grove.width, 681, 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#d3c28d";
  ctx.stroke();
  if (g.noticeTime > 0 && g.phase === "playing") {
    const font = w < 800 ? 16 : 15;
    ctx.font = `${font}px sans-serif`;
    ctx.textAlign = "center";
    const words = g.notice.split(" "),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      if (ctx.measureText(line + word).width > w - 80) {
        lines.push(line.trim());
        line = "";
      }
      line += word + " ";
    }
    if (line) lines.push(line.trim());
    ctx.fillStyle = "#102e32b8";
    ctx.beginPath();
    ctx.roundRect(25, 79, w - 50, lines.length * 23 + 16, 7);
    ctx.fill();
    ctx.fillStyle = "#deddbc";
    lines.forEach((text, i) => ctx.fillText(text, w / 2, 103 + i * 23));
  }
  if (g.respawn > 0) {
    ctx.fillStyle = `rgba(17,43,44,${Math.sin((g.respawn / 0.55) * Math.PI) * 0.4})`;
    ctx.fillRect(0, 0, w, h);
  }
}
