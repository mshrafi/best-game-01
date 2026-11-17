// Keyboard state: held keys plus edge-triggered "just pressed" events,
// so a tap of Space fires one sonar ping and a tap of P pauses once.
export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.anyKey = false;
    this.onKeyDown = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(key);
      this.held.add(key);
      this.anyKey = true;
    };
    this.onKeyUp = (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.held.delete(key);
    };
    this.onBlur = () => {
      this.held.clear();
    };
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  isDown(...keys) {
    return keys.some((k) => this.held.has(k));
  }

  wasPressed(...keys) {
    return keys.some((k) => this.pressed.has(k));
  }

  // Thrust direction from WASD / arrows, normalised.
  thrustVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('a', 'ArrowLeft')) x -= 1;
    if (this.isDown('d', 'ArrowRight')) x += 1;
    if (this.isDown('w', 'ArrowUp')) y -= 1;
    if (this.isDown('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.anyKey = false;
  }
}
