// Sonar pulses: expanding rings that light up whatever they pass over.
// An entity stays visible for a while after a ring touches it, then fades
// back into the dark. That is the whole game: ping, see, move, repeat.
import { REVEAL_TIME, SONAR_MAX_R, SONAR_SPEED } from './config.js';

export class Sonar {
  constructor() {
    this.pulses = [];
  }

  fire(x, y) {
    this.pulses.push({ x, y, r: 10, alpha: 1 });
  }

  // Instantly place a mid-flight ring (used by the play screenshot hook).
  preset(x, y, radius) {
    this.pulses.push({ x, y, r: radius, alpha: 0.85 });
  }

  update(dt, world) {
    for (const pulse of this.pulses) {
      const prevR = pulse.r;
      pulse.r += SONAR_SPEED * dt;
      pulse.alpha = Math.max(0, 1 - pulse.r / SONAR_MAX_R);
      // Anything the ring front just crossed lights up.
      const reveal = (list) => {
        for (const item of list) {
          if (item.taken) continue;
          const d = Math.hypot(item.x - pulse.x, item.y - pulse.y);
          if (d <= pulse.r && d > prevR - 40) item.reveal = REVEAL_TIME;
        }
      };
      reveal(world.pearls);
      reveal(world.mines);
      reveal(world.eels);
    }
    this.pulses = this.pulses.filter((p) => p.r < SONAR_MAX_R && p.alpha > 0);
  }

  clear() {
    this.pulses = [];
  }
}
