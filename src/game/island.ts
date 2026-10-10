import { add, distance, length, normalize, scale, sub, vec, type Vec2 } from './math';
import type { Condition, Progress } from './progress';

/** Position en coordonnées d'écran : u vers la droite, v vers le haut (voir src/data/island.json). */
export interface ScreenPoint {
  u: number;
  v: number;
}

export interface Circle extends ScreenPoint {
  r: number;
}

export interface Area extends Circle {
  id: string;
  name: string;
}

export interface PropDef extends ScreenPoint {
  sprite: string;
  height?: number;
  solid?: number;
}

export interface InteractableDef extends ScreenPoint {
  id: string;
  name: string;
  nameIf?: { if: Condition[]; name: string }[];
  verb?: string;
  /** Verbe qui remplace `verb` sous condition (le Grand Rocher ouvert : « Descendre »). */
  verbIf?: { if: Condition[]; verb: string }[];
  sprite?: string;
  /** Image qui remplace `sprite` sous condition (lanterne allumée…). */
  spriteIf?: { if: Condition[]; sprite: string }[];
  /** Dialogue à jouer (par défaut, celui qui porte l'identifiant de l'objet). */
  dialogue?: string;
  solid?: number;
  reach?: number;
  if?: Condition[];
}

/** Polygone en coordonnées d'écran : une suite de points [u, v]. */
export type Polygon = [number, number][];

/** La carte peinte de l'île : une image vue par la caméra du jeu, posée au sol. */
export interface IslandMap {
  /** Image, depuis public/sprites. */
  image: string;
  /** Largeur de l'image dans le monde ; sa hauteur à l'écran suit ses proportions. */
  width: number;
  /** La même en petit (npm run sols) : le code y lit l'eau et l'herbe sans décoder la grande. */
  sample?: string;
}

/** Repères peints sur la carte, pour poser les décors (src/render/islandMap.ts). */
export interface IslandScenery {
  /** Eau des rizières : le riz y pousse. */
  paddies: Polygon;
  /** Bassin de la cascade : nénuphars. */
  pool: Polygon;
  /** Terrasses où l'on ne va pas : des bosquets. */
  groves: Polygon[];
  /** Plages où l'on ne va pas : rochers et herbes de rive. */
  beaches: Polygon[];
}

/** Un décor peint posé sur la carte (island.json, `decor`) : image dans public/sprites/decor, sans l'extension. */
export interface DecorItem extends ScreenPoint {
  /** `ile/pin-tordu` : public/sprites/decor/ile/pin-tordu.webp. */
  sprite: string;
  /** Hauteur à l'écran, en unités du monde (le héros mesure 1,75). */
  height: number;
  /** Retourné de gauche à droite. */
  flip?: boolean;
}

export interface IslandData {
  name: string;
  map: IslandMap;
  spawn: ScreenPoint;
  /** Retour de donjon : le ponton de Charon, pour ouvrir ses coffres sur la barque dès l'arrivée. */
  dungeonExit: ScreenPoint;
  /** Zones où l'on marche (terrasses, chemins, escaliers, pont, ponton), tracées sur la carte. */
  walk: Polygon[];
  /** Obstacles dans les zones de marche (un muret peint). */
  blocks: Polygon[];
  /**
   * Lit de la rivière : on y marche en contrebas, et l'on passe sous les ponts. On y descend et l'on en remonte
   * seulement là où il chevauche une zone de marche (un escalier, une berge en pente), jamais depuis un pont.
   */
  river?: Polygon[];
  /** Tabliers des ponts, tracés sur la carte : dessinés par-dessus le héros quand il passe dessous. */
  bridges?: Polygon[];
  scenery: IslandScenery;
  areas: Area[];
  props: PropDef[];
  interactables: InteractableDef[];
  /** Décors posés à la main (éditeur de carte) ; sans eux, le code les pose selon la carte (src/render/islandDecor.ts). */
  decor?: DecorItem[];
}

export interface Interactable {
  def: InteractableDef;
  pos: Vec2;
  name: string;
  verb?: string;
  sprite?: string;
  reach: number;
}

// La caméra regarde vers +X +Z : « haut » de l'écran = (1, 1)/√2 au sol, « droite » = (1, -1)/√2.
const FORWARD = normalize(vec(1, 1));
const RIGHT = vec(FORWARD.z, -FORWARD.x);

export function toWorld(p: ScreenPoint): Vec2 {
  return add(scale(RIGHT, p.u), scale(FORWARD, p.v));
}

export function toScreen(p: Vec2): ScreenPoint {
  return { u: p.x * RIGHT.x + p.z * RIGHT.z, v: p.x * FORWARD.x + p.z * FORWARD.z };
}

export function insidePolygon(s: ScreenPoint, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ui, vi] = poly[i];
    const [uj, vj] = poly[j];
    if (vi > s.v !== vj > s.v && s.u < ((uj - ui) * (s.v - vi)) / (vj - vi) + ui) inside = !inside;
  }
  return inside;
}

/** Point où l'on peut se tenir : dans une zone de marche, hors des obstacles. */
export function onWalk(data: IslandData, s: ScreenPoint): boolean {
  return data.walk.some((p) => insidePolygon(s, p)) && !data.blocks.some((p) => insidePolygon(s, p));
}

function inRiver(data: IslandData, s: ScreenPoint): boolean {
  return !!data.river?.some((p) => insidePolygon(s, p));
}

function onBridge(data: IslandData, s: ScreenPoint): boolean {
  return !!data.bridges?.some((p) => insidePolygon(s, p));
}

/** Directions autour du héros où son corps doit lui aussi tenir sur une zone de marche. */
const RIM = Array.from({ length: 8 }, (_, i) => vec(Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)));

/** Un peu plus vif qu'au combat : l'île est grande. */
const WALK_SPEED = 6;
/** Marge entre le héros et le bord de l'eau ou les obstacles. */
const BODY_RADIUS = 0.35;
const DEFAULT_REACH = 1.8;

/** L'île d'exploration : pas de combat, seulement se déplacer, parler et fouiller. */
export class Island {
  /** `low` : dans le lit de la rivière, en contrebas (sous les ponts). */
  readonly player = { pos: vec(), facing: vec(1, 0), moving: false, low: false };
  area: Area | null = null;
  private readonly staticSolids: { pos: Vec2; r: number }[];

  constructor(
    readonly data: IslandData,
    private readonly progress: Progress,
  ) {
    this.staticSolids = data.props.filter((p) => p.solid).map((p) => ({ pos: toWorld(p), r: p.solid ?? 0 }));
    this.placeAt(data.spawn);
  }

  /** Obstacles ajoutés par le rendu (décors de la carte peinte posés près des zones praticables). */
  addSolids(solids: readonly { pos: Vec2; r: number }[]): void {
    this.staticSolids.push(...solids);
  }

  placeAt(point: ScreenPoint): void {
    this.player.pos = toWorld(point);
    this.player.low = inRiver(this.data, point) && !onWalk(this.data, point);
    this.area = this.areaAt(point);
  }

  /** PNJ et objets présents selon l'avancée (l'ema n'apparaît que pendant la quête, par exemple). */
  interactables(): Interactable[] {
    return this.data.interactables
      .filter((def) => this.progress.check(def.if))
      .map((def) => ({
        def,
        pos: toWorld(def),
        name: def.nameIf?.find((n) => this.progress.check(n.if))?.name ?? def.name,
        verb: def.verbIf?.find((n) => this.progress.check(n.if))?.verb ?? def.verb,
        sprite: def.spriteIf?.find((n) => this.progress.check(n.if))?.sprite ?? def.sprite,
        reach: def.reach ?? DEFAULT_REACH,
      }));
  }

  /** Déplace le héros ; renvoie la zone dans laquelle il vient d'entrer, s'il y en a une. */
  update(dt: number, move: Vec2): Area | null {
    const player = this.player;
    player.moving = length(move) > 0.05;
    if (player.moving) {
      player.facing = normalize(move);
      const step = scale(move, WALK_SPEED * dt);
      const candidates = [add(player.pos, step), add(player.pos, vec(step.x, 0)), add(player.pos, vec(0, step.z))];
      const next = candidates.find((c) => this.walkable(c));
      if (next) {
        const pushed = this.pushOut(next);
        if (this.walkable(pushed)) player.pos = pushed;
      }
      // On change de niveau en quittant tout à fait l'autre : au chevauchement (escalier, berge), on garde le sien.
      const s = toScreen(player.pos);
      const up = onWalk(this.data, s);
      const down = inRiver(this.data, s);
      if (up !== down) player.low = down;
    }
    const area = this.areaAt(toScreen(player.pos));
    const entered = area && area.id !== this.area?.id ? area : null;
    this.area = area;
    return entered;
  }

  nearest(): Interactable | null {
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const it of this.interactables()) {
      const d = distance(it.pos, this.player.pos);
      if (d <= it.reach && d < bestDist) {
        best = it;
        bestDist = d;
      }
    }
    return best;
  }

  /**
   * Le héros sous un pont, ou juste derrière (plus haut à l'écran) : le tablier passe devant lui. Devant le pont, c'est
   * lui qui passe devant.
   */
  underBridge(): boolean {
    if (!this.player.low) return false;
    const s = toScreen(this.player.pos);
    return !!this.data.bridges?.some((p) => {
      const us = p.map(([u]) => u);
      const vs = p.map(([, v]) => v);
      return s.u > Math.min(...us) - 1 && s.u < Math.max(...us) + 1 && s.v > Math.min(...vs) - 0.2 && s.v < Math.max(...vs) + 3;
    });
  }

  /**
   * Où le héros peut aller, selon son niveau. En haut : les zones de marche, et le lit de la rivière seulement depuis
   * un endroit où les deux se chevauchent (jamais depuis un pont : on n'en saute pas). En bas : le lit, et les zones
   * de marche seulement depuis un chevauchement (on ne grimpe pas sur un pont depuis l'eau).
   */
  private walkable(p: Vec2): boolean {
    const data = this.data;
    const here = toScreen(this.player.pos);
    const crossing = onWalk(data, here) && inRiver(data, here) && !onBridge(data, here);
    const allowed = (s: ScreenPoint) =>
      this.player.low ? inRiver(data, s) || (crossing && onWalk(data, s)) : onWalk(data, s) || (crossing && inRiver(data, s));
    // Le corps : sur le pont, il reste sur le tablier ; dessous, dans le lit ; ailleurs, sur l'un ou l'autre niveau.
    const body = (s: ScreenPoint) => {
      if (onBridge(data, here)) return this.player.low ? inRiver(data, s) : onWalk(data, s);
      return onWalk(data, s) || inRiver(data, s);
    };
    return allowed(toScreen(p)) && RIM.every((d) => body(toScreen(add(p, scale(d, BODY_RADIUS)))));
  }

  private pushOut(p: Vec2): Vec2 {
    let pos = p;
    const solids = [
      ...this.staticSolids,
      ...this.interactables()
        .filter((it) => it.def.solid)
        .map((it) => ({ pos: it.pos, r: it.def.solid ?? 0 })),
    ];
    for (const solid of solids) {
      const delta = sub(pos, solid.pos);
      const min = solid.r + BODY_RADIUS;
      if (length(delta) < min) pos = add(solid.pos, scale(normalize(delta, this.player.facing), min));
    }
    return pos;
  }

  private areaAt(s: ScreenPoint): Area | null {
    return this.data.areas.find((a) => Math.hypot(s.u - a.u, s.v - a.v) <= a.r) ?? null;
  }
}
