// All canvas drawing: water, cave walls, entities, the sub, the darkness
// that hides them, sonar rings, the HUD and every menu screen.
import {
  MAX_HULL, PALETTE, PEARLS_TOTAL, PEARL_RADIUS, SONAR_MAX, VIEW_H, VIEW_W,
  WIN_DEPTH_M, PX_PER_M,
} from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shake = 0;
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  // World -> screen: camera follows the sub, clamped to the trench.
  cameraY(player, worldH) {
    const target = player.y - VIEW_H * 0.45;
    return Math.max(0, Math.min(worldH - VIEW_H, target));
  }

  draw(game, dt) {
    const ctx = this.ctx;
    const { player, world, sonar, particles, state, time } = game;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.2);
    const camY = this.cameraY(player, game.worldHeight);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 22 : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 22 : 0;

    ctx.save();
    ctx.translate(sx, sy);
    this.drawWater(ctx, camY, player);
    this.drawWalls(ctx, camY, world);
    this.drawHeart(ctx, camY, world, time);
    this.drawPearls(ctx, camY, world, time);
    this.drawMines(ctx, camY, world, time);
    this.drawEels(ctx, camY, world, time);
    this.drawParticles(ctx, camY, particles);
    this.drawSub(ctx, camY, player, time);
    this.drawSonarRings(ctx, camY, sonar);
    this.drawDarkness(ctx, camY, player, sonar);
    ctx.restore();

    if (state === 'playing' || state === 'paused') this.drawHud(ctx, game);
    if (state === 'title') this.drawTitle(ctx, game);
    if (state === 'paused') this.drawPaused(ctx);
    if (state === 'won') this.drawEnd(ctx, game, true);
    if (state === 'lost') this.drawEnd(ctx, game, false);
  }

  drawWater(ctx, camY, player) {
    const depth01 = Math.min(1, player.depthM / WIN_DEPTH_M);
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, PALETTE.waterTop);
    g.addColorStop(1, PALETTE.waterDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Faint light shafts near the surface only.
    if (depth01 < 0.35) {
      ctx.save();
      ctx.globalAlpha = (0.35 - depth01) * 0.35;
      ctx.fillStyle = '#7fd4e8';
      for (let i = 0; i < 4; i++) {
        const x = 180 + i * 280 + Math.sin(camY * 0.001 + i) * 30;
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.lineTo(x + 60, -10);
        ctx.lineTo(x + 20, VIEW_H * 0.6);
        ctx.lineTo(x - 40, VIEW_H * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // Drifting motes of marine snow.
    ctx.save();
    ctx.fillStyle = '#bfe6ef';
    for (let i = 0; i < 46; i++) {
      const px = (i * 173.3 + camY * 0.12) % VIEW_W;
      const py = (i * 97.7 + camY * 0.35) % VIEW_H;
      ctx.globalAlpha = 0.12 + (i % 3) * 0.06;
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.restore();
  }

  drawWalls(ctx, camY, world) {
    ctx.save();
    const step = 16;
    // Left wall.
    ctx.beginPath();
    ctx.moveTo(0, -10);
    for (let sy = -10; sy <= VIEW_H + step; sy += step) {
      const w = world.wallsAt(camY + sy);
      ctx.lineTo(w.left, sy);
    }
    ctx.lineTo(0, VIEW_H + 10);
    ctx.closePath();
    ctx.fillStyle = PALETTE.rock;
    ctx.fill();
    // Right wall.
    ctx.beginPath();
    ctx.moveTo(VIEW_W, -10);
    for (let sy = -10; sy <= VIEW_H + step; sy += step) {
      const w = world.wallsAt(camY + sy);
      ctx.lineTo(w.right, sy);
    }
    ctx.lineTo(VIEW_W, VIEW_H + 10);
    ctx.closePath();
    ctx.fill();
    // Glowing teal rim where the rock meets open water.
    ctx.strokeStyle = PALETTE.rockEdge;
    ctx.lineWidth = 3;
    for (const side of ['left', 'right']) {
      ctx.beginPath();
      for (let sy = -10; sy <= VIEW_H + step; sy += step) {
        const w = world.wallsAt(camY + sy);
        const x = side === 'left' ? w.left : w.right;
        if (sy === -10) ctx.moveTo(x, sy);
        else ctx.lineTo(x, sy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Visibility: an entity is a ghost (alpha 0.12) until sonar lights it.
  visibility(item) {
    return item.reveal > 0 ? Math.min(1, 0.35 + item.reveal * 0.4) : 0.13;
  }

  drawHeart(ctx, camY, world, time) {
    const hx = world.heart.x;
    const hy = world.heart.y - camY;
    if (hy < -120 || hy > VIEW_H + 120) return;
    const pulse = 1 + Math.sin(time * 2.4) * 0.12;
    const glow = ctx.createRadialGradient(hx, hy, 4, hx, hy, 130 * pulse);
    glow.addColorStop(0, 'rgba(55,230,212,0.55)');
    glow.addColorStop(1, 'rgba(55,230,212,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(hx, hy, 130 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#a5fff3';
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(26, -12, 18, 8);
    ctx.quadraticCurveTo(10, 26, 0, 34);
    ctx.quadraticCurveTo(-10, 26, -18, 8);
    ctx.quadraticCurveTo(-26, -12, 0, -34);
    ctx.fill();
    ctx.fillStyle = PALETTE.sonar;
    ctx.beginPath();
    ctx.arc(0, -4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE TRENCH HEART — reach it with 12 pearls', hx, hy + 72);
  }

  drawPearls(ctx, camY, world, time) {
    for (const pearl of world.pearls) {
      if (pearl.taken) continue;
      const py = pearl.y + Math.sin(time * 1.5 + pearl.bob) * 5 - camY;
      if (py < -30 || py > VIEW_H + 30) continue;
      const a = this.visibility(pearl);
      ctx.save();
      ctx.globalAlpha = a;
      const glow = ctx.createRadialGradient(pearl.x, py, 2, pearl.x, py, 34);
      glow.addColorStop(0, 'rgba(255,209,102,0.7)');
      glow.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pearl.x, py, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.pearl;
      ctx.beginPath();
      ctx.arc(pearl.x, py, PEARL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.pearlCore;
      ctx.beginPath();
      ctx.arc(pearl.x - 3, py - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawMines(ctx, camY, world, time) {
    for (const mine of world.mines) {
      const my = mine.y - camY;
      if (my < -40 || my > VIEW_H + 40) continue;
      const a = this.visibility(mine);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(mine.x, my);
      // Spikes.
      ctx.strokeStyle = PALETTE.mine;
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + time * 0.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 12, Math.sin(ang) * 12);
        ctx.lineTo(Math.cos(ang) * 24, Math.sin(ang) * 24);
        ctx.stroke();
      }
      ctx.fillStyle = '#3a0d16';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.mine;
      ctx.beginPath();
      ctx.arc(0, 0, 9 + Math.sin(time * 5 + mine.bob) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd7db';
      ctx.beginPath();
      ctx.arc(-3, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawEels(ctx, camY, world) {
    for (const eel of world.eels) {
      const ey = eel.y - camY;
      if (ey < -60 || ey > VIEW_H + 60) continue;
      const a = this.visibility(eel);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(eel.x, ey);
      // Serpentine body: a sine wave of segments, head first.
      const dir = eel.chasing ? Math.sign(1) : 1;
      ctx.strokeStyle = eel.chasing ? '#ff9d5c' : PALETTE.eel;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const bx = -t * 72 * dir;
        const by = Math.sin(eel.phase - t * 5) * 9 * (0.3 + t);
        if (i === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.stroke();
      // Head + glowing eye.
      ctx.fillStyle = eel.chasing ? '#ff9d5c' : '#a9f0ae';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.eelEye;
      ctx.beginPath();
      ctx.arc(4 * dir, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      if (eel.chasing) {
        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', 0, -22);
      }
      ctx.restore();
    }
  }

  drawParticles(ctx, camY, particles) {
    ctx.save();
    for (const p of particles.list) {
      const py = p.y - camY;
      if (py < -20 || py > VIEW_H + 20) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      if (p.bubble) {
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, py, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(p.x, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawSub(ctx, camY, player, time) {
    const sy = player.y - camY;
    ctx.save();
    ctx.translate(player.x, sy);
    if (player.invuln > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    // Headlamp cone ahead of the sub.
    const lamp = ctx.createLinearGradient(0, 0, player.facing * 190, 0);
    lamp.addColorStop(0, 'rgba(255,244,200,0.20)');
    lamp.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.moveTo(player.facing * 14, -8);
    ctx.lineTo(player.facing * 190, -52);
    ctx.lineTo(player.facing * 190, 52);
    ctx.lineTo(player.facing * 14, 8);
    ctx.closePath();
    ctx.fill();
    // Thruster bubbles when moving.
    if (player.thrusting) {
      ctx.fillStyle = 'rgba(190,230,240,0.7)';
      ctx.beginPath();
      ctx.arc(-player.facing * 26, 4, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hull: rounded body, dome, tail fin, lamp.
    ctx.fillStyle = PALETTE.subHull;
    roundRect(ctx, -24, -13, 48, 26, 12);
    ctx.fill();
    ctx.fillStyle = '#8fd0e8';
    ctx.beginPath();
    ctx.arc(6 * player.facing, -8, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = PALETTE.subAccent;
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.lineTo(-34, -16);
    ctx.lineTo(-34, 16);
    ctx.lineTo(-24, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.arc(26 * player.facing, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#12303f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUMEN', 0, 4);
    ctx.restore();
  }

  drawSonarRings(ctx, camY, sonar) {
    for (const pulse of sonar.pulses) {
      const py = pulse.y - camY;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pulse.alpha);
      ctx.strokeStyle = PALETTE.sonar;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pulse.x, py, pulse.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(55,230,212,0.35)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(pulse.x, py, Math.max(4, pulse.r - 14), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // The dark: a vignette that is thick far from the sub and thin near it,
  // plus a soft glow around every live sonar ring.
  drawDarkness(ctx, camY, player, sonar) {
    const sy = player.y - camY;
    const g = ctx.createRadialGradient(player.x, sy, 60, player.x, sy, 430);
    g.addColorStop(0, 'rgba(1,4,9,0)');
    g.addColorStop(0.55, 'rgba(1,4,9,0.42)');
    g.addColorStop(1, 'rgba(1,4,9,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (const pulse of sonar.pulses) {
      const py = pulse.y - camY;
      const rg = ctx.createRadialGradient(pulse.x, py, pulse.r * 0.4, pulse.x, py, pulse.r);
      rg.addColorStop(0, 'rgba(55,230,212,0)');
      rg.addColorStop(1, `rgba(55,230,212,${0.10 * pulse.alpha})`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(pulse.x, py, pulse.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHud(ctx, game) {
    const { player, time } = game;
    ctx.save();
    // Top bar.
    ctx.fillStyle = 'rgba(2,12,20,0.72)';
    roundRect(ctx, 12, 10, VIEW_W - 24, 64, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(55,230,212,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Depth.
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`DEPTH ${player.depthM}m / ${WIN_DEPTH_M}m`, 28, 30);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('goal: 12 pearls, then reach the Trench Heart at 500m', 28, 56);
    // Hull hearts.
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < MAX_HULL; i++) {
      ctx.fillStyle = i < player.hull ? PALETTE.heart : PALETTE.heartEmpty;
      ctx.fillText('♥', 560 + i * 34, 34);
    }
    ctx.font = '13px sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('HULL', 594, 60);
    // Sonar charge bar.
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SONAR [SPACE]', 700, 24);
    ctx.fillStyle = '#12303f';
    roundRect(ctx, 700, 32, 200, 14, 7);
    ctx.fill();
    ctx.fillStyle = player.canPing ? PALETTE.sonar : '#e8a13a';
    roundRect(ctx, 700, 32, 200 * (player.sonar / SONAR_MAX), 14, 7);
    ctx.fill();
    // Pearls + timer.
    ctx.fillStyle = PALETTE.pearl;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`◉ ${player.pearls}/${PEARLS_TOTAL}`, 1150, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '18px sans-serif';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    ctx.fillText(`⏱ ${mins}:${String(secs).padStart(2, '0')}`, 1150, 56);
    // Controls hint along the bottom.
    ctx.fillStyle = 'rgba(2,12,20,0.6)';
    roundRect(ctx, 12, VIEW_H - 36, 560, 24, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / arrows thrust · SPACE sonar · P pause · R restart · M mute', 22, VIEW_H - 24);
    ctx.restore();
  }

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(2,14,24,0.82)';
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(55,230,212,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawTitle(ctx, game) {
    ctx.save();
    ctx.fillStyle = 'rgba(1,4,9,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.panel(ctx, 290, 110, 700, 560);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sonar;
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('ABYSSAL ECHO', VIEW_W / 2, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px sans-serif';
    ctx.fillText('A deep-sea echolocation game', VIEW_W / 2, 228);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '17px sans-serif';
    const lines = [
      'Pilot the submersible LUMEN down a pitch-dark trench.',
      'The dark hides everything — ping your SONAR to see.',
      'Collect 12 lumin pearls, dodge drifting mines,',
      'and beware the eels: sonar light wakes them up.',
      'Reach the Trench Heart at 500m to win. 3 hull hits sink you.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 285 + i * 28));
    ctx.fillStyle = PALETTE.pearl;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('◉ 12 pearls   ♥ 3 hull   ⏱ beat the clock', VIEW_W / 2, 455);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px sans-serif';
    ctx.fillText('WASD / arrows — thrust      SPACE — sonar ping', VIEW_W / 2, 505);
    ctx.fillText('P — pause      R — restart      M — mute', VIEW_W / 2, 532);
    // Start prompt always visible on the title screen (it is the cover shot).
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('— Press ENTER or SPACE to dive —', VIEW_W / 2, 600);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '14px sans-serif';
    ctx.fillText('Sound on: sonar pings, chimes and a deep ambient drone.', VIEW_W / 2, 640);
    ctx.restore();
  }

  drawPaused(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(1,4,9,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.panel(ctx, 440, 300, 400, 180);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 370);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('P to resume · R to restart', VIEW_W / 2, 420);
    ctx.restore();
  }

  drawEnd(ctx, game, won) {
    ctx.save();
    ctx.fillStyle = won ? 'rgba(1,20,16,0.62)' : 'rgba(24,2,6,0.62)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.panel(ctx, 290, 150, 700, 480);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = PALETTE.sonar;
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('TRENCH HEART REACHED!', VIEW_W / 2, 225);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '22px sans-serif';
      ctx.fillText('LUMEN found all 12 pearls and lit the deep.', VIEW_W / 2, 270);
    } else {
      ctx.fillStyle = PALETTE.mine;
      ctx.font = 'bold 52px sans-serif';
      ctx.fillText('HULL BREACHED', VIEW_W / 2, 225);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '22px sans-serif';
      ctx.fillText('LUMEN sank into the dark.', VIEW_W / 2, 270);
    }
    ctx.fillStyle = PALETTE.pearl;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`SCORE  ${game.score}`, VIEW_W / 2, 340);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '19px sans-serif';
    ctx.fillText(`Pearls  ${game.player.pearls}/${PEARLS_TOTAL}      Depth  ${game.player.depthM}m`, VIEW_W / 2, 385);
    const mins = Math.floor(game.time / 60);
    const secs = Math.floor(game.time % 60);
    ctx.fillText(`Time  ${mins}:${String(secs).padStart(2, '0')}      Best depth  ${game.bestDepth}m`, VIEW_W / 2, 418);
    if (won) {
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '16px sans-serif';
      ctx.fillText('Pearls ×100  +  depth bonus  +  time bonus', VIEW_W / 2, 455);
    } else {
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '16px sans-serif';
      ctx.fillText('Tip: ping little and often — lit eels chase you.', VIEW_W / 2, 455);
    }
    if (Math.floor(game.time * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('— Press R to dive again —', VIEW_W / 2, 530);
    }
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '15px sans-serif';
    ctx.fillText('ENTER also restarts', VIEW_W / 2, 575);
    ctx.restore();
  }
}
