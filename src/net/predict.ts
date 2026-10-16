// Chez un invité, son propre héros répond tout de suite. On part de sa dernière position connue chez l'hôte et on
// rejoue par-dessus les commandes que l'hôte n'a pas encore reçues : la marche, la garde, l'arc bandé, et les
// déplacements lancés par une touche (esquive, Bond du Guerrier, Fuite de feu du Sorcier, Recul du Rôdeur), qui partent
// dès l'appui avec la même vitesse que chez l'hôte. Le reste (coups, autres compétences) attend l'hôte. Quand l'hôte
// voit autre chose que ce qu'on avait prévu, l'écart se résorbe en douceur.
import type { PlayerConfig } from '../game/config';
import { add, distance, length, normalize, scale, sub, vec, type Vec2 } from '../game/math';
import { walkFactor } from '../game/player';
import type { GameEvent, InputFrame, Pose } from '../game/types';
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
/** Comme chez l'hôte : une esquive ou un Bond demandé pendant un autre déplacement part dès qu'il finit (s). */
const BUFFER = 0.2;
/** Une esquive montrée tout de suite rend muette celle que l'hôte annonce ensuite, si elle arrive avant ce délai (ms). */
const ECHO_WINDOW = 1000;

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
  altitude: number;
}

/** Un déplacement lancé par une touche, à vitesse constante, tel que l'hôte le jouera. */
interface Motion {
  /** La commande qui l'a lancé. */
  seq: number;
  kind: 'dodge' | 'bond' | 'flight' | 'leap';
  pose: Pose;
  vel: Vec2;
  duration: number;
  /** Hauteur du saut (0 au sol). */
  height: number;
  /** Bond et Recul vont d'un point à un autre et s'arrêtent pile ; l'esquive et la Fuite avancent d'un pas entier. */
  exact: boolean;
  /** Secondes déjà jouées. */
  t: number;
}

export class Prediction {
  private history: { seq: number; frame: InputFrame }[] = [];
  private server: HeroSnap | null = null;
  private ack = 0;
  private offset = vec();
  private shown: Shown | null = null;
  /** Les déplacements prévus, par commande de départ : de quoi continuer celui que l'hôte a commencé. */
  private motions = new Map<number, Motion>();
  /** Esquives déjà montrées (numéro de commande), et l'heure de chacune, pour taire l'annonce de l'hôte. */
  private announced = new Set<number>();
  private echoes: number[] = [];
  private events: GameEvent[] = [];
  /**
   * Derniers appuis (numéro de commande) d'un coup ou d'une compétence, d'une esquive et d'un Bond : l'hôte les garde
   * en attente pendant un déplacement, et les joue à sa fin.
   */
  private pressed = { blocks: 0, dodge: 0, bond: 0 };

  constructor(
    private readonly cfg: PlayerConfig,
    private readonly arenaHalfSize: number,
    /** Vitesse dans une toile (fraction). */
    private readonly webSlow: number,
    /** Le héros de ce joueur. */
    private readonly id: number,
  ) {}

  /** Une commande vient de partir vers l'hôte. */
  record(seq: number, frame: InputFrame): void {
    this.history.push({ seq, frame });
    if (this.history.length > HISTORY) this.history.shift();
    if (this.blocks(frame)) this.pressed.blocks = seq;
    if (frame.dodgePressed) this.pressed.dodge = seq;
    if (this.cfg.kit === 'guerrier' && frame.skillEPressed) this.pressed.bond = seq;
  }

  /** Un coup, une compétence sans déplacement : c'est l'hôte qui dira ce qu'il en est. */
  private blocks(frame: InputFrame): boolean {
    const kit = this.cfg.kit;
    return (
      frame.attackPressed ||
      frame.skillAPressed ||
      (frame.skillEPressed && kit !== 'guerrier' && kit !== 'sorcier') ||
      (frame.skillRPressed && kit !== 'rodeur') ||
      frame.skillFPressed ||
      (frame.signaturePressed && kit !== 'guerrier' && kit !== 'paladin' && kit !== 'rodeur') ||
      (frame.attackHeld && !frame.signatureHeld)
    );
  }

  /** L'hôte a joué nos commandes jusqu'à `ack` : voici le héros qui en résulte. */
  correct(hero: HeroSnap, ack: number, ground: Ground): void {
    const before = this.shown;
    this.server = hero;
    this.ack = ack;
    this.history = this.history.filter((h) => h.seq > ack);
    for (const seq of this.motions.keys()) if (seq < ack - HISTORY) this.motions.delete(seq);
    for (const seq of this.announced) if (seq < ack - HISTORY) this.announced.delete(seq);
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
    // Une esquive qui vient d'être prévue : son et effet tout de suite, sans attendre l'hôte.
    for (const m of this.motions.values()) {
      if (m.kind !== 'dodge' || m.seq <= this.ack || this.announced.has(m.seq)) continue;
      this.announced.add(m.seq);
      this.echoes.push(performance.now());
      this.events.push({ type: 'dodge', pos: { ...this.shown.pos }, dir: normalize(m.vel), hero: this.id });
    }
    return this.shown;
  }

  /** Les événements joués d'avance depuis la dernière image (esquives). */
  takeEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  /** Vrai si l'hôte annonce une esquive déjà montrée : on ne la rejoue pas. */
  echo(event: GameEvent): boolean {
    if (event.type !== 'dodge' || event.hero !== this.id) return false;
    const now = performance.now();
    while (this.echoes.length && now - this.echoes[0] > ECHO_WINDOW) this.echoes.shift();
    return this.echoes.shift() !== undefined;
  }

  /** Où sera le héros une fois nos commandes en route jouées par l'hôte. */
  private predict(ground: Ground): Shown {
    const s = this.server as HeroSnap;
    const c = this.cfg;
    let pos = { ...s.pos };
    let pose = s.pose;
    let facing = s.facing;
    const frozen = (): Shown => ({ pos, facing, pose, altitude: s.altitude });
    if (s.dead || !this.history.length) return frozen();

    // L'hôte est peut-être au milieu d'un déplacement qu'on avait prévu : on le reprend où il en est.
    let motion: Motion | null = null;
    if (s.pose === 'dash' || s.pose === 'airborne') {
      let started: Motion | undefined;
      for (const m of this.motions.values()) if (m.seq <= this.ack && m.pose === s.pose && (!started || m.seq > started.seq)) started = m;
      // Pas après pas, comme l'hôte compte le temps (une multiplication tomberait un pas trop tôt, aux arrondis près).
      let t = started ? started.t : Infinity;
      if (started) for (let seq = started.seq; seq <= this.ack && t < started.duration; seq++) t += STEP;
      if (!started || t >= started.duration) return frozen();
      motion = { ...started, t };
    } else if (s.altitude > 0 || !FREE.includes(s.pose)) return frozen();

    const guarding = c.kit === 'guerrier' || c.kit === 'paladin';
    const factor = walkFactor(c, s.hp, s.transformed);
    const cooldown = { dodge: s.dodgeCooldown, bond: s.bondCooldown, flight: s.flightCooldown, leap: s.leapCooldown };
    // Ce que l'hôte a reçu pendant le déplacement en cours et garde en attente pour sa fin.
    const waiting = (seq: number) => (motion && seq > motion.seq && seq <= this.ack ? Math.max(0, BUFFER - (this.ack - seq) * STEP) : 0);
    const buffered = { dodge: waiting(this.pressed.dodge), bond: waiting(this.pressed.bond) };
    let mana = s.mana;
    let spare = (c.perks?.dodgeCharges ?? 1) - 1;
    /** Un coup ou une compétence attend l'hôte : on s'arrête là, une fois le déplacement en cours fini. */
    let blocked = waiting(this.pressed.blocks) > 0;
    const inWeb = () => ground.webs.some((w) => w.burning === null && distance(w.pos, pos) < w.radius);
    const settle = (next: Vec2): Vec2 => {
      const body = { pos: next, radius: s.radius };
      for (const obstacle of ground.stumps) pushOut(body, obstacle);
      for (const obstacle of ground.peaches) pushOut(body, obstacle);
      return this.clamp(body.pos, s.radius);
    };
    const start = (seq: number, m: Omit<Motion, 'seq' | 't'>, t = 0): Motion => {
      const started = { ...m, seq, t };
      this.motions.set(seq, { ...started });
      return started;
    };

    for (const { seq, frame } of this.history) {
      for (const key of ['dodge', 'bond', 'flight', 'leap'] as const) cooldown[key] = Math.max(0, cooldown[key] - STEP);
      if (!motion) {
        buffered.dodge = Math.max(0, buffered.dodge - STEP);
        buffered.bond = Math.max(0, buffered.bond - STEP);
      }
      if (frame.dodgePressed) buffered.dodge = BUFFER;
      if (c.kit === 'guerrier' && frame.skillEPressed) buffered.bond = BUFFER;
      blocked ||= this.blocks(frame);
      if (!motion && blocked) break;

      if (!motion) {
        const moveDir = normalize(length(frame.move) > 0.1 ? frame.move : facing, facing);
        if (buffered.dodge > 0 && (cooldown.dodge <= 0 || spare > 0)) {
          buffered.dodge = 0;
          if (cooldown.dodge > 0) spare--;
          else cooldown.dodge = c.dodge.cooldown;
          const d = c.dodge;
          motion = start(seq, { kind: 'dodge', pose: 'dash', vel: scale(moveDir, d.distance / d.duration), duration: d.duration, height: 0, exact: false });
        } else if (c.kit === 'guerrier' && buffered.bond > 0 && cooldown.bond <= 0) {
          buffered.bond = 0;
          cooldown.bond = c.bond.cooldown;
          const b = c.bond;
          const toAim = sub(frame.aimGround, pos);
          const target = this.clamp(add(pos, scale(normalize(toAim, facing), Math.min(b.range, length(toAim)))), s.radius);
          facing = normalize(toAim, facing);
          // Un saut sur place (souris sur le héros) part de la moitié, comme chez l'hôte.
          const inPlace = distance(pos, target) < 0.1;
          motion = start(seq, { kind: 'bond', pose: 'airborne', vel: scale(sub(target, pos), 1 / b.duration), duration: b.duration, height: b.height, exact: true }, inPlace ? b.duration * 0.5 : 0);
        } else if (c.kit === 'sorcier' && frame.skillEPressed && cooldown.flight <= 0 && mana >= c.sorcier.flight.cost) {
          const f = c.sorcier.flight;
          cooldown.flight = f.cooldown;
          mana -= f.cost;
          motion = start(seq, { kind: 'flight', pose: 'dash', vel: scale(moveDir, f.distance / f.duration), duration: f.duration, height: 0, exact: false });
        } else if (c.kit === 'rodeur' && frame.skillRPressed && cooldown.leap <= 0) {
          const l = c.ranger.leap;
          cooldown.leap = l.cooldown;
          const aimDir = normalize(sub(frame.aim, pos), facing);
          const target = this.clamp(add(pos, scale(aimDir, -l.distance)), s.radius);
          facing = aimDir;
          motion = start(seq, { kind: 'leap', pose: 'airborne', vel: scale(sub(target, pos), 1 / l.duration), duration: l.duration, height: l.height, exact: true });
        }
      }

      if (motion) {
        // Le déplacement avance ; seules les toiles freinent l'esquive, comme chez l'hôte.
        const span = motion.exact ? Math.min(motion.t + STEP, motion.duration) - Math.min(motion.t, motion.duration) : STEP;
        const slow = motion.kind === 'dodge' && inWeb() ? this.webSlow : 1;
        pos = settle(add(pos, scale(motion.vel, span * slow)));
        motion.t += STEP;
        pose = motion.pose;
        if (motion.t >= motion.duration) {
          motion = null;
          pose = 'idle';
          if (blocked) break;
        }
        continue;
      }

      const guard = guarding && frame.signatureHeld;
      const draw = c.kit === 'rodeur' && frame.signatureHeld;
      const moving = length(frame.move) > 0.05;
      if (moving) {
        const slow = inWeb() ? this.webSlow : 1;
        const speed = c.moveSpeed * factor * slow * (guard ? c.blockMoveFactor : draw ? c.ranger.charged.moveFactor : 1);
        pos = settle(add(pos, scale(frame.move, speed * STEP)));
      }
      pose = guard ? 'guard' : draw ? 'channel' : moving ? 'move' : 'idle';
      facing = normalize(sub(frame.aim, pos), facing);
    }
    const altitude = motion && motion.height ? Math.sin(Math.PI * Math.min(1, motion.t / motion.duration)) * motion.height : 0;
    return { pos, facing, pose, altitude };
  }

  private clamp(p: Vec2, radius: number): Vec2 {
    const limit = this.arenaHalfSize - radius;
    return { x: Math.max(-limit, Math.min(limit, p.x)), z: Math.max(-limit, Math.min(limit, p.z)) };
  }
}
