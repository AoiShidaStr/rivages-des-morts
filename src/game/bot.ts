// Allié joué par l'ordinateur : il pilote un héros comme le ferait un joueur moyen. Il sert à tester la coop
// sans réseau (`?coop=2`, `?coop=3`) et à régler la difficulté selon le nombre de héros.
import { Rival, type Enemy } from './enemies';
import { add, angleOf, degToRad, distance, fromAngle, length, normalize, scale, sub, vec, type Vec2 } from './math';
import type { Player } from './player';
import type { InputFrame } from './types';
import type { World } from './world';

/** On réagit à une attaque annoncée quand il reste moins que ça avant l'impact (secondes). */
const REACT = 0.28;
/** Part des attaques annoncées qu'il remarque : il en rate une partie, comme un joueur moyen. */
const SKILL = 0.75;
/** Profil « humain » (`--humain` de l'équilibrage) : réaction plus lente, attaques moins souvent vues, visée qui tremble. */
const HUMAN = { react: 0.18, skill: 0.6, aimError: 0.9, aimEvery: 0.4, missRate: 0.12 };
/**
 * Duel : temps qu'il faut pour voir venir un coup de l'autre héros (secondes). Un coup d'arme part trop vite pour
 * être esquivé à vue ; le Fracas, une flèche, un marteau, un sceau ou un météore, si.
 */
const LATENCY = 0.12;
const HUMAN_LATENCY = 0.22;
/** Duel : distance au centre (m) à partir de laquelle un tireur qui recule se sent au bord (l'arène fait 9 m de côté). */
const KITE_ROOM = 8;
/** Duel : l'écart au-delà de sa portée à partir duquel un héros de mêlée esquive vers l'adversaire pour le rattraper. */
const CHASE_GAP = 1.5;

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

type Threat = { type: 'melee'; src: Vec2 } | { type: 'charge'; src: Vec2; dir: Vec2 } | { type: 'shot'; src: Vec2; dir: Vec2 } | { type: 'land'; at: Vec2 };

/** Ce que le bot lit des sceaux et météores en attente : privés au monde, comme l'état des yokai. */
interface BlastPeek {
  pos: Vec2;
  radius: number;
  t: number;
  owner: number;
}

export class Bot {
  private readonly seen = new WeakMap<object, boolean>();
  /** Face à Izanami : vrai tant qu'on détourne les yeux pour laisser retomber son regard. */
  private averting = false;
  /** Visée bruitée du profil humain : décalage courant et temps avant d'en tirer un autre. */
  private aimOffset = vec();
  private aimTimer = 0;
  private missTimer = 0;
  /** Duel : l'instant où chaque coup de l'adversaire a été aperçu, et l'élan qu'il prend en ce moment. */
  private readonly spotted = new WeakMap<object, number>();
  private swing: object | null = null;

  /** La place du héros piloté : en duel, le héros est refait à neuf à chaque manche, on le relit donc à chaque pas. */
  private readonly seat: number;

  constructor(
    private readonly world: World,
    hero: Player,
    /**
     * Banc de DPS (`npm run dps`) : chaque compétence qui fait des dégâts part dès qu'elle est prête, même contre une
     * seule cible, pour mesurer les dégâts maximaux de la classe.
     */
    private readonly greedy = false,
    /** Imite un joueur moyen plutôt qu'un bot : voir `HUMAN`. */
    private readonly human = false,
    /**
     * Duel : esquive aussi les coups lents de l'autre héros (Fracas, projectiles, sceaux, météores). Seul l'équilibrage
     * (`npm run duel`) s'en sert pour l'instant ; l'ombre du duel hors ligne joue sans.
     */
    private readonly rivalAware = false,
  ) {
    this.seat = hero.id;
  }

  private get hero(): Player {
    return this.world.players[this.seat];
  }

  /** Les commandes du héros pour ce pas. */
  input(): InputFrame {
    const input = this.plan();
    if (!this.human || this.hero.dead) return input;
    // Un joueur ne vise pas au pixel et rate parfois un coup : la visée dérive, et par instants l'attaque ne part pas.
    const dt = 1 / 60;
    this.aimTimer -= dt;
    if (this.aimTimer <= 0) {
      this.aimTimer = HUMAN.aimEvery;
      const a = Math.random() * Math.PI * 2;
      this.aimOffset = scale(fromAngle(a), Math.random() * HUMAN.aimError);
      if (Math.random() < HUMAN.missRate) this.missTimer = 0.25;
    }
    this.missTimer -= dt;
    input.aim = add(input.aim, this.aimOffset);
    if (this.missTimer > 0) {
      input.attackHeld = false;
      input.attackPressed = false;
    }
    return input;
  }

  private get react(): number {
    return this.human ? HUMAN.react : REACT;
  }

  private plan(): InputFrame {
    const w = this.world;
    const p = this.hero;
    const c = p.cfg;
    const kit = c.kit;
    const ranged = kit === 'rodeur' || kit === 'sorcier';
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
      skillFPressed: false,
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
      if (gap > 1.2) input.move = normalize(sub(downed.pos, p.pos));
      return input;
    }

    // Duel : le double de l'adversaire est la cible, jamais le sien. On ne lit pas `targetable` d'un double hors du pas
    // de simulation : il dépend du héros qui agit.
    const foes = w.enemies.filter((e) => (e instanceof Rival ? e.owner !== p.id && !e.dead : e.targetable));
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
    // Le Guerrier lève sa garde en tenant le clic droit, quelle que soit sa posture.
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
      if (hit.type === 'shot') {
        // Un projectile : on sort de sa ligne par le côté où l'on est déjà.
        const side = vec(-hit.dir.z, hit.dir.x);
        const rel = sub(p.pos, hit.src);
        input.move = rel.x * side.x + rel.z * side.z >= 0 ? side : scale(side, -1);
      } else input.move = hit.type === 'charge' ? vec(-hit.dir.z, hit.dir.x) : normalize(sub(p.pos, hit.src));
      if (p.dodgeCooldown <= 0) input.dodgePressed = true;
      // Le Sorcier, esquive en recharge, s'en sort par la Fuite de feu.
      else if (kit === 'sorcier' && p.flightCooldown <= 0 && p.mana >= p.spellCost(c.sorcier.flight.cost)) input.skillEPressed = true;
      if (!ranged || p.dodgeCooldown > 0) return input;
    }

    // Izanami : une pêche cueillie sur un pêcher mûr la repousse et l'expose. On va frapper l'arbre (ou on lui tire
    // dessus), sauf si elle est déjà repoussée.
    if (izanami && her && !her.repelled && p === w.player) {
      const ripe = w.peaches.filter((t) => t.ripe);
      const tree = ripe.length ? ripe.reduce((a, b) => (distance(a.pos, p.pos) <= distance(b.pos, p.pos) ? a : b)) : null;
      if (tree) {
        const toTree = sub(tree.pos, p.pos);
        const reach = ranged ? c.attack.range * 0.8 : c.attack.range * 0.7;
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
      if (kit === 'sorcier') {
        // Ses boules de feu se guident seules : il vise à côté d'elle, hors de son regard, et tire sans relâche.
        input.aim = add(p.pos, scale(side, Math.max(2, gap + target.radius)));
      } else if (!ranged && (wide || gap < 0.6)) {
        input.aim = add(p.pos, scale(side, Math.max(1, gap + target.radius)));
        input.aimGround = { ...input.aim };
        if (gap > (wide ? c.attack.range * 0.6 : 0.4)) input.move = toTarget;
        if (gap <= (wide ? c.attack.range * 0.85 : 0.6)) input.attackHeld = true;
        return input;
      }
      else if (this.averting) {
        // On détourne les yeux : on recule en visant ailleurs, et on frappe ce qui passe.
        input.aim = add(p.pos, scale(turn(toTarget, Math.PI / 2), 3));
        input.aimGround = { ...input.aim };
        input.move = gap < 4 ? normalize(sub(p.pos, target.pos)) : vec();
        return input;
      }
    }

    // Compétences.
    const hpRatio = p.hp / c.maxHp;
    if (kit === 'guerrier') {
      if (p.canSmash && near(c.smash.offset + c.smash.radius * 0.8).length >= 1) input.skillAPressed = true;
      else if (p.canBond && gap > 2.5 && gap < c.bond.range) input.skillEPressed = true;
      else if (this.greedy && p.canBond) input.skillEPressed = true;
      if (p.canFrenzy && (near(4).length >= 2 || target.boss || this.greedy)) input.skillRPressed = true;
    } else if (kit === 'sorcier') {
      // Le sceau tombe sur la cible dès qu'il est prêt ; le météore sur un boss ou une grappe. Le bouclier se lève
      // quand on le serre, et la Fuite de feu l'en sort.
      const s = c.sorcier;
      const can = (cost: number) => p.mana >= p.spellCost(cost);
      const crowd = near(s.meteor.radius, target.pos).length;
      if (p.meteorCooldown <= 0 && p.manaFull && gap < s.meteor.range && (target.boss || crowd >= 3 || this.greedy)) {
        input.skillRPressed = true;
        input.aimGround = { ...target.pos };
      } else if (p.sealCooldown <= 0 && can(s.seal.cost) && gap < s.seal.range) {
        input.signaturePressed = true;
        input.aimGround = { ...target.pos };
      }
      const boss = foes.find((e) => e.boss && distance(e.pos, p.pos) < 5);
      if (p.wardCooldown <= 0 && can(s.ward.cost) && (near(3).length >= 1 || boss || hpRatio < 0.6 || this.greedy)) input.skillAPressed = true;
      // Une Fuite qui revient vite (Masque d'Oublié) se joue sans attendre d'être cerné.
      const pressed = near(2);
      const eager = s.flight.cooldown <= 3.5;
      const cornered = pressed.length >= (eager ? 1 : 2) || pressed.some((e) => e.boss) || (pressed.length > 0 && hpRatio < 0.6);
      if (p.flightCooldown <= 0 && can(s.flight.cost) && cornered) {
        input.skillEPressed = true;
        input.move = normalize(sub(p.pos, pressed[0].pos));
        return input;
      }
    } else if (kit === 'lame') {
      // Frappe fantôme : sur une proie bien empoisonnée (3 charges), ou pour revenir au contact d'une proie lointaine.
      const stacks = (target as unknown as { poison: { stacks: number } | null }).poison?.stacks ?? 0;
      const ghost = c.blade.ghost;
      if (p.ghostCooldown <= 0 && gap < ghost.range && (stacks >= c.blade.poison.maxStacks || (gap > 3 && stacks >= 1))) {
        input.signaturePressed = true;
        input.aim = { ...target.pos };
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
      if (p.auraCooldown <= 0 && (hurt || this.greedy)) input.skillAPressed = true;
      if (p.hammerCooldown <= 0 && !w.hammerOutOf(p) && gap < c.paladin.hammer.range) input.skillEPressed = true;
      // Égide : sur lui quand il faiblit, retirée une fois remis (elle divise ses dégâts par deux).
      const shielded = p.aegisOn === p.id;
      if ((!shielded && hpRatio < 0.4) || (shielded && hpRatio > 0.8)) {
        input.skillRPressed = true;
        input.aim = { ...p.pos };
      }
    } else if (kit === 'rodeur') {
      const shelled = target.kind.startsWith('kappa') && peek(target).state?.kind !== 'stunned';
      if (p.netCooldown <= 0 && (shelled || near(2.5).length >= 1 || near(c.ranger.net.radius, target.pos).length >= 2)) input.skillAPressed = true;
      if (p.huntCooldown <= 0 && target.maxHp >= 30) input.skillEPressed = true;
      if (p.leapCooldown <= 0 && near(2).length >= 1) input.skillRPressed = true;
    }

    // Voie (sous-classe) : le bot s'en sert comme d'une compétence de classe, dès qu'il y a de quoi la rentabiliser.
    const voie = c.sousClasse;
    if (voie && p.voieReady) {
      const reach = Math.max(voie.range ?? 0, voie.radius) + 1;
      const crowd = near(reach).length;
      const worth = voie.kind === 'cri' ? crowd >= 1 : crowd >= (this.greedy ? 1 : 2) || target.boss;
      if (worth) {
        input.skillFPressed = true;
        input.aimGround = { ...target.pos };
      }
    }

    // Déplacement et attaque. Le Sorcier garde ses distances et lance ses salves.
    if (kit === 'sorcier') {
      const range = c.attack.range;
      const close = near(3);
      if (close.length) input.move = this.kite(close[0].pos);
      else if (gap > range - 1.5) input.move = toTarget;
      if (gap <= range) input.attackHeld = true;
      return input;
    }
    if (kit === 'rodeur') {
      const range = c.attack.range;
      const close = near(3.5);
      if (close.length) input.move = this.kite(close[0].pos);
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
    // Duel : un héros de mêlée rattrape un Rôdeur qui recule (il tire en marchant) par une esquive vers lui, comme le ferait un joueur.
    else if (this.rivalAware && w.duel && gap > c.attack.range + CHASE_GAP && p.dodgeCooldown <= 0 && this.shooter(target)) input.dodgePressed = true;
    return input;
  }

  /**
   * S'écarter de `from`. En duel (`rivalAware`), un tireur ne recule pas droit dans le mur : il tourne autour de
   * l'adversaire, et revient vers le centre à mesure qu'il approche du bord de l'arène ou de la zone.
   */
  private kite(from: Vec2): Vec2 {
    const p = this.hero;
    const away = normalize(sub(p.pos, from), vec(1, 0));
    const view = this.world.duel;
    if (!this.rivalAware || !view) return away;
    const room = Math.min(view.zone, KITE_ROOM);
    const toCenter = normalize(scale(p.pos, -1), away);
    let side = vec(-away.z, away.x);
    if (side.x * toCenter.x + side.z * toCenter.z < 0) side = scale(side, -1);
    const edge = Math.min(1, length(p.pos) / room);
    return normalize(add(add(scale(away, 1 - 0.8 * edge), scale(side, 0.5 + edge)), scale(toCenter, 0.6 * edge)), away);
  }

  /** Duel : vrai si `target` est le double d'un Rôdeur (le Sorcier, lui, a sa Fuite de feu pour garder ses distances). */
  private shooter(target: Enemy): boolean {
    if (!(target instanceof Rival)) return false;
    const kit = this.world.players.find((h) => h.id === target.owner)?.cfg.kit;
    return kit === 'rodeur';
  }

  /** Chaque attaque est vue ou non, une fois pour toutes. */
  private notices(attack: object): boolean {
    if (!this.seen.has(attack)) this.seen.set(attack, Math.random() < (this.human ? HUMAN.skill : SKILL));
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
        if (wrath.warning - s.t < this.react + 0.4 && distance(enemy.pos, p.pos) < wrath.radius + p.radius + 0.5 && this.notices(s)) out.push({ type: 'land', at: enemy.pos });
      }
      if (windup !== null && windup - s.t < this.react && distance(enemy.pos, p.pos) < range + p.radius + 0.7 && this.notices(s)) {
        out.push({ type: 'melee', src: enemy.pos });
      }
      // Charge annoncée (kappa, Jorōgumo araignée).
      if ((s.kind === 'telegraph' || s.kind === 'charge') && s.dir) {
        const rel = sub(p.pos, enemy.pos);
        const along = rel.x * s.dir.x + rel.z * s.dir.z;
        const across = Math.abs(rel.x * s.dir.z - rel.z * s.dir.x);
        const total = s.duration ?? (enemy.kind === 'jorogumo' ? cfg.spider.telegraph : enemy.kind === 'izanami' ? cfg.pursuit.telegraph : 0.7);
        const remain = s.kind === 'telegraph' ? total - s.t : 0;
        if (along > -0.5 && along < 9 && across < enemy.radius + p.radius + 0.5 && remain < this.react + 0.1 && this.notices(s)) {
          out.push({ type: 'charge', src: enemy.pos, dir: s.dir });
        }
      }
      // Chute du kasa-obake.
      if (enemy.kind === 'kasaObake' && (s.kind === 'hang' || s.kind === 'fall') && s.target) {
        const remain = s.kind === 'hang' ? cfg.hangTime - s.t + cfg.fallTime : cfg.fallTime - s.t;
        if (remain < this.react + 0.15 && distance(s.target, p.pos) < cfg.landRadius + p.radius + 0.3 && this.notices(s)) out.push({ type: 'land', at: s.target });
      }
    }
    for (const h of this.world.dangers) {
      if (h.cfg.warning - h.t < this.react + 0.15 && distance(h.pos, p.pos) < h.cfg.radius + p.radius + 0.3 && this.notices(h)) out.push({ type: 'land', at: h.pos });
    }
    if (this.rivalAware && this.world.duel) out.push(...this.duelThreats());
    return out;
  }

  /** Vrai une fois que le coup est vu depuis assez longtemps pour qu'on réagisse (voir `LATENCY`). */
  private spots(attack: object): boolean {
    const now = this.world.time;
    if (!this.spotted.has(attack)) this.spotted.set(attack, now);
    return now - (this.spotted.get(attack) ?? now) >= (this.human ? HUMAN_LATENCY : LATENCY) && this.notices(attack);
  }

  /** Duel : les coups de l'autre héros qui vont toucher celui-ci. */
  private duelThreats(): Threat[] {
    const w = this.world;
    const p = this.hero;
    const out: Threat[] = [];
    const foe = w.players.find((h) => h.id !== p.id && !h.dead);
    // Élan d'un coup de mêlée : un nouveau à chaque fois que l'adversaire repasse en « windup ».
    if (!foe || foe.pose !== 'windup') this.swing = null;
    else {
      this.swing ??= {};
      const c = foe.cfg;
      const reach = Math.max(c.attack.range, c.kit === 'guerrier' ? c.smash.offset + c.smash.radius : 0) + foe.radius + p.radius + 0.5;
      const to = normalize(sub(p.pos, foe.pos));
      const facing = foe.facing.x * to.x + foe.facing.z * to.z > 0.3;
      if (distance(foe.pos, p.pos) < reach && facing && this.spots(this.swing)) out.push({ type: 'melee', src: foe.pos });
    }
    for (const shot of w.projectiles) {
      if (shot.owner === p.id) continue;
      const rel = sub(p.pos, shot.pos);
      const along = rel.x * shot.dir.x + rel.z * shot.dir.z;
      const across = Math.abs(rel.x * shot.dir.z - rel.z * shot.dir.x);
      const coming = along > -0.3 && along < shot.range + 0.5 && across < shot.radius + p.radius + 0.4;
      if (coming && along / Math.max(1, shot.speed) < this.react + 0.25 && this.spots(shot)) out.push({ type: 'shot', src: shot.pos, dir: shot.dir });
    }
    for (const blast of (w as unknown as { blasts: BlastPeek[] }).blasts) {
      if (blast.owner === p.id) continue;
      if (blast.t < this.react + 0.35 && distance(blast.pos, p.pos) < blast.radius + p.radius + 0.3 && this.spots(blast)) out.push({ type: 'land', at: blast.pos });
    }
    return out;
  }
}
