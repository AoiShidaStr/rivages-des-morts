// Les sons courts synthétisés au vol (Web Audio) : ils jouent tant que le fichier d'un son n'est pas produit
// (public/audio/sfx/<id>-1.mp3). Gratuits, sans fichier, et chacun varie un peu à chaque joue pour ne pas lasser.
// Dès qu'un fichier existe pour un son, il passe devant (src/audio/sfx.ts).
import type { SfxId } from './sfx';

type Wave = OscillatorType;

interface Tone {
  wave: Wave;
  /** Fréquence de départ et d'arrivée (Hz) : un glissement exponentiel entre les deux. */
  from: number;
  to?: number;
  at?: number;
  dur: number;
  gain: number;
}

interface Noise {
  filter: BiquadFilterType;
  freq: number;
  q?: number;
  at?: number;
  dur: number;
  gain: number;
}

interface Recipe {
  tones?: Tone[];
  noises?: Noise[];
}

/** Les recettes : un tambour pour la vague, une clochette pour la parade, trois notes de koto pour le butin… */
const RECIPES: Record<SfxId, Recipe> = {
  coup: {
    noises: [{ filter: 'bandpass', freq: 1400, q: 1.2, dur: 0.07, gain: 0.5 }],
    tones: [{ wave: 'sine', from: 150, to: 55, dur: 0.09, gain: 0.55 }],
  },
  crit: {
    noises: [{ filter: 'bandpass', freq: 1800, q: 1, dur: 0.09, gain: 0.55 }],
    tones: [
      { wave: 'sine', from: 170, to: 50, dur: 0.12, gain: 0.6 },
      { wave: 'triangle', from: 900, to: 1500, at: 0.02, dur: 0.2, gain: 0.22 },
    ],
  },
  recu: {
    noises: [{ filter: 'lowpass', freq: 500, dur: 0.14, gain: 0.55 }],
    tones: [{ wave: 'sine', from: 110, to: 45, dur: 0.16, gain: 0.6 }],
  },
  garde: {
    noises: [{ filter: 'bandpass', freq: 2600, q: 3, dur: 0.1, gain: 0.35 }],
    tones: [
      { wave: 'square', from: 620, to: 540, dur: 0.06, gain: 0.08 },
      { wave: 'triangle', from: 1240, dur: 0.18, gain: 0.12 },
    ],
  },
  parade: {
    tones: [
      { wave: 'sine', from: 1760, dur: 0.6, gain: 0.25 },
      { wave: 'sine', from: 2637, dur: 0.45, gain: 0.14 },
      { wave: 'triangle', from: 3520, dur: 0.12, gain: 0.08 },
    ],
  },
  vague: {
    tones: [{ wave: 'sine', from: 80, to: 42, dur: 0.7, gain: 0.8 }],
    noises: [{ filter: 'lowpass', freq: 220, dur: 0.25, gain: 0.5 }],
  },
  'a-terre': {
    tones: [
      { wave: 'triangle', from: 420, to: 110, dur: 0.6, gain: 0.3 },
      { wave: 'sine', from: 210, to: 60, at: 0.05, dur: 0.6, gain: 0.3 },
    ],
  },
  releve: {
    tones: [
      { wave: 'sine', from: 480, to: 900, dur: 0.3, gain: 0.22 },
      { wave: 'sine', from: 1320, at: 0.22, dur: 0.5, gain: 0.18 },
    ],
  },
  butin: {
    tones: [
      { wave: 'triangle', from: 659, at: 0, dur: 0.35, gain: 0.25 },
      { wave: 'triangle', from: 880, at: 0.09, dur: 0.35, gain: 0.25 },
      { wave: 'triangle', from: 988, at: 0.18, dur: 0.5, gain: 0.25 },
    ],
  },
};

export class Synth {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /** Joue la recette `id`, au volume `volume` (0 à 1), un peu désaccordée au hasard. */
  play(id: SfxId, volume: number): void {
    const recipe = RECIPES[id];
    if (!recipe || volume <= 0) return;
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime + 0.005;
    const detune = 0.94 + Math.random() * 0.12;
    const out = ctx.createGain();
    out.gain.value = volume * 0.6;
    out.connect(ctx.destination);
    for (const t of recipe.tones ?? []) this.tone(ctx, out, t, now, detune);
    for (const n of recipe.noises ?? []) this.noise(ctx, out, n, now, detune);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
    } catch {
      return null;
    }
    return this.ctx;
  }

  private envelope(ctx: AudioContext, gain: number, start: number, dur: number): GainNode {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.01, dur / 4));
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    return env;
  }

  private tone(ctx: AudioContext, out: AudioNode, t: Tone, now: number, detune: number): void {
    const start = now + (t.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = t.wave;
    osc.frequency.setValueAtTime(t.from * detune, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to * detune, start + t.dur);
    const env = this.envelope(ctx, t.gain, start, t.dur);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }

  private noise(ctx: AudioContext, out: AudioNode, n: Noise, now: number, detune: number): void {
    const start = now + (n.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer ??= this.makeNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = n.filter;
    filter.frequency.value = n.freq * detune;
    if (n.q) filter.Q.value = n.q;
    const env = this.envelope(ctx, n.gain, start, n.dur);
    src.connect(filter).connect(env).connect(out);
    src.start(start);
    src.stop(start + n.dur + 0.02);
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
