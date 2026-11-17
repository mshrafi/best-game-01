// All sound is synthesised with WebAudio: no audio files, no network.
// Sonar ping, pearl chime, hit thud, a low ambient drone and a win arpeggio.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.droneNodes = null;
    this.muted = false;
  }

  // Browsers only allow audio after a user gesture; call from a key/click.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startDrone();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  startDrone() {
    if (!this.ctx || this.droneNodes) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 48;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 48.7;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc2.start();
      lfo.start();
      this.droneNodes = { osc, osc2, lfo };
    } catch {
      // Drone is ambience only; the game plays fine without it.
    }
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // A failed blip must never break the game loop.
    }
  }

  ping() {
    // Sonar: a bright sine that falls away, with a soft harmonic.
    this.tone(880, 0.9, 'sine', 0.35, 440);
    this.tone(1320, 0.5, 'sine', 0.1, 660);
  }

  chime() {
    // Pearl pickup: two-note sparkle.
    this.tone(1046, 0.25, 'triangle', 0.3);
    setTimeout(() => this.tone(1568, 0.35, 'triangle', 0.25), 70);
  }

  thud() {
    // Hull hit: low noise-ish thump.
    this.tone(120, 0.35, 'sawtooth', 0.4, 45);
    this.tone(70, 0.3, 'sine', 0.5, 35);
  }

  win() {
    // Win arpeggio: C E G C up the scale.
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.5, 'triangle', 0.3), i * 130);
    });
  }

  lose() {
    [392, 311, 233, 175].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.5, 'sine', 0.25), i * 160);
    });
  }
}
