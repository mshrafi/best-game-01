// The trench: cave walls, pearl / mine / eel placement and depth bands.
// Everything is derived from one seed, so the same seed builds the same
// trench every time. Depth grows downward; y is in world pixels.
import { makeRng } from './random.js';
import {
  EEL_COUNT, MINE_COUNT, PEARLS_TOTAL, PX_PER_M, VIEW_W, WIN_DEPTH_M, WORLD_H,
} from './config.js';

export class World {
  constructor(seed) {
    this.seed = seed;
    const rng = makeRng(seed);
    // Smooth wall wobble: a few sine layers with seeded phases.
    this.layers = [];
    for (let i = 0; i < 3; i++) {
      this.layers.push({
        amp: rng.range(40, 110),
        freq: rng.range(0.0006, 0.0016),
        phase: rng.range(0, Math.PI * 2),
      });
    }
    this.centreBase = VIEW_W / 2;
    this.centreDrift = rng.range(40, 120);
    this.centreFreq = rng.range(0.0004, 0.0009);
    this.centrePhase = rng.range(0, Math.PI * 2);

    this.pearls = [];
    this.mines = [];
    this.eels = [];
    this.buildPlacements(rng);
  }

  centreAt(y) {
    return this.centreBase + this.centreDrift * Math.sin(y * this.centreFreq + this.centrePhase);
  }

  halfWidthAt(y) {
    // The trench narrows as it deepens: wide and gentle near the surface,
    // tight and winding near the Trench Heart.
    const depth01 = Math.min(1, y / (WIN_DEPTH_M * PX_PER_M));
    let w = 330 - depth01 * 110;
    for (const layer of this.layers) {
      w += layer.amp * 0.35 * Math.sin(y * layer.freq + layer.phase);
    }
    return Math.max(190, w);
  }

  wallsAt(y) {
    const c = this.centreAt(y);
    const hw = this.halfWidthAt(y);
    return { left: c - hw, right: c + hw, centre: c };
  }

  inWall(x, y) {
    const w = this.wallsAt(y);
    return x < w.left + 8 || x > w.right - 8;
  }

  clampInside(x, y, radius) {
    const w = this.wallsAt(y);
    return Math.max(w.left + radius, Math.min(w.right - radius, x));
  }

  depthMetres(y) {
    return Math.max(0, Math.floor(y / PX_PER_M));
  }

  // Difficulty ramps with depth: deeper bands get more mines and faster eels.
  difficultyAt(y) {
    return Math.min(1, y / (WIN_DEPTH_M * PX_PER_M));
  }

  buildPlacements(rng) {
    // 12 lumin pearls, one per depth band from 35m down to 470m.
    for (let i = 0; i < PEARLS_TOTAL; i++) {
      const bandTop = 35 + (i * (WIN_DEPTH_M - 65)) / PEARLS_TOTAL;
      const y = (bandTop + rng.range(4, 24)) * PX_PER_M;
      const w = this.wallsAt(y);
      this.pearls.push({
        x: rng.range(w.left + 60, w.right - 60),
        y,
        taken: false,
        bob: rng.range(0, Math.PI * 2),
        reveal: 0,
      });
    }
    // Mines: sparse near the surface, dense in the deep.
    for (let i = 0; i < MINE_COUNT; i++) {
      const depth01 = (i / MINE_COUNT) + rng.range(-0.02, 0.06);
      const y = Math.max(60, depth01 * WIN_DEPTH_M) * PX_PER_M + rng.range(-60, 60);
      const w = this.wallsAt(y);
      this.mines.push({
        x: rng.range(w.left + 50, w.right - 50),
        y,
        baseY: y,
        bob: rng.range(0, Math.PI * 2),
        bobSpeed: rng.range(0.4, 1.1),
        reveal: 0,
        drift: rng.range(-8, 8),
      });
    }
    // Eels patrol the middle and deep trench.
    for (let i = 0; i < EEL_COUNT; i++) {
      const y = rng.range(120, WIN_DEPTH_M - 40) * PX_PER_M;
      const w = this.wallsAt(y);
      const x = rng.range(w.left + 90, w.right - 90);
      this.eels.push({
        x,
        y,
        homeX: x,
        homeY: y,
        patrolR: rng.range(60, 140),
        angle: rng.range(0, Math.PI * 2),
        speed: rng.range(0.5, 0.9),
        reveal: 0,
        chasing: false,
        phase: rng.range(0, Math.PI * 2),
      });
    }
    // The Trench Heart waits at the bottom centre.
    const heartY = WIN_DEPTH_M * PX_PER_M;
    const heartW = this.wallsAt(heartY);
    this.heart = { x: heartW.centre, y: heartY, pulse: 0 };
  }
}

export { WORLD_H };
