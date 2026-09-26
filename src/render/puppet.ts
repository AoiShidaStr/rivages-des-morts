import { DynamicTexture, Texture, type Scene } from '@babylonjs/core';
import rigJson from '../data/pantin.json';
import type { Pose } from '../game/types';
import { drawPuppetPart } from './puppetParts';

/**
 * Pantin articulé, façon Wakfu : des morceaux peints (tête, torse, bras…) accrochés à des os et animés
 * par rotation, décrits dans src/data/pantin.json. Il se dessine chaque image dans un canvas qui sert de
 * texture au sprite du personnage : teinte, éclair, miroir et ombre restent ceux des autres sprites.
 * L'équipement porté (arme, casque) est dessiné sur ses os : il se voit en jeu et change avec l'inventaire.
 */

type Key = [number, number];
interface AnimationDef {
  duree: number;
  boucle?: boolean;
  fondu?: number;
  cles: Record<string, Key[]>;
}
interface BoneDef {
  nom: string;
  parent?: string;
  pos: number[];
}
interface DrawEntry {
  os: string;
  piece?: string;
  equipement?: string;
  sombre?: boolean;
}
interface Attachment {
  taille: number;
  prise: number[];
  angle: number;
}
interface RigDef {
  canvas: number[];
  pieds: number[];
  hauteurCorps: number;
  pieces: Record<string, { taille: number[]; pivot: number[] }>;
  os: BoneDef[];
  ordre: DrawEntry[];
  equipements: Record<string, Attachment> & { objets: Record<string, Partial<Attachment>> };
  animations: Record<string, AnimationDef>;
}

const RIG = rigJson as unknown as RigDef;
const DEG = Math.PI / 180;
/** Décalage vertical du bassin, animé comme un os. */
const HIP_DROP = 'y';
const PREVIEW = new URLSearchParams(location.search).has('pantin');

/** Objets équipés, par emplacement (arme, casque…). */
export type Gear = Partial<Record<string, string>>;

export class Puppet {
  readonly texture: DynamicTexture;
  /** Largeur / hauteur du canvas. */
  readonly aspect: number;
  /** Hauteur du canvas dans le monde, et part qui se trouve sous les pieds. */
  readonly height: number;
  readonly below: number;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly gear = new Map<string, { id: string; image: HTMLImageElement | null }>();
  private pose = '';
  private time = 0;
  /** Angles de la dernière image, et ceux d'où part le fondu vers la posture en cours. */
  private angles: Record<string, number> = {};
  private from: Record<string, number> = {};
  private blend = 1;

  private constructor(
    scene: Scene,
    name: string,
    bodyHeight: number,
    private readonly parts: Map<string, CanvasImageSource>,
  ) {
    const [w, h] = RIG.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d')!;
    this.texture = new DynamicTexture(name, canvas, scene, false);
    this.texture.hasAlpha = true;
    this.texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.aspect = w / h;
    this.height = (bodyHeight * h) / RIG.hauteurCorps;
    this.below = (bodyHeight * (h - RIG.pieds[1])) / RIG.hauteurCorps;
  }

  /**
   * Charge les morceaux peints de `public/sprites/pieces/<nom>/`. S'il n'y en a pas, renvoie null, sauf
   * avec `?pantin` dans l'adresse : les morceaux manquants sont alors dessinés à la main (aperçu du pantin).
   */
  static async load(scene: Scene, name: string, bodyHeight: number, force = PREVIEW): Promise<Puppet | null> {
    const base = `${import.meta.env.BASE_URL}sprites/pieces/${name}/`;
    const entries = await Promise.all(
      Object.entries(RIG.pieces).map(async ([piece, def]) => {
        const image = await loadImage(`${base}${piece}.png`);
        return [piece, image ?? drawPuppetPart(piece, def.taille[0], def.taille[1]), Boolean(image)] as const;
      }),
    );
    if (!force && !entries.some(([, , painted]) => painted)) return null;
    const puppet = new Puppet(scene, `puppet-${name}`, bodyHeight, new Map(entries.map(([piece, image]) => [piece, image])));
    puppet.update('idle', 0);
    return puppet;
  }

  /** Objets à dessiner sur le pantin ; leurs icônes se chargent au premier usage. */
  setGear(gear: Gear): void {
    for (const slot of Object.keys(RIG.equipements)) {
      if (slot === 'objets') continue;
      const id = gear[slot];
      const current = this.gear.get(slot);
      if (current?.id === id) continue;
      if (!id) {
        this.gear.delete(slot);
        continue;
      }
      const entry = { id, image: null as HTMLImageElement | null };
      this.gear.set(slot, entry);
      void loadImage(`${import.meta.env.BASE_URL}sprites/icones/${id}.png`).then((image) => (entry.image = image));
    }
  }

  /** Avance l'animation de la posture `pose` et redessine le pantin. */
  update(pose: Pose | string, dt: number): void {
    const name = RIG.animations[pose] ? pose : 'idle';
    const anim = RIG.animations[name];
    if (name !== this.pose) {
      this.pose = name;
      this.time = 0;
      this.from = { ...this.angles };
      this.blend = 0;
    } else {
      this.time += dt;
    }
    const fade = anim.fondu ?? 0.1;
    this.blend = fade > 0 ? Math.min(1, this.blend + dt / fade) : 1;
    const t = anim.boucle ? (this.time / anim.duree) % 1 : Math.min(1, this.time / anim.duree);
    const k = smooth(this.blend);
    const angles: Record<string, number> = {};
    for (const [bone, keys] of Object.entries(anim.cles)) {
      const target = sample(keys, t);
      const start = this.from[bone];
      angles[bone] = start === undefined ? target : start + (target - start) * k;
    }
    // Un os absent de l'animation revient doucement à sa position de repos.
    for (const [bone, start] of Object.entries(this.from)) {
      if (!(bone in angles)) angles[bone] = start * (1 - k);
    }
    this.angles = angles;
    this.draw();
  }

  dispose(): void {
    this.texture.dispose();
  }

  private draw(): void {
    const ctx = this.ctx;
    const [w, h] = RIG.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const world = new Map<string, DOMMatrix>();
    const root = new DOMMatrix().translate(RIG.pieds[0], RIG.pieds[1] + (this.angles[HIP_DROP] ?? 0));
    for (const bone of RIG.os) {
      const parent = bone.parent ? world.get(bone.parent)! : root;
      world.set(bone.nom, parent.translate(bone.pos[0], bone.pos[1]).rotate(this.angles[bone.nom] ?? 0));
    }

    for (const entry of RIG.ordre) {
      const m = world.get(entry.os);
      if (!m) continue;
      ctx.setTransform(m);
      if (entry.piece) {
        const image = this.parts.get(entry.piece);
        const def = RIG.pieces[entry.piece];
        if (!image || !def) continue;
        // La hauteur est celle du morceau dans le pantin ; la largeur suit les proportions de l'image peinte.
        const ph = def.taille[1];
        const pw = (ph * width(image)) / height(image);
        ctx.filter = entry.sombre ? 'brightness(0.72) saturate(0.9)' : 'none';
        ctx.drawImage(image, -def.pivot[0] * pw, -def.pivot[1] * ph, pw, ph);
      } else if (entry.equipement) {
        const worn = this.gear.get(entry.equipement);
        if (!worn?.image) continue;
        const fit = { ...RIG.equipements[entry.equipement], ...RIG.equipements.objets[worn.id] };
        ctx.filter = 'none';
        ctx.rotate(fit.angle * DEG);
        ctx.drawImage(worn.image, -fit.prise[0] * fit.taille, -fit.prise[1] * fit.taille, fit.taille, fit.taille);
      }
    }
    ctx.filter = 'none';
    this.texture.update();
  }
}

/** Angle au temps `t` (de 0 à 1), adouci entre deux clés. */
function sample(keys: Key[], t: number): number {
  if (keys.length === 1 || t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * smooth((t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

const width = (image: CanvasImageSource): number => (image as HTMLImageElement | HTMLCanvasElement).width;
const height = (image: CanvasImageSource): number => (image as HTMLImageElement | HTMLCanvasElement).height;

function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}
