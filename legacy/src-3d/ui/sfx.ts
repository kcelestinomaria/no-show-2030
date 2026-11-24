/**
 * Tiny synthesized sound kit. No files: every sound is a few oscillators
 * shaped with an envelope. Off until the player turns it on, and remembered.
 */

const KEY = 'ns2030.sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let on = read();
const subs = new Set<(v: boolean) => void>();

function read() {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return false;
  }
}

function audio() {
  if (!on) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; at?: number; gain?: number; to?: number } = {}) {
  const a = audio();
  if (!a || !master) return;
  const t0 = a.currentTime + (opts.at ?? 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.5, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, opts: { at?: number; gain?: number; from?: number; to?: number } = {}) {
  const a = audio();
  if (!a || !master) return;
  const t0 = a.currentTime + (opts.at ?? 0);
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(opts.from ?? 400, t0);
  f.frequency.exponentialRampToValueAtTime(opts.to ?? 2400, t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.35, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  get on() {
    return on;
  },
  toggle() {
    on = !on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* private mode: the choice lasts this visit */
    }
    subs.forEach((f) => f(on));
    if (on) sfx.tick();
  },
  subscribe(f: (v: boolean) => void) {
    subs.add(f);
    return () => void subs.delete(f);
  },

  tick: () => tone(880, 0.07, { type: 'triangle', gain: 0.25 }),
  untick: () => tone(600, 0.07, { type: 'triangle', gain: 0.2 }),
  bump: () => tone(140, 0.16, { type: 'square', gain: 0.18, to: 90 }),
  click: () => tone(1200, 0.05, { type: 'sine', gain: 0.2 }),
  back: () => {
    tone(392, 0.12, { type: 'triangle', gain: 0.3 });
    tone(587, 0.18, { type: 'triangle', gain: 0.3, at: 0.08 });
  },
  lean: () => {
    tone(330, 0.1, { type: 'sine', gain: 0.25 });
    tone(392, 0.16, { type: 'sine', gain: 0.25, at: 0.07 });
  },
  run: () => {
    noise(0.9, { from: 200, to: 1800, gain: 0.25 });
    tone(110, 0.6, { type: 'sawtooth', gain: 0.08, to: 220 });
  },
  coin: (i = 0) => {
    tone(988, 0.08, { type: 'square', gain: 0.12, at: i * 0.11 });
    tone(1319, 0.22, { type: 'square', gain: 0.12, at: i * 0.11 + 0.07 });
  },
  thud: (i = 0) => tone(90, 0.3, { type: 'sine', gain: 0.6, to: 45, at: i * 0.11 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.28, at: i * 0.09 })),
  miss: () => [392, 349, 294].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.22, at: i * 0.13 })),
  paper: () => noise(0.25, { from: 2500, to: 600, gain: 0.2 }),
  showed: (i = 0) => tone(784, 0.14, { type: 'sine', gain: 0.22, at: i * 0.12 }),
  noshow: (i = 0) => tone(220, 0.2, { type: 'sine', gain: 0.25, to: 180, at: i * 0.12 }),
};
