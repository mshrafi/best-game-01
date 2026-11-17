// ABYSSAL ECHO — game loop, states, collisions and screenshot hooks.
// States: title → playing ⇄ paused → won / lost. Restart any time with R.
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { World, WORLD_H } from './world.js';
import { Player } from './player.js';
import { Sonar } from './sonar.js';
import { Particles, updateEel, updateMine } from './entities.js';
import { Renderer } from './render.js';
import {
  DEPTH_SCORE_PER_M, EEL_TOUCH_R, MINE_RADIUS, PEARLS_TOTAL, PEARL_RADIUS,
  PEARL_SCORE, VIEW_H, VIEW_W, WIN_DEPTH_M, WIN_TIME_BONUS,
} from './config.js';

const canvas = document.getElementById('game');
const ctx2d = canvas.getContext('2d');

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.world = new World(seed);
    this.worldHeight = WORLD_H;
    this.player = new Player(this.world);
    this.sonar = new Sonar();
    this.particles = new Particles();
    this.input = new Input();
    this.sound = new SoundBank();
    this.renderer = new Renderer(canvas);
    this.state = 'title';
    this.time = 0; // run clock (only counts while playing)
    this.score = 0;
    this.bestDepth = 0;
    this.bubbleTimer = 0;
    this.wonAt = 0;
    this.muted = false;
  }

  get pearlCount() {
    return this.player.pearls;
  }

  start() {
    this.world = new World(this.seed);
    this.player = new Player(this.world);
    this.sonar = new Sonar();
    this.particles = new Particles();
    this.state = 'playing';
    this.time = 0;
    this.score = 0;
    this.bestDepth = 0;
    this.sound.ensure();
  }

  restart() {
    this.start();
  }

  fireSonar() {
    if (!this.player.spendSonar()) return;
    this.sonar.fire(this.player.x, this.player.y);
    this.sound.ping();
  }

  computeScore() {
    const depthBonus = Math.floor(this.bestDepth * DEPTH_SCORE_PER_M);
    const timeBonus = this.state === 'won' ? Math.max(0, WIN_TIME_BONUS - Math.floor(this.time) * 5) : 0;
    return this.player.pearls * PEARL_SCORE + depthBonus + timeBonus;
  }

  update(dt) {
    if (this.state === 'playing') {
      this.time += dt;
      this.bestDepth = Math.max(this.bestDepth, this.player.depthM);
      const thrust = this.input.thrustVector();
      this.player.update(dt, thrust);
      this.sonar.update(dt, this.world);
      for (const eel of this.world.eels) updateEel(eel, dt, this.time, this.player, this.world);
      for (const mine of this.world.mines) updateMine(mine, dt, this.time);
      for (const pearl of this.world.pearls) {
        if (pearl.reveal > 0) pearl.reveal -= dt;
      }
      this.world.heart.pulse += dt;
      this.particles.update(dt);
      // Thruster bubbles.
      this.bubbleTimer -= dt;
      if (this.player.thrusting && this.bubbleTimer <= 0) {
        this.particles.bubbles(this.player.x - this.player.facing * 28, this.player.y);
        this.bubbleTimer = 0.18;
      }
      this.checkCollisions();
      if (this.state === 'playing' && this.player.atHeart && this.player.pearls >= PEARLS_TOTAL) {
        this.state = 'won';
        this.wonAt = this.time;
        this.score = this.computeScore();
        this.sound.win();
        this.particles.burst(this.player.x, this.player.y, '#37e6d4', 60, 220);
      } else if (this.state === 'playing') {
        this.score = this.computeScore();
      }
    } else if (this.state === 'title' || this.state === 'won' || this.state === 'lost') {
      // Menus stay alive behind the panel: slow ambient drift.
      this.time += dt;
      this.sonar.update(dt, this.world);
      this.particles.update(dt);
    }
  }

  checkCollisions() {
    const p = this.player;
    // Pearls.
    for (const pearl of this.world.pearls) {
      if (pearl.taken) continue;
      const d = Math.hypot(pearl.x - p.x, pearl.y - p.y);
      if (d < PEARL_RADIUS + p.radius + 6) {
        pearl.taken = true;
        p.collectPearl();
        this.sound.chime();
        this.particles.burst(pearl.x, pearl.y, '#ffd166', 22, 160);
      }
    }
    if (p.invuln > 0) return;
    // Mines.
    for (const mine of this.world.mines) {
      const d = Math.hypot(mine.x - p.x, mine.y - p.y);
      if (d < MINE_RADIUS + p.radius - 4) {
        this.hit('mine', mine.x, mine.y);
        return;
      }
    }
    // Eels.
    for (const eel of this.world.eels) {
      const d = Math.hypot(eel.x - p.x, eel.y - p.y);
      if (d < EEL_TOUCH_R + p.radius - 8) {
        this.hit('eel', eel.x, eel.y);
        return;
      }
    }
  }

  hit(kind, x, y) {
    if (!this.player.takeHit()) return;
    this.sound.thud();
    this.renderer.addShake(1);
    this.particles.burst(x, y, '#ff4d5e', 26, 200);
    // Knock the sub away from the hazard.
    const dx = this.player.x - x;
    const dy = this.player.y - y;
    const d = Math.hypot(dx, dy) || 1;
    this.player.vx += (dx / d) * 260;
    this.player.vy += (dy / d) * 260;
    if (!this.player.alive) {
      this.state = 'lost';
      this.score = this.computeScore();
      this.sound.lose();
    }
  }

  handleKeys() {
    const input = this.input;
    if (input.wasPressed('m', 'M')) {
      this.muted = !this.muted;
      this.sound.setMuted(this.muted);
    }
    if (this.state === 'title') {
      if (input.wasPressed('Enter', ' ', 'Spacebar')) this.start();
    } else if (this.state === 'playing') {
      if (input.wasPressed('p', 'P')) this.state = 'paused';
      if (input.wasPressed('r', 'R')) this.restart();
      if (input.wasPressed(' ', 'Spacebar')) this.fireSonar();
    } else if (this.state === 'paused') {
      if (input.wasPressed('p', 'P', 'Enter')) this.state = 'playing';
      if (input.wasPressed('r', 'R')) this.restart();
    } else if (this.state === 'won' || this.state === 'lost') {
      if (input.wasPressed('r', 'R', 'Enter', ' ')) this.restart();
    }
  }

  // Deterministic screenshot setups, driven by ?shot= and ?seed=.
  // start: title screen. play: mid-game with a sonar ring mid-flight and
  // several pearls, mines and eels lit. end: win screen. lose: game over.
  applyShot(shot, seed) {
    if (shot === 'start') {
      this.state = 'title';
      this.time = 0.4;
    } else if (shot === 'play') {
      this.start();
      // Drop the sub mid-trench with a few pearls already banked.
      const targetDepth = seed === 7 ? 330 : 175;
      this.player.y = targetDepth * 8;
      this.player.x = this.world.wallsAt(this.player.y).centre;
      this.player.pearls = seed === 7 ? 8 : 5;
      this.time = seed === 7 ? 214 : 96;
      this.bestDepth = targetDepth;
      // Keep eels off the sub for the shot: a hit mid-capture would
      // grey out a hull heart and spray hit particles over the frame.
      for (const eel of this.world.eels) {
        const d = Math.hypot(eel.x - this.player.x, eel.y - this.player.y);
        if (d < 320) {
          const push = 320 - d;
          const ang = Math.atan2(eel.y - this.player.y, eel.x - this.player.x);
          eel.x += Math.cos(ang) * push;
          eel.y += Math.sin(ang) * push;
          eel.homeX = eel.x;
          eel.homeY = eel.y;
        }
      }
      this.player.invuln = 3;
      // Fire a ping and let it expand so the ring is big in the shot.
      this.sonar.preset(this.player.x, this.player.y, 250);
      this.sonar.update(0.001, this.world);
      for (const list of [this.world.pearls, this.world.mines, this.world.eels]) {
        for (const item of list) {
          const d = Math.hypot(item.x - this.player.x, item.y - this.player.y);
          if (d < 480) item.reveal = 2.4;
        }
      }
      // A few sparkles near the sub so the frame reads as alive.
      this.particles.burst(this.player.x + 90, this.player.y - 60, '#ffd166', 12, 90);
    } else if (shot === 'end') {
      this.start();
      this.player.pearls = PEARLS_TOTAL;
      for (const pearl of this.world.pearls) pearl.taken = true;
      this.player.y = WIN_DEPTH_M * 8;
      this.player.x = this.world.heart.x;
      this.time = 187;
      this.bestDepth = WIN_DEPTH_M;
      this.state = 'won';
      this.score = this.computeScore();
    } else if (shot === 'lose') {
      this.start();
      this.player.hull = 0;
      this.player.pearls = 4;
      this.time = 132;
      this.bestDepth = 210;
      this.state = 'lost';
      this.score = this.computeScore();
    }
  }

  frame(dt) {
    this.handleKeys();
    this.update(dt);
    this.renderer.draw(this, dt);
    this.input.endFrame();
  }
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || '1') || 1;
  const shot = params.get('shot') || '';
  const game = new Game(seed);
  game.input.attach();
  // Click / tap also starts and pings (mouse players welcome).
  canvas.addEventListener('pointerdown', () => {
    game.sound.ensure();
    if (game.state === 'title') game.start();
    else if (game.state === 'playing') game.fireSonar();
    else if (game.state === 'won' || game.state === 'lost') game.restart();
  });
  if (shot) game.applyShot(shot, seed);
  window.__game = game;
  let last = performance.now();
  let frames = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    game.frame(dt);
    frames += 1;
    if (frames === 5) window.__shotReady = true;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
export { canvas, ctx2d };
