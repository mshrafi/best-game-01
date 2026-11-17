// Eels, mines and pickup particles: how each hazard moves and reacts.
// Eels patrol a loop around their home; a sonar ping that lights them up
// (or a sub that drifts too close) makes them chase. Mines drift and bob.
import { EEL_CHASE_R, EEL_CHASE_SPEED, EEL_SPEED } from './config.js';

export function updateEel(eel, dt, time, player, world) {
  const dx = player.x - eel.x;
  const dy = player.y - eel.y;
  const dist = Math.hypot(dx, dy);
  const lit = eel.reveal > 0;
  eel.chasing = (lit || dist < 110) && dist < EEL_CHASE_R && dist > 1;
  if (eel.chasing) {
    const speed = EEL_CHASE_SPEED * (0.8 + 0.4 * world.difficultyAt(eel.y));
    eel.x += (dx / dist) * speed * dt;
    eel.y += (dy / dist) * speed * dt;
  } else {
    eel.angle += eel.speed * dt;
    const targetX = eel.homeX + Math.cos(eel.angle) * eel.patrolR;
    const targetY = eel.homeY + Math.sin(eel.angle * 1.3) * eel.patrolR * 0.45;
    eel.x += (targetX - eel.x) * Math.min(1, EEL_SPEED * dt * 0.02 + 0.02);
    eel.y += (targetY - eel.y) * Math.min(1, EEL_SPEED * dt * 0.02 + 0.02);
  }
  eel.phase += dt * 6;
  if (eel.reveal > 0) eel.reveal -= dt;
}

export function updateMine(mine, dt, time) {
  mine.bob += mine.bobSpeed * dt;
  mine.y = mine.baseY + Math.sin(mine.bob) * 14;
  mine.x += Math.sin(time * 0.3 + mine.bob) * mine.drift * dt * 0.2;
  if (mine.reveal > 0) mine.reveal -= dt;
}

export class Particles {
  constructor() {
    this.list = [];
  }

  burst(x, y, colour, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1,
        colour,
        size: 2 + Math.random() * 3,
      });
    }
    for (const p of this.list.slice(-count)) p.maxLife = p.life;
  }

  bubbles(x, y) {
    this.list.push({
      x: x + (Math.random() - 0.5) * 14,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: -28 - Math.random() * 22,
      life: 1.4,
      maxLife: 1.4,
      colour: '#9fd8e8',
      size: 1.5 + Math.random() * 2,
      bubble: true,
    });
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  clear() {
    this.list = [];
  }
}
