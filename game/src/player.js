// The submersible LUMEN: thrust physics with inertia, hull, sonar charge
// and pearl count. Movement is smooth on purpose: thrust accelerates, drag
// bleeds speed, and the sub glides a little after you let go.
import {
  DRAG, INVULN_TIME, MAX_HULL, MAX_SPEED, PEARLS_TOTAL, SONAR_COST, SONAR_MAX,
  SONAR_RECHARGE, SUB_RADIUS, THRUST, WIN_DEPTH_M, PX_PER_M,
} from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    const w = this.world.wallsAt(40);
    this.x = w.centre;
    this.y = 40;
    this.vx = 0;
    this.vy = 0;
    this.hull = MAX_HULL;
    this.sonar = SONAR_MAX;
    this.pearls = 0;
    this.invuln = 0;
    this.facing = 1; // 1 right, -1 left
    this.thrusting = false;
    this.radius = SUB_RADIUS;
  }

  get depthM() {
    return Math.max(0, Math.floor(this.y / PX_PER_M));
  }

  get atHeart() {
    return this.y >= WIN_DEPTH_M * PX_PER_M;
  }

  get canPing() {
    return this.sonar >= SONAR_COST;
  }

  update(dt, thrust) {
    this.vx += thrust.x * THRUST * dt;
    this.vy += thrust.y * THRUST * dt;
    const damp = Math.exp(-DRAG * dt);
    this.vx *= damp;
    this.vy *= damp;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Cave walls push back: slide along them, never through them.
    const w = this.world.wallsAt(this.y);
    if (this.x < w.left + this.radius) {
      this.x = w.left + this.radius;
      if (this.vx < 0) this.vx = -this.vx * 0.25;
    }
    if (this.x > w.right - this.radius) {
      this.x = w.right - this.radius;
      if (this.vx > 0) this.vx = -this.vx * 0.25;
    }
    if (this.y < 20) {
      this.y = 20;
      if (this.vy < 0) this.vy = 0;
    }
    if (this.y > WIN_DEPTH_M * PX_PER_M + 40) {
      this.y = WIN_DEPTH_M * PX_PER_M + 40;
      if (this.vy > 0) this.vy = 0;
    }
    if (Math.abs(this.vx) > 12) this.facing = this.vx > 0 ? 1 : -1;
    this.thrusting = thrust.x !== 0 || thrust.y !== 0;
    if (this.sonar < SONAR_MAX) {
      this.sonar = Math.min(SONAR_MAX, this.sonar + SONAR_RECHARGE * dt);
    }
    if (this.invuln > 0) this.invuln -= dt;
  }

  spendSonar() {
    if (!this.canPing) return false;
    this.sonar -= SONAR_COST;
    return true;
  }

  takeHit() {
    if (this.invuln > 0) return false;
    this.hull -= 1;
    this.invuln = INVULN_TIME;
    return true;
  }

  collectPearl() {
    this.pearls = Math.min(PEARLS_TOTAL, this.pearls + 1);
  }

  get alive() {
    return this.hull > 0;
  }
}
