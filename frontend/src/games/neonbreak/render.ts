import {
  COLORS,
  HEIGHT,
  PADDLE_Y,
  WIDTH,
  type Breaker,
  type Power,
} from "./engine";
const powerGlyph: Record<Power, string> = {
  wide: "↔",
  multi: "×3",
  slow: "◷",
  shield: "⌒",
  laser: "Ⅱ",
};
export function renderBreaker(
  ctx: CanvasRenderingContext2D,
  g: Breaker,
  time: number,
  reduced = false,
) {
  ctx.save();
  const scale = ctx.canvas.width / WIDTH;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = "#081321";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const background = ctx.createRadialGradient(450, 160, 0, 450, 240, 650);
  background.addColorStop(0, "#1b2445");
  background.addColorStop(0.55, "#101b2f");
  background.addColorStop(1, "#071522");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#78a9b309";
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 35);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 40; y < HEIGHT; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  for (let i = 0; i < 55; i++) {
    const x = (i * 137.51 + 27) % WIDTH,
      y = (i * 81.7 + 17) % HEIGHT;
    ctx.globalAlpha = 0.15 + 0.17 * Math.sin(i + time * 0.0004);
    ctx.fillStyle = "#cee7f0";
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#99bbcf19";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(8, 35, WIDTH - 16, HEIGHT - 46, 12);
  ctx.stroke();
  ctx.fillStyle = "#86a2b4";
  ctx.font = '10px "DM Sans", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("AFTERHOURS / NEON BREAK", 25, 23);
  ctx.textAlign = "right";
  ctx.fillText(
    `SECTOR ${String(g.stage + 1).padStart(2, "0")} / 08`,
    WIDTH - 25,
    23,
  );
  if (!reduced && g.shake > 0)
    ctx.translate(
      Math.sin(time * 0.12) * g.shake,
      Math.cos(time * 0.15) * g.shake * 0.5,
    );
  for (const brick of g.bricks) {
    if (brick.hp <= 0) continue;
    const color = COLORS[brick.color];
    ctx.shadowColor = color;
    ctx.shadowBlur = brick.hit > 0 ? 22 : 8;
    ctx.fillStyle = brick.hit > 0 ? "#ffffff" : color;
    ctx.globalAlpha = brick.hp === 1 ? 0.92 : 0.73;
    ctx.beginPath();
    ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    const shine = ctx.createLinearGradient(0, brick.y, 0, brick.y + brick.h);
    shine.addColorStop(0, "#ffffff38");
    shine.addColorStop(0.3, "#ffffff08");
    shine.addColorStop(1, "#00000028");
    ctx.fillStyle = shine;
    ctx.fill();
    ctx.strokeStyle = "#ffffff45";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(brick.x + 5, brick.y + 2);
    ctx.lineTo(brick.x + brick.w - 5, brick.y + 2);
    ctx.stroke();
    if (brick.hp > 1) {
      ctx.fillStyle = "#07162470";
      for (let i = 0; i < brick.hp; i++)
        ctx.fillRect(
          brick.x + brick.w / 2 - ((brick.hp - 1) * 6) / 2 + i * 6 - 1.5,
          brick.y + brick.h / 2 - 1.5,
          3,
          3,
        );
    }
    if (brick.blast) {
      ctx.strokeStyle = "#ffffffbb";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(brick.x + brick.w / 2, brick.y + 5);
      ctx.lineTo(brick.x + brick.w / 2 + 6, brick.y + 12);
      ctx.lineTo(brick.x + brick.w / 2, brick.y + 19);
      ctx.lineTo(brick.x + brick.w / 2 - 6, brick.y + 12);
      ctx.closePath();
      ctx.stroke();
    }
  }
  for (const particle of g.particles) {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = COLORS[particle.color];
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
  for (const drop of g.drops) {
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.shadowColor = "#8de9d5";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#183a42";
    ctx.strokeStyle = "#8de9d5";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-17, -12, 34, 24, 7);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e5fff0";
    ctx.font = 'bold 17px "DM Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(powerGlyph[drop.kind], 0, 6);
    ctx.restore();
  }
  if (g.shields > 0) {
    ctx.strokeStyle = "#8cbcff";
    ctx.shadowColor = "#8cbcff";
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(18, HEIGHT - 20);
    for (let x = 18; x < WIDTH - 18; x += 6)
      ctx.lineTo(x, HEIGHT - 20 + Math.sin(x * 0.025 + time * 0.003) * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  for (const beam of g.beams) {
    ctx.shadowColor = "#ffbd9c";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#fff4c6";
    ctx.fillRect(beam.x - 2, beam.y, 4, 17);
  }
  ctx.shadowBlur = 0;
  const pw = g.paddleWidth;
  ctx.shadowColor = g.laser > 0 ? "#ffac98" : "#7de7ce";
  ctx.shadowBlur = 22;
  ctx.fillStyle = g.laser > 0 ? "#ffb8a0" : "#a7edda";
  ctx.beginPath();
  ctx.roundRect(g.paddle - pw / 2, PADDLE_Y, pw, 13, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#e4fff1";
  ctx.beginPath();
  ctx.roundRect(g.paddle - pw / 2 + 9, PADDLE_Y + 2, pw - 18, 3, 2);
  ctx.fill();
  ctx.fillStyle = "#357e79";
  ctx.fillRect(g.paddle - 15, PADDLE_Y + 7, 30, 2);
  for (const b of g.balls) {
    for (let i = b.trail.length - 1; i >= 0; i--) {
      ctx.globalAlpha = (1 - i / 10) * 0.28;
      ctx.fillStyle = g.slow > 0 ? "#c7a6ff" : "#89e9df";
      ctx.beginPath();
      ctx.arc(b.trail[i].x, b.trail[i].y, 7 * (1 - i / 13), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#acecff";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#faffef";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (g.combo >= 4 && g.phase === "playing") {
    ctx.textAlign = "center";
    ctx.font = 'bold 27px "Manrope", sans-serif';
    ctx.fillStyle = "#f5d6a0";
    ctx.globalAlpha = 0.8;
    ctx.fillText(
      `${Math.min(8, 1 + Math.floor(g.combo / 4))}× COMBO`,
      WIDTH / 2,
      HEIGHT * 0.67,
    );
    ctx.font = '11px "DM Sans", sans-serif';
    ctx.fillStyle = "#a8bfce";
    ctx.fillText(
      `${g.combo} consecutive breaks`,
      WIDTH / 2,
      HEIGHT * 0.67 + 21,
    );
    ctx.globalAlpha = 1;
  }
  if (g.noticeTime > 0 && g.phase === "playing") {
    ctx.globalAlpha = Math.min(1, g.noticeTime);
    ctx.textAlign = "center";
    ctx.font = 'bold 12px "DM Sans", sans-serif';
    ctx.fillStyle = "#dbe8de";
    ctx.fillText(g.notice, WIDTH / 2, HEIGHT - 28);
    ctx.globalAlpha = 1;
  }
  if (g.phase === "ready") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#b4d5dc";
    ctx.font = '12px "DM Sans", sans-serif';
    ctx.fillText(
      "MOVE YOUR PADDLE · CLICK OR PRESS SPACE TO LAUNCH",
      WIDTH / 2,
      PADDLE_Y - 43,
    );
  }
  if (g.flash > 0 && !reduced) {
    ctx.globalAlpha = g.flash;
    ctx.fillStyle = "#b9e8fc";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
