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

export interface IslandZones {
  plaza: Circle;
  paddies: Circle[];
  stream: [number, number][];
  bridge: ScreenPoint & { dir: number };
  pool: Circle;
  gravel: Circle;
  cursed: Circle;
  pier: [number, number][];
}

export interface IslandData {
  name: string;
  spawn: ScreenPoint;
  dungeonExit: ScreenPoint;
  walkable: Circle[];
  areas: Area[];
  paths: [number, number][][];
  zones: IslandZones;
  props: PropDef[];
  interactables: InteractableDef[];
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

const WALK_SPEED = 5;
/** Marge entre le héros et le bord de l'eau ou les obstacles. */
const BODY_RADIUS = 0.35;
const DEFAULT_REACH = 1.8;

/** L'île d'exploration : pas de combat, seulement se déplacer, parler et fouiller. */
export class Island {
  readonly player = { pos: vec(), facing: vec(1, 0), moving: false };
  area: Area | null = null;
  private readonly staticSolids: { pos: Vec2; r: number }[];

  constructor(
    readonly data: IslandData,
    private readonly progress: Progress,
  ) {
    this.staticSolids = data.props.filter((p) => p.solid).map((p) => ({ pos: toWorld(p), r: p.solid ?? 0 }));
    this.placeAt(data.spawn);
  }

  placeAt(point: ScreenPoint): void {
    this.player.pos = toWorld(point);
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

  private walkable(p: Vec2): boolean {
    const s = toScreen(p);
    return this.data.walkable.some((c) => Math.hypot(s.u - c.u, s.v - c.v) <= c.r - BODY_RADIUS);
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
