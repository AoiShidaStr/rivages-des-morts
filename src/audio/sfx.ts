// Effets sonores : les sons de src/data/sons.json, joués par Web Audio. Un son vient de fichiers (packs Kenney, CC0,
// dans public/audio/sfx) ou, en attendant un vrai fichier, d'une synthèse aux couleurs du Japon ancien : cloche de
// temple (kane), koto pincé, claquoir hyōshigi, taiko. Le volume et la coupure suivent les réglages de la musique.
//
// Les boutons de l'interface cliquent tout seuls ; un bouton qui porte `data-sfx="forge.upgrade"` joue ce son à la
// place, et `data-sfx="none"` aucun.
import data from '../data/sons.json';
import type { MusicSettings } from './music';

type SynthDef =
  | { type: 'bell'; freq: number; decay: number }
  | { type: 'koto'; notes: number[] }
  | { type: 'hyoshigi' }
  | { type: 'taiko'; freq: number; roll?: number };

interface SoundDef {
  files?: string[];
  synth?: SynthDef;
  volume?: number;
  /** Variation aléatoire de hauteur : 0,1 = ±10 %. */
  pitch?: number;
  /** Vitesse de lecture de base (plus aigu au-dessus de 1). */
  rate?: number;
  /** Un second son joué juste après (la cloche après le marteau de la forge). */
  then?: string;
}

export type SoundId = keyof typeof data.sounds;

/** Les effets du jeu (un seul) : l'interface les joue par `playSound` sans avoir à les recevoir. */
let current: Sfx | null = null;

export function playSound(id: SoundId | string, volume = 1): void {
  current?.play(id, volume);
}

const SOUNDS = data.sounds as Record<string, SoundDef>;
/** Un même son n'est pas rejoué plus souvent que ça (secondes) : dix coups au même instant ne font qu'un bruit. */
const MIN_GAP = 0.045;
/** Délai entre un son et celui qui le suit (`then`). */
const THEN_DELAY = 0.12;

export class Sfx {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly lastPlayed = new Map<string, number>();

  constructor(private readonly settings: MusicSettings) {
    current = this;
    // Le navigateur n'ouvre le son qu'après un geste du joueur.
    const unlock = () => {
      this.ensure();
      void this.context?.resume();
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    // Les boutons de l'interface (menus, panneaux, dialogues) cliquent.
    document.addEventListener(
      'click',
      (e) => {
        const button = (e.target as HTMLElement | null)?.closest?.('button');
        if (!button || (button as HTMLButtonElement).disabled) return;
        const sound = button.dataset.sfx ?? 'ui.click';
        if (sound !== 'none') this.play(sound);
      },
      true,
    );
  }

  /** Joue un son par son identifiant (src/data/sons.json). Sans effet tant que le son est coupé ou le contexte fermé. */
  play(id: string, volume = 1): void {
    const def = SOUNDS[id];
    const ctx = this.ensure();
    if (!def || !ctx || !this.output || this.settings.sfxMuted || this.settings.sfxVolume <= 0) return;
    this.refresh();
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -1) < MIN_GAP) return;
    this.lastPlayed.set(id, now);
    const gain = (def.volume ?? 1) * volume;
    if (def.synth) this.synth(ctx, def.synth, gain, now);
    else if (def.files?.length) void this.playFile(ctx, def, gain);
    if (def.then) window.setTimeout(() => this.play(def.then as string, volume), THEN_DELAY * 1000);
  }

  /** Le volume a changé dans les réglages. */
  refresh(): void {
    if (this.output) this.output.gain.value = this.settings.sfxMuted ? 0 : this.settings.sfxVolume;
  }

  private ensure(): AudioContext | null {
    if (this.context) return this.context;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.context = new Ctor();
    } catch {
      return null;
    }
    this.output = this.context.createGain();
    this.output.connect(this.context.destination);
    this.refresh();
    return this.context;
  }

  private load(ctx: AudioContext, file: string): Promise<AudioBuffer | null> {
    let buffer = this.buffers.get(file);
    if (!buffer) {
      buffer = fetch(`${import.meta.env.BASE_URL}audio/sfx/${file}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file))))
        .then((bytes) => ctx.decodeAudioData(bytes))
        .catch(() => null);
      this.buffers.set(file, buffer);
    }
    return buffer;
  }

  private async playFile(ctx: AudioContext, def: SoundDef, gain: number): Promise<void> {
    const files = def.files ?? [];
    const buffer = await this.load(ctx, files[Math.floor(Math.random() * files.length)]);
    if (!buffer || !this.output) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = (def.rate ?? 1) * (1 + (Math.random() * 2 - 1) * (def.pitch ?? 0));
    const level = ctx.createGain();
    level.gain.value = gain;
    source.connect(level).connect(this.output);
    source.start();
  }

  // --- Sons synthétisés -----------------------------------------------------------

  private synth(ctx: AudioContext, def: SynthDef, gain: number, at: number): void {
    switch (def.type) {
      case 'bell':
        return this.bell(ctx, def.freq, def.decay, gain, at);
      case 'koto':
        def.notes.forEach((freq, i) => this.koto(ctx, freq, gain, at + i * 0.11));
        return;
      case 'hyoshigi':
        this.clap(ctx, gain, at);
        this.clap(ctx, gain * 0.85, at + 0.16);
        return;
      case 'taiko':
        for (let i = 0; i < (def.roll ?? 1); i++) this.drum(ctx, def.freq, gain * (1 - i * 0.15), at + i * 0.14);
        return;
    }
  }

  /** Une voix qui s'éteint en `decay` secondes. */
  private envelope(ctx: AudioContext, gain: number, at: number, decay: number, attack = 0.004): GainNode {
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    env.connect(this.output as GainNode);
    return env;
  }

  /** Cloche de temple : des partiels inharmoniques, les aigus s'éteignant plus vite que le fondamental. */
  private bell(ctx: AudioContext, freq: number, decay: number, gain: number, at: number): void {
    const partials: [number, number, number][] = [
      [1, 1, 1],
      [2.76, 0.5, 0.6],
      [5.4, 0.25, 0.35],
      [8.93, 0.12, 0.2],
    ];
    for (const [ratio, level, life] of partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      osc.connect(this.envelope(ctx, gain * level, at, decay * life));
      osc.start(at);
      osc.stop(at + decay * life + 0.05);
    }
  }

  /** Corde de koto pincée : une corde de Karplus-Strong (bruit filtré qui boucle sur sa propre période). */
  private koto(ctx: AudioContext, freq: number, gain: number, at: number): void {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * 1.6);
    const buffer = ctx.createBuffer(1, length, rate);
    const out = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / freq));
    const ring = new Float32Array(period).map(() => Math.random() * 2 - 1);
    for (let i = 0; i < length; i++) {
      const j = i % period;
      const next = ring[(j + 1) % period];
      out[i] = ring[j];
      ring[j] = (ring[j] + next) * 0.4985;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = freq * 6;
    source.connect(tone).connect(this.envelope(ctx, gain, at, 1.5, 0.002));
    source.start(at);
  }

  /** Claquoir hyōshigi : un claquement de bois sec, bruit très court et résonance aiguë. */
  private clap(ctx: AudioContext, gain: number, at: number): void {
    const noise = this.noise(ctx, 0.06);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2400;
    band.Q.value = 6;
    noise.connect(band).connect(this.envelope(ctx, gain, at, 0.07, 0.001));
    noise.start(at);
    const knock = ctx.createOscillator();
    knock.frequency.value = 1350;
    knock.connect(this.envelope(ctx, gain * 0.5, at, 0.09, 0.001));
    knock.start(at);
    knock.stop(at + 0.12);
  }

  /** Coup de taiko : un grave qui chute, et le claquement de la peau. */
  private drum(ctx: AudioContext, freq: number, gain: number, at: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.8, at);
    osc.frequency.exponentialRampToValueAtTime(freq, at + 0.12);
    osc.connect(this.envelope(ctx, gain, at, 0.7, 0.003));
    osc.start(at);
    osc.stop(at + 0.75);
    const skin = this.noise(ctx, 0.08);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    skin.connect(low).connect(this.envelope(ctx, gain * 0.5, at, 0.1, 0.001));
    skin.start(at);
  }

  private noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}
