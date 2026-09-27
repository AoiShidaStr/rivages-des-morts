// Chez un invité, son propre héros répond tout de suite. On part de sa dernière position connue chez l'hôte et on
// rejoue par-dessus les commandes que l'hôte n'a pas encore reçues : la marche, la garde, l'arc bandé. Le reste (coups,
// esquives, bonds) attend l'hôte. Quand l'hôte voit autre chose que ce qu'on avait prévu, l'écart se résorbe en douceur.
import type { PlayerConfig } from '../game/config';
import { add, distance, length, normalize, scale, sub, vec, type Vec2 } from '../game/math';
import { walkFactor } from '../game/player';
import type { InputFrame, Pose } from '../game/types';
import type { PeachView, StumpView, WebView } from '../game/view';
import { pushOut } from '../game/world';
import { TICK_RATE, type HeroSnap } from './protocol';

const STEP = 1 / TICK_RATE;
/** Au-delà de cet écart (m), on ne lisse plus : le héros saute à sa place. En deçà (esquive, bond), il glisse. */
const SNAP_DISTANCE = 6;
/** Temps pour résorber la moitié d'un écart (s). */
const HALF_LIFE = 0.06;
/** Poses où le héros marche librement : on sait où il va. */
const FREE: readonly Pose[] = ['idle', 'move', 'guard', 'channel'];
/** Commandes gardées au plus (quatre secondes) : au-delà, l'hôte ne répond plus. */
const HISTORY = 240;

/** Ce qui gêne ou freine la marche. */
export interface Ground {
  readonly stumps: readonly StumpView[];
  readonly peaches: readonly PeachView[];
  readonly webs: readonly WebView[];
}

export interface Shown {
  pos: Vec2;
  facing: Vec2;
  pose: Pose;
}

export class Prediction {
  private history: { seq: number; frame: InputFrame }[] = [];
  private server: HeroSnap | null = null;
  private offset = vec();
  private shown: Shown | null = null;

  constructor(
    private readonly cfg: PlayerConfig,
    private readonly arenaHalfSize: number,
    /** Vitesse dans une toile (fraction). */
    private readonly webSlow: number,
  ) {}

  /** Une commande vient de partir vers l'hôte. */
  record(seq: number, frame: InputFrame): void {
    this.history.push({ seq, frame });
    if (this.history.length > HISTORY) this.history.shift();
  }

  /** L'hôte a joué nos commandes jusqu'à `ack` : voici le héros qui en résulte. */
  correct(hero: HeroSnap, ack: number, ground: Ground): void {
    const before = this.shown;
    this.server = hero;
    this.history = this.history.filter((h) => h.seq > ack);
    if (!before) return;
    const gap = sub(before.pos, this.predict(ground).pos);
    this.offset = length(gap) > SNAP_DISTANCE ? vec() : gap;
  }

  /** Le héros à montrer à cette image ; `null` avant le premier instantané. */
  update(dt: number, ground: Ground): Shown | null {
    if (!this.server) return null;
    this.offset = scale(this.offset, 0.5 ** (dt / HALF_LIFE));
    const p = this.predict(ground);
    this.shown = { ...p, pos: add(p.pos, this.offset) };
    return this.shown;
  }

  /** Où sera le héros une fois nos commandes en route jouées par l'hôte. */
  private predict(ground: Ground): Shown {
    const s = this.server as HeroSnap;
    let pos = { ...s.pos };
    let pose = s.pose;
    let facing = s.facing;
    if (s.dead || s.altitude > 0 || !FREE.includes(s.pose) || !this.history.length) return { pos, facing, pose };
    const c = this.cfg;
    const guarding = c.kit === 'guerrier' || c.kit === 'paladin';
    const factor = walkFactor(c, s.hp, s.transformed);
    for (const { frame } of this.history) {
      // Un coup, une esquive, une compétence : c'est l'hôte qui dira ce qu'il en est.
      const acts =
        frame.attackPressed ||
        frame.dodgePressed ||
        frame.skillAPressed ||
        frame.skillEPressed ||
        frame.skillRPressed ||
        (frame.signaturePressed && !guarding && c.kit !== 'rodeur') ||
        (frame.attackHeld && !frame.signatureHeld);
      if (acts) return { pos, facing, pose };
      const guard = guarding && frame.signatureHeld;
      const draw = c.kit === 'rodeur' && frame.signatureHeld;
      const moving = length(frame.move) > 0.05;
      if (moving) {
        const slow = ground.webs.some((w) => w.burning === null && distance(w.pos, pos) < w.radius) ? this.webSlow : 1;
        const speed = c.moveSpeed * factor * slow * (guard ? c.blockMoveFactor : draw ? c.ranger.charged.moveFactor : 1);
        const body = { pos: add(pos, scale(frame.move, speed * STEP)), radius: s.radius };
        for (const obstacle of ground.stumps) pushOut(body, obstacle);
        for (const obstacle of ground.peaches) pushOut(body, obstacle);
        const limit = this.arenaHalfSize - s.radius;
        pos = { x: Math.max(-limit, Math.min(limit, body.pos.x)), z: Math.max(-limit, Math.min(limit, body.pos.z)) };
      }
      pose = guard ? 'guard' : draw ? 'channel' : moving ? 'move' : 'idle';
      facing = normalize(sub(frame.aim, pos), facing);
    }
    return { pos, facing, pose };
  }
}
