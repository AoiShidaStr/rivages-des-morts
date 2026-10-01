// Allié joué par l'ordinateur : il pilote un héros comme le ferait un joueur moyen. Il sert à tester la coop
// sans réseau (`?coop=2`, `?coop=3`) et à régler la difficulté selon le nombre de héros.
import type { Enemy } from './enemies';
import { add, angleOf, degToRad, distance, fromAngle, length, normalize, scale, sub, vec, type Vec2 } from './math';
import type { Player } from './player';
import type { InputFrame } from './types';
import type { World } from './world';

/** On réagit à une attaque annoncée quand il reste moins que ça avant l'impact (secondes). */
const REACT = 0.28;
/** Part des attaques annoncées qu'il remarque : il en rate une partie, comme un joueur moyen. */
const SKILL = 0.75;

/**
 * Ce que le bot lit des yokai au-delà de leur interface publique : leur état et leurs réglages.
 * C'est un outil de test ; le jeu, lui, ne s'en sert pas.
 */
interface Peek {
  state?: { kind: string; t: number; dir?: Vec2; duration?: number; target?: Vec2 };
  cfg: Record<string, any>;
  phase?: number;
}

const peek = (enemy: Enemy) => enemy as unknown as Peek;

/** Ce que le bot lit d'Izanami : la jauge de son regard, et vrai pendant qu'une pêche la repousse. */
interface IzanamiPeek {
  gaze: number;
  repelled: boolean;
}

/** Angle entre la visée et Izanami : au-delà du cône de son regard (25°), assez près pour que l'arme la touche. */
const AVERT = degToRad(34);
/** Jauge du regard à laquelle on détourne les yeux pour de bon, et celle à laquelle on peut la viser de nouveau. */
const GAZE_HIGH = 0.6;
const GAZE_LOW = 0.15;

/** `dir` tourné de `angle` radians. */
const turn = (dir: Vec2, angle: number): Vec2 => fromAngle(angleOf(dir) + angle);

type Threat = { type: 'melee'; src: Vec2 } | { type: 'charge'; src: Vec2; dir: Vec2 } | { type: 'land'; at: Vec2 };

export class Bot {
  private readonly seen = new WeakMap<object, boolean>();
  private lastBind = -9;
  /** Face à Izanami : vrai tant qu'on détourne les yeux pour laisser retomber son regard. */
  private averting = false;

  constructor(
    private readonly world: World,
    private readonly hero: Player,
    /**
     * Banc de DPS (`npm run dps`) : chaque compétence qui fait des dégâts part dès qu'elle est prête, même contre une
     * seule cible, pour mesurer les dégâts maximaux de la classe.
     */
    private readonly greedy = false,
  ) {}

  /** Les commandes du héros pour ce pas. */
  input(): InputFrame {
    const w = this.world;
    const p = this.hero;
    const c = p.cfg;
    const kit = c.kit;
    const input: InputFrame = {
      move: vec(),
      aim: { ...p.pos },
      aimGround: { ...p.pos },
      attackPressed: false,
      attackHeld: false,
      signatureHeld: false,
      signaturePressed: false,
      dodgePressed: false,
      skillAPressed: false,
      skillEPressed: false,
      skillRPressed: false,
    };
    if (p.dead) return input;

    // Fil de Jōren : tiré par la Jorōgumo (qui ne tire que le premier héros), on esquive derrière une souche
    // pour que le fil s'y accroche.
    const puller = p === w.player ? w.enemies.find((e) => e.boss && peek(e).state?.kind === 'pull') : undefined;
    const pullState = puller && peek(puller).state;
    if (puller && pullState && w.stumps.length && this.notices(pullState)) {
      const stump = w.stumps.reduce((a, b) => (distance(a.pos, p.pos) <= distance(b.pos, p.pos) ? a : b));
      const spot = add(stump.pos, scale(normalize(sub(stump.pos, puller.pos)), stump.radius + p.radius + 0.5));
      input.move = normalize(sub(spot, p.pos));
      input.aim = add(p.pos, input.move);
      if (p.dodgeCooldown <= 0) input.dodgePressed = true;
      return input;
    }

    // Un allié à terre passe avant tout, s'il n'y a pas de coup à éviter : on va le relever.
    const threats = this.threats();
    const downed = w.players.find((h) => h !== p && h.dead);
    if (downed && !threats.length) {
      const gap = distance(downed.pos, p.pos);
      if (kit === 'paladin' && p.raiseCooldown <= 0 && w.graveNear(p)) input.skillRPressed = true;
      if (gap > 1.2) input.move = normalize(sub(downed.pos, p.pos));
      return input;
    }

    const foes = w.enemies.filter((e) => e.targetable);
    if (!foes.length) {
      // Entre deux vagues, on reste près des autres héros.
      const leader = w.players[0];
      if (leader !== p && distance(leader.pos, p.pos) > 3) input.move = normalize(sub(leader.pos, p.pos));
      return input;
    }
    const near = (r: number, from = p.pos) => foes.filter((e) => distance(e.pos, from) - e.radius <= r);
    const kodama = foes.find((e) => e.kind === 'kodama' && distance(e.pos, p.pos) < 9);
    // Un kappa qu'on ne peut pas encore frapper dans le dos attend son tour, s'il y a d'autres yokai à frapper.
    const exposed = (e: Enemy) => !e.kind.startsWith('kappa') || ['stunned', 'recover'].includes(peek(e).state?.kind ?? '');
    const pool = foes.some(exposed) ? foes.filter(exposed) : foes;
    const izanami = foes.find((e) => e.kind === 'izanami');
    const her = izanami ? (izanami as unknown as IzanamiPeek) : null;
    // Izanami repoussée par une pêche : c'est le moment de frapper, avant tout le reste.
    const target = (her?.repelled ? izanami : undefined) ?? kodama ?? pool.reduce((a, b) => (distance(a.pos, p.pos) <= distance(b.pos, p.pos) ? a : b));
    const gap = distance(p.pos, target.pos) - target.radius - p.radius;
    const toTarget = normalize(sub(target.pos, p.pos));
    input.aim = { ...target.pos };
    input.aimGround = { ...target.pos };
    const canBlock = p.canGuard;

    // Réactions aux attaques annoncées.
    const land = threats.find((th): th is Extract<Threat, { type: 'land' }> => th.type === 'land');
    const hit = threats.find((th): th is Exclude<Threat, { type: 'land' }> => th.type !== 'land');
    if (land) {
      const away = normalize(sub(p.pos, land.at), vec(1, 0));
      input.move = away;
      if (p.dodgeCooldown <= 0) input.dodgePressed = true;
      return input;
    }
    if (hit) {
      if (canBlock) {
        input.signatureHeld = true;
        input.aim = { ...hit.src };
        return input;
      }
      input.move = hit.type === 'charge' ? vec(-hit.dir.z, hit.dir.x) : normalize(sub(p.pos, hit.src));
      if (p.dodgeCooldown <= 0) input.dodgePressed = true;
      if (kit !== 'rodeur' || p.dodgeCooldown > 0) return input;
    }

    // Izanami : une pêche cueillie sur un pêcher mûr la repousse et l'expose. On va frapper l'arbre (ou on lui tire
    // dessus), sauf si elle est déjà repoussée.
    if (izanami && her && !her.repelled && p === w.player) {
      const ripe = w.peaches.filter((t) => t.ripe);
      const tree = ripe.length ? ripe.reduce((a, b) => (distance(a.pos, p.pos) <= distance(b.pos, p.pos) ? a : b)) : null;
      if (tree) {
        const toTree = sub(tree.pos, p.pos);
        const reach = kit === 'rodeur' ? c.attack.range * 0.8 : c.attack.range * 0.7;
        input.aim = { ...tree.pos };
        input.aimGround = { ...tree.pos };
        if (length(toTree) - tree.radius > reach) input.move = normalize(toTree);
        else input.attackPressed = true;
        return input;
      }
    }
    // Son regard : la viser en face la renforce et, la jauge pleine, déchaîne sa colère. Les armes larges et les
    // estocs portés de tout près la touchent en visant à côté ; sinon, on détourne les yeux le temps que la jauge retombe.
    const facingHer = target === izanami && her !== null && !her.repelled && p === w.player;
    if (facingHer && her) {
      if (her.gaze > GAZE_HIGH) this.averting = true;
      else if (her.gaze < GAZE_LOW) this.averting = false;
      const wide = c.attack.shape !== 'line' && c.attack.arcDeg >= 80;
      const side = turn(toTarget, AVERT);
      if (kit !== 'rodeur' && (wide || gap < 0.6)) {
        input.aim = add(p.pos, scale(side, Math.max(1, gap + target.radius)));
        input.aimGround = { ...input.aim };
        if (gap > (wide ? c.attack.range * 0.6 : 0.4)) input.move = toTarget;
        if (gap <= (wide ? c.attack.range * 0.85 : 0.6)) input.attackHeld = true;
        return input;
      }
      if (this.averting) {
        // On détourne les yeux : on recule en visant ailleurs, et on frappe ce qui passe.
        input.aim = add(p.pos, scale(turn(toTarget, Math.PI / 2), 3));
        input.aimGround = { ...input.aim };
        input.move = gap < 4 ? normalize(sub(p.pos, target.pos)) : vec();
        return input;
      }
    }

    // Compétences.
    const mine = w.summons.filter((s) => s.owner === p.id);
    const hpRatio = p.hp / c.maxHp;
    if (kit === 'guerrier') {
      if (p.canSmash && near(c.smash.offset + c.smash.radius * 0.8).length >= 1) input.skillAPressed = true;
      else if (p.canBond && gap > 2.5 && gap < c.bond.range) input.skillEPressed = true;
      else if (this.greedy && p.canBond) input.skillEPressed = true;
      if (p.canFrenzy && (near(4).length >= 2 || target.boss || this.greedy)) input.skillRPressed = true;
    } else if (kit === 'invocateur') {
      const soul = w.souls.find((s) => distance(s.pos, p.pos) <= c.summon.bindRange);
      if (soul && w.time - this.lastBind > 0.3) {
        input.signaturePressed = true;
        input.aim = { ...soul.pos };
        this.lastBind = w.time;
        return input;
      }
      if (mine.length && p.recallCooldown <= 0) input.skillAPressed = true;
      const crowd = this.greedy ? 1 : 2;
      if (mine.length >= Math.min(crowd, c.summon.max) && p.sacrificeCooldown <= 0 && near(c.summon.sacrifice.radius, mine[0].pos).length >= crowd) input.skillEPressed = true;
      if (mine.length && p.choirCooldown <= 0) input.skillRPressed = true;
    } else if (kit === 'lame') {
      // Au banc de DPS, la Lame joue comme un bon joueur : elle traverse sa cible dès qu'elle a une charge (marque et
      // critique), puis revient au contact d'une esquive, qui ouvre elle aussi ses critiques.
      const through = this.greedy ? gap < c.blade.shadowDash.distance - 1.5 : gap > 1.2 && gap < c.blade.shadowDash.distance - 1.5;
      if (p.dashCharges > 0 && (target.kind !== 'kodama' || this.greedy) && through) {
        input.signaturePressed = true;
        input.aim = add(target.pos, scale(toTarget, 2));
      } else if (this.greedy && c.perks?.dodgeCrit && p.dodgeCooldown <= 0 && gap > 1.5) {
        input.move = toTarget;
        input.dodgePressed = true;
        return input;
      }
      if (p.deathMarkCooldown <= 0 && target.maxHp >= 30) input.skillAPressed = true;
      if (p.smokeCooldown <= 0 && (hpRatio < 0.5 || near(3).length >= 3 || this.greedy)) input.skillEPressed = true;
      if (p.danceCooldown <= 0 && near(c.blade.dance.range).length >= (this.greedy ? 1 : 2)) input.skillRPressed = true;
    } else if (kit === 'paladin') {
      const hurt = w.players.some((h) => !h.dead && h.hp < h.cfg.maxHp * 0.75 && distance(h.pos, p.pos) < c.paladin.aura.radius);
      if (p.auraCooldown <= 0 && (hurt || this.greedy || mine.some((s) => s.hp < s.maxHp * 0.6))) input.skillAPressed = true;
      if (p.hammerCooldown <= 0 && !w.hammerOutOf(p) && gap < c.paladin.hammer.range) input.skillEPressed = true;
      if (p.raiseCooldown <= 0 && w.graveNear(p)) input.skillRPressed = true;
    } else if (kit === 'rodeur') {
      const shelled = target.kind.startsWith('kappa') && peek(target).state?.kind !== 'stunned';
      if (p.netCooldown <= 0 && (shelled || near(2.5).length >= 1 || near(c.ranger.net.radius, target.pos).length >= 2)) input.skillAPressed = true;
      if (p.huntCooldown <= 0 && target.maxHp >= 30) input.skillEPressed = true;
      if (p.leapCooldown <= 0 && near(2).length >= 1) input.skillRPressed = true;
    }

    // Déplacement et attaque.
    if (kit === 'rodeur') {
      const range = c.attack.range;
      const close = near(3.5);
      if (close.length) input.move = normalize(sub(p.pos, close[0].pos));
      else if (gap > range - 1) input.move = toTarget;
      // Tir chargé quand personne n'est proche.
      if (p.pose === 'channel') {
        input.signatureHeld = p.drawProgress < 1 && !close.length;
        return input;
      }
      if (!close.length && gap > 4.5 && gap < range * 1.2) {
        input.signatureHeld = true;
        return input;
      }
      if (gap <= range) input.attackHeld = true;
      return input;
    }
    // Un kappa se prend de dos. Il pivote plus vite qu'on ne le contourne : on reste en face pour provoquer sa charge,
    // on l'évite (plus haut), puis on passe dans son dos pendant qu'il récupère.
    const kappaState = peek(target).state?.kind;
    if (target.kind.startsWith('kappa') && kappaState !== 'stunned' && kappaState !== 'recover') {
      if (gap < 3) input.move = normalize(sub(p.pos, target.pos));
      input.aim = { ...target.pos };
      return input;
    }
    if (target.kind.startsWith('kappa') && kappaState === 'recover') {
      const behind = add(target.pos, scale(target.facing, -(target.radius + p.radius + 0.4)));
      if (distance(p.pos, behind) > 0.5) {
        const side = vec(-target.facing.z, target.facing.x);
        const rel = sub(p.pos, target.pos);
        const inFront = rel.x * target.facing.x + rel.z * target.facing.z > 0;
        // Devant lui, on passe par le côté pour ne pas se jeter dans sa charge.
        const around = add(scale(side, rel.x * side.x + rel.z * side.z >= 0 ? 1 : -1), scale(normalize(sub(behind, p.pos)), 0.6));
        input.move = inFront ? normalize(around) : normalize(sub(behind, p.pos));
        if (gap <= c.attack.range && !inFront) input.attackHeld = true;
        return input;
      }
    }
    if (gap > c.attack.range * 0.6) input.move = toTarget;
    if (gap <= c.attack.range * 0.85) input.attackHeld = true;
    return input;
  }

  /** Chaque attaque est vue ou non, une fois pour toutes. */
  private notices(attack: object): boolean {
    if (!this.seen.has(attack)) this.seen.set(attack, Math.random() < SKILL);
    return this.seen.get(attack) ?? false;
  }

  /** Attaques annoncées qui vont toucher ce héros. */
  private threats(): Threat[] {
    const p = this.hero;
    const out: Threat[] = [];
    for (const enemy of this.world.enemies) {
      const e = peek(enemy);
      const s = e.state;
      if (!s || !enemy.active) continue;
      const cfg = e.cfg;
      // Coup de mêlée annoncé (Oublié, araignée, Jorōgumo).
      let windup: number | null = null;
      let range = 0;
      if (s.kind === 'windup' && cfg.windup !== undefined) {
        windup = cfg.windup;
        range = cfg.attackRange;
      }
      if (s.kind === 'melee' && enemy.kind === 'jorogumo') {
        const m = e.phase === 1 ? cfg.human.fan : cfg.spider.bite;
        windup = m.windup;
        range = m.range + enemy.radius;
      }
      if (s.kind === 'melee' && enemy.kind === 'izanami') {
        const m = e.phase === 1 ? cfg.veiled.embrace : cfg.revealed.grasp;
        windup = m.windup;
        range = m.range + enemy.radius;
      }
      // Colère d'Izanami : un cercle autour d'elle, annoncé quelques instants avant.
      if (s.kind === 'wrath' && enemy.kind === 'izanami') {
        const wrath = cfg.gaze.wrath;
        if (wrath.warning - s.t < REACT + 0.4 && distance(enemy.pos, p.pos) < wrath.radius + p.radius + 0.5 && this.notices(s)) out.push({ type: 'land', at: enemy.pos });
      }
      if (windup !== null && windup - s.t < REACT && distance(enemy.pos, p.pos) < range + p.radius + 0.7 && this.notices(s)) {
        out.push({ type: 'melee', src: enemy.pos });
      }
      // Charge annoncée (kappa, Jorōgumo araignée).
      if ((s.kind === 'telegraph' || s.kind === 'charge') && s.dir) {
        const rel = sub(p.pos, enemy.pos);
        const along = rel.x * s.dir.x + rel.z * s.dir.z;
        const across = Math.abs(rel.x * s.dir.z - rel.z * s.dir.x);
        const total = s.duration ?? (enemy.kind === 'jorogumo' ? cfg.spider.telegraph : enemy.kind === 'izanami' ? cfg.pursuit.telegraph : 0.7);
        const remain = s.kind === 'telegraph' ? total - s.t : 0;
        if (along > -0.5 && along < 9 && across < enemy.radius + p.radius + 0.5 && remain < REACT + 0.1 && this.notices(s)) {
          out.push({ type: 'charge', src: enemy.pos, dir: s.dir });
        }
      }
      // Chute du kasa-obake.
      if (enemy.kind === 'kasaObake' && (s.kind === 'hang' || s.kind === 'fall') && s.target) {
        const remain = s.kind === 'hang' ? cfg.hangTime - s.t + cfg.fallTime : cfg.fallTime - s.t;
        if (remain < REACT + 0.15 && distance(s.target, p.pos) < cfg.landRadius + p.radius + 0.3 && this.notices(s)) out.push({ type: 'land', at: s.target });
      }
    }
    for (const h of this.world.dangers) {
      if (h.cfg.warning - h.t < REACT + 0.15 && distance(h.pos, p.pos) < h.cfg.radius + p.radius + 0.3 && this.notices(h)) out.push({ type: 'land', at: h.pos });
    }
    return out;
  }
}
