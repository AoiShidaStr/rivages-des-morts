import type { Kit } from '../game/config';
import type { ClassDef } from '../game/loadout';
import type { GameEvent } from '../game/types';
import type { WorldView } from '../game/view';
import { keyName, moveKeys, withKeys } from '../keys';
import { h } from '../ui/dom';

const BANNER_TIME = 2.6;
/** Au-delà de ce ping (ms), il s'affiche en couleur d'alerte. */
const LAGGY = 150;
const SKILL_KEYS = ['A', 'E', 'R'] as const;
/** La barre sous les PV : posture du Guerrier, mana du Sorcier, ombre de la Lame, garde du Paladin, arc du Rôdeur. */
const RESOURCE: Record<Kit, { label: string; style: string }> = {
  guerrier: { label: 'Posture', style: '' },
  sorcier: { label: 'Mana', style: 'mana' },
  lame: { label: 'Ombre', style: 'shadow' },
  paladin: { label: 'Garde', style: 'light' },
  rodeur: { label: 'Tir chargé', style: 'draw' },
};

/** « 1:07 » : durée d'une séance d'entraînement. */
function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface SkillSlot {
  root: HTMLElement;
  name: HTMLElement;
  cooldown: HTMLElement;
}

/** État d'une compétence à l'écran : recharge (de 1 à 0), indisponible, en cours. */
interface SkillView {
  cooldown: number;
  locked: boolean;
  active?: boolean;
}

/** Nom affiché sur la barre de chaque boss. */
const BOSS_TITLES: Record<string, string> = { jorogumo: 'Jorōgumo', izanami: 'Izanami' };

/** Interface de combat en HTML par-dessus le canvas : barres, compétences, annonces de vague et du boss. */
export class Hud {
  private readonly hpFill: HTMLElement;
  private readonly barrierFill: HTMLElement;
  /** Barre de ressource de la classe (voir `RESOURCE`). */
  private readonly rageBar: HTMLElement;
  private readonly rageFill: HTMLElement;
  private readonly rageLabel: HTMLElement;
  private readonly dodgeCooldown: HTMLElement;
  private readonly skills: Record<(typeof SKILL_KEYS)[number], SkillSlot>;
  /** La compétence de la voie (sous-classe), sur F : cachée tant que le héros n'a pas choisi sa voie. */
  private readonly voieSlot: SkillSlot;
  private readonly controls: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly bannerStep: HTMLElement;
  private readonly bannerLabel: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly boss: HTMLElement;
  private readonly bossName: HTMLElement;
  private readonly bossFill: HTMLElement;
  /** Jauge du regard d'Izanami, sous la barre du boss. */
  private readonly gaze: HTMLElement;
  private readonly gazeFill: HTMLElement;
  private readonly gazeLabel: HTMLElement;
  /** Coop : une petite barre de PV par allié, sous celle du héros. */
  private readonly allyList: HTMLElement;
  private allyBars: { fill: HTMLElement; name: HTMLElement; label: string }[] = [];
  /** Coop en ligne : ping de chaque allié, dans l'ordre des alliés (inconnu : rien d'affiché). */
  pings: (number | undefined)[] = [];
  /** Terrain d'entraînement : dégâts portés au mannequin, en haut de l'écran (voir `setTraining`). */
  private readonly training: HTMLElement;
  private readonly trainingDps: HTMLElement;
  private readonly trainingTotal: HTMLElement;
  private readonly trainingTime: HTMLElement;
  private bossTitle = 'Jorōgumo';
  private bossKind = '';
  private bannerTimer = 0;

  constructor(root: HTMLElement) {
    const find = (selector: string): HTMLElement => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`Élément d'interface introuvable : ${selector}`);
      return el;
    };
    this.hpFill = find('.bar.hp .fill');
    this.barrierFill = find('.bar.hp .barrier');
    this.rageBar = find('.bar.rage');
    this.rageFill = find('.bar.rage .fill');
    this.rageLabel = find('.bar.rage .label');
    this.dodgeCooldown = find('#skill-dodge .cooldown');
    const slot = (key: string): SkillSlot => {
      const id = `#skill-${key.toLowerCase()}`;
      return { root: find(id), name: find(`${id} .name`), cooldown: find(`${id} .cooldown`) };
    };
    this.skills = { A: slot('A'), E: slot('E'), R: slot('R') };
    this.voieSlot = slot('F');
    this.controls = find('.controls');
    this.banner = find('#banner');
    this.bannerStep = find('#banner small');
    this.bannerLabel = find('#banner span');
    this.hint = find('#hint');
    this.boss = find('#boss');
    this.bossName = find('#boss .name');
    this.bossFill = find('#boss .fill');
    this.gazeFill = h('div', { class: 'gaze-fill' });
    this.gazeLabel = h('span', { class: 'gaze-label' }, 'Son regard');
    this.gaze = h('div', { class: 'gaze', title: 'Plus tu la regardes, plus elle encaisse ; jauge pleine, sa colère éclate.' }, h('span', { class: 'gaze-eye' }, '目'), h('div', { class: 'gaze-bar' }, this.gazeFill), this.gazeLabel);
    this.boss.append(this.gaze);
    this.allyList = h('div', { class: 'allies' });
    find('.bar.hp').after(this.allyList);
    this.trainingDps = h('strong', { class: 'dps' });
    this.trainingTotal = h('span', { class: 'total' });
    this.trainingTime = h('span', { class: 'time' });
    this.training = h(
      'div',
      { class: 'training', title: 'Dégâts infligés au mannequin : la moyenne porte sur les dernières secondes de combat.' },
      h('span', { class: 'title' }, 'Entraînement'),
      this.trainingDps,
      this.trainingTotal,
      this.trainingTime,
    );
    find('#boss').after(this.training);
  }

  /**
   * Terrain d'entraînement : les dégâts portés au mannequin depuis l'entrée, leur moyenne des dernières secondes
   * et la durée de la séance. `null` retire le panneau (donjon ordinaire).
   */
  setTraining(stats: { total: number; dps: number; seconds: number } | null): void {
    this.training.classList.toggle('visible', stats !== null);
    if (!stats) return;
    const dps = `${Math.round(stats.dps)} DPS`;
    if (this.trainingDps.textContent !== dps) this.trainingDps.textContent = dps;
    const total = `${Math.round(stats.total)} dégâts`;
    if (this.trainingTotal.textContent !== total) this.trainingTotal.textContent = total;
    const time = clock(stats.seconds);
    if (this.trainingTime.textContent !== time) this.trainingTime.textContent = time;
  }

  /** Coop : noms des autres héros, dans l'ordre (aucun en solo). */
  setAllies(names: string[]): void {
    this.pings = [];
    this.allyBars = names.map((label) => ({ fill: h('div', { class: 'fill' }), name: h('span', { class: 'label' }, label), label }));
    this.allyList.replaceChildren(...this.allyBars.map((bar) => h('div', { class: 'bar ally' }, bar.fill, bar.name)));
  }

  /**
   * Noms des compétences, barre et rappel des commandes selon la classe du héros et le clavier du joueur. `voie` : la
   * compétence de la voie (sous-classe), affichée sur F quand le héros en a choisi une.
   */
  configure(cls: ClassDef, voie?: string): void {
    const name = (key: string) => cls.actives.find((a) => a.key === key)?.name ?? '';
    for (const key of SKILL_KEYS) {
      this.skills[key].name.textContent = name(key);
      this.skills[key].root.querySelector('kbd')!.textContent = keyName(key);
    }
    this.voieSlot.root.classList.toggle('hidden', !voie);
    this.voieSlot.name.textContent = voie ?? '';
    this.voieSlot.root.querySelector('kbd')!.textContent = keyName('F');
    for (const [kit, { style }] of Object.entries(RESOURCE)) {
      if (style) this.rageBar.classList.toggle(style, kit === cls.kit);
    }
    this.rageLabel.textContent = RESOURCE[cls.kit].label;
    const keys: [string, string][] = [
      [moveKeys(), 'se déplacer'],
      ['Souris', 'viser'],
      ['Clic gauche', cls.kit === 'rodeur' ? 'tirer' : cls.kit === 'sorcier' ? 'boules de feu' : 'frapper'],
      ['Clic droit', name('Clic droit').toLowerCase()],
      ['Espace', 'esquiver'],
      ...SKILL_KEYS.map((key): [string, string] => [keyName(key), name(key).toLowerCase()]),
      ...(voie ? [[keyName('F'), voie.toLowerCase()] as [string, string]] : []),
    ];
    this.controls.replaceChildren(...keys.flatMap(([key, label], i) => [i ? ' · ' : '', h('kbd', {}, key), ` ${label}`]));
  }

  update(world: WorldView, events: readonly GameEvent[], dt: number): void {
    const player = world.player;
    const cfg = player.cfg;
    this.hpFill.style.width = `${(player.hp / cfg.maxHp) * 100}%`;
    // Le bouclier prolonge la barre après les PV (sans dépasser le bout).
    const shield = Math.min(player.barrier, cfg.maxHp - Math.min(player.hp, cfg.maxHp * 0.9));
    this.barrierFill.style.left = `${(Math.min(player.hp, cfg.maxHp * 0.9) / cfg.maxHp) * 100}%`;
    this.barrierFill.style.width = `${(Math.max(0, shield) / cfg.maxHp) * 100}%`;
    const others = world.players.filter((hero) => hero !== player);
    this.allyBars.forEach((bar, i) => {
      const hero = others[i];
      if (!hero) return;
      bar.fill.style.width = `${(Math.max(0, hero.hp) / hero.cfg.maxHp) * 100}%`;
      const ping = this.pings[i];
      bar.name.textContent = `${bar.label}${hero.dead ? ' · à terre' : ''}${ping ? ` · ${Math.round(ping)} ms` : ''}`;
      bar.name.classList.toggle('lag', (ping ?? 0) > LAGGY);
    });
    this.dodgeCooldown.style.transform = `scaleX(${player.dodgeCooldown / cfg.dodge.cooldown})`;
    let views: SkillView[];
    let fill = 0;
    let ready = false;
    let label = RESOURCE[cfg.kit].label;
    if (cfg.kit === 'sorcier') {
      // Le mana ; la barre brille quand le sceau (clic droit) est prêt. Un sort trop cher est grisé.
      const s = cfg.sorcier;
      const perks = cfg.perks ?? {};
      const cost = (base: number) => base * (perks.freeSpells && player.hp < cfg.maxHp * perks.freeSpells ? 0 : (perks.manaCost ?? 1));
      fill = player.mana / s.mana.max;
      ready = player.sealCooldown <= 0 && player.mana >= cost(s.seal.cost);
      label = `Mana ${Math.floor(player.mana)} / ${Math.round(s.mana.max)}`;
      views = [
        { cooldown: player.ward > 0 ? 0 : player.wardCooldown / s.ward.cooldown, locked: player.mana < cost(s.ward.cost), active: player.ward > 0 },
        { cooldown: player.flightCooldown / s.flight.cooldown, locked: player.mana < cost(s.flight.cost) },
        { cooldown: player.meteorCooldown / s.meteor.cooldown, locked: player.mana < s.mana.max - 0.5 },
      ];
    } else if (cfg.kit === 'lame') {
      // Frappe fantôme : la barre se remplit avec sa recharge ; invisible, la barre le dit.
      const b = cfg.blade;
      fill = 1 - player.ghostCooldown / b.ghost.cooldown;
      ready = player.ghostCooldown <= 0;
      label = player.hidden > 0 ? 'Invisible' : ready ? 'Frappe fantôme' : 'Fantôme…';
      if (player.combo > 0) label += ` · Combo ×${player.combo}`;
      views = [
        { cooldown: player.deathMarkCooldown / b.deathMark.cooldown, locked: false },
        { cooldown: player.hidden > 0 ? 0 : player.smokeCooldown / b.smoke.cooldown, locked: false, active: player.hidden > 0 },
        { cooldown: player.danceCooldown / b.dance.cooldown, locked: false },
      ];
    } else if (cfg.kit === 'paladin') {
      // Jauge de garde : chaque coup bloqué l'use ; vide, la garde se brise un moment.
      const p = cfg.paladin;
      fill = player.guardBroken > 0 ? 0 : player.guardLeft / p.guard.max;
      ready = fill >= 1;
      const ferveur = Math.round((player.fervor / p.judgement.max) * 100);
      const egide = player.aegisOn === player.id ? ' · Égide' : '';
      label = player.guardBroken > 0 ? 'Garde brisée' : ferveur >= 100 ? `Jugement prêt${egide}` : `Garde · Ferveur ${ferveur} %${egide}`;
      views = [
        { cooldown: player.aura > 0 ? 0 : player.auraCooldown / p.aura.cooldown, locked: false, active: player.aura > 0 },
        { cooldown: player.hammerCooldown / p.hammer.cooldown, locked: world.hammerOut },
        // Égide : allumée tant qu'elle est posée, sur soi ou sur un allié ; la recharge empêche seulement de la déplacer.
        { cooldown: player.aegisCooldown / p.aegis.cooldown, locked: false, active: player.aegisOn !== null },
      ];
    } else if (cfg.kit === 'rodeur') {
      const r = cfg.ranger;
      fill = player.drawProgress;
      ready = fill >= 1;
      views = [
        { cooldown: player.netCooldown / r.net.cooldown, locked: false },
        { cooldown: player.huntCooldown / r.huntMark.cooldown, locked: false },
        { cooldown: player.leapCooldown / r.leap.cooldown, locked: false },
      ];
    } else {
      // Guerrier : plus de rage ; la barre montre la posture (pleine en Offensive).
      fill = player.stance === 'offensive' ? 1 : 0.5;
      ready = player.stance === 'offensive';
      label = player.stance === 'offensive' ? 'Posture offensive' : 'Posture de garde';
      views = [
        { cooldown: player.smashCooldown / cfg.smash.cooldown, locked: false },
        { cooldown: player.bondCooldown / cfg.bond.cooldown, locked: false },
        {
          cooldown: player.frenzy > 0 ? 0 : player.frenzyCooldown / cfg.frenzy.cooldown,
          locked: false,
          active: player.frenzy > 0,
        },
      ];
    }
    this.rageFill.style.width = `${fill * 100}%`;
    this.rageBar.classList.toggle('ready', ready);
    if (this.rageLabel.textContent !== label) this.rageLabel.textContent = label;
    SKILL_KEYS.forEach((key, i) => {
      const slot = this.skills[key];
      const view = views[i];
      slot.root.classList.toggle('locked', view.locked);
      slot.root.classList.toggle('active', Boolean(view.active));
      slot.cooldown.style.transform = `scaleX(${view.cooldown})`;
    });
    // La voie (sous-classe) : sa recharge se lit comme celle des autres compétences, sur sa propre touche.
    const voie = cfg.sousClasse;
    if (voie) {
      this.voieSlot.root.classList.toggle('hidden', false);
      this.voieSlot.root.classList.toggle('active', player.voieTime > 0);
      this.voieSlot.cooldown.style.transform = `scaleX(${player.voieCooldown / voie.cooldown})`;
    }

    // Deux boss à la fois (donjon infini) : la barre suit celui qui est le plus entamé.
    const bosses = world.enemies.filter((e) => e.boss && e.hp > 0);
    const boss = bosses.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? world.enemies.find((e) => e.boss);
    if (boss && BOSS_TITLES[boss.kind] && this.bossKind !== boss.kind) {
      this.bossKind = boss.kind;
      this.bossTitle = BOSS_TITLES[boss.kind] ?? this.bossTitle;
      this.bossName.textContent = `${this.bossTitle} · niv. ${world.cfg.difficulty?.level ?? 1}`;
    }
    this.boss.classList.toggle('visible', Boolean(boss));
    if (boss) this.bossFill.style.width = `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%`;
    // Izanami : la jauge de son regard, et l'alerte quand le héros la regarde.
    const izanami = boss?.kind === 'izanami' ? boss : null;
    this.gaze.classList.toggle('visible', izanami !== null);
    if (izanami) {
      const gaze = izanami.gaze ?? 0;
      this.gazeFill.style.width = `${gaze * 100}%`;
      this.gaze.classList.toggle('watched', Boolean(izanami.watched));
      this.gaze.classList.toggle('full', gaze > 0.75);
      const label = izanami.repelled ? 'Repoussée par la pêche !' : izanami.watched ? 'Elle te voit…' : 'Son regard';
      if (this.gazeLabel.textContent !== label) this.gazeLabel.textContent = label;
    }

    for (const event of events) {
      if (event.type === 'wave') {
        const level = world.cfg.difficulty?.level ?? 1;
        this.announce(event.step ?? `Niveau ${level} · Vague ${event.index + 1} / ${event.total}`, event.label, event.hint);
      } else if (event.type === 'bossPhase') {
        this.bossName.textContent = `${this.bossTitle} · niv. ${world.cfg.difficulty?.level ?? 1} · ${event.label}`;
        this.announce(`Phase ${event.phase} / 3`, event.label, event.hint);
      } else if (event.type === 'end') {
        this.hint.classList.remove('visible');
      }
    }

    this.bannerTimer -= dt;
    if (this.bannerTimer <= 0) this.banner.classList.remove('visible');
  }

  private announce(step: string, label: string, hint?: string): void {
    this.bannerStep.textContent = step;
    this.bannerLabel.textContent = label;
    this.banner.classList.add('visible');
    this.bannerTimer = BANNER_TIME;
    this.hint.textContent = withKeys(hint ?? '');
    this.hint.classList.toggle('visible', Boolean(hint));
  }

  /** Nouvelle descente : niveau du donjon et nom de son boss. */
  reset(level = 1, boss = 'Jorōgumo'): void {
    this.hint.classList.remove('visible');
    this.banner.classList.remove('visible');
    this.bannerTimer = 0;
    this.bossTitle = boss;
    this.bossKind = '';
    this.bossName.textContent = `${boss} · niv. ${level}`;
  }
}
