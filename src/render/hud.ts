import type { Kit } from '../game/config';
import { Izanami } from '../game/enemies';
import type { ClassDef } from '../game/loadout';
import type { GameEvent } from '../game/types';
import type { World } from '../game/world';
import { h } from '../ui/dom';

const BANNER_TIME = 2.6;
const SKILL_KEYS = ['A', 'E', 'R'] as const;
/** La barre sous les PV : rage du Guerrier, âmes de l'Invocateur, ombre de la Lame, allié du Paladin, arc du Rôdeur. */
const RESOURCE: Record<Kit, { label: string; style: string }> = {
  guerrier: { label: 'Rage', style: '' },
  invocateur: { label: 'Âmes', style: 'souls' },
  lame: { label: 'Ombre', style: 'shadow' },
  paladin: { label: 'Allié', style: 'light' },
  rodeur: { label: 'Tir chargé', style: 'draw' },
};

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

/** Interface de combat en HTML par-dessus le canvas : barres, compétences, annonces de vague et du boss. */
export class Hud {
  private readonly hpFill: HTMLElement;
  /** Barre de ressource de la classe (voir `RESOURCE`). */
  private readonly rageBar: HTMLElement;
  private readonly rageFill: HTMLElement;
  private readonly rageLabel: HTMLElement;
  private readonly dodgeCooldown: HTMLElement;
  private readonly skills: Record<(typeof SKILL_KEYS)[number], SkillSlot>;
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
  private bossTitle = 'Jorōgumo';
  private bannerTimer = 0;

  constructor(root: HTMLElement) {
    const find = (selector: string): HTMLElement => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(`Élément d'interface introuvable : ${selector}`);
      return el;
    };
    this.hpFill = find('.bar.hp .fill');
    this.rageBar = find('.bar.rage');
    this.rageFill = find('.bar.rage .fill');
    this.rageLabel = find('.bar.rage .label');
    this.dodgeCooldown = find('#skill-dodge .cooldown');
    const slot = (key: string): SkillSlot => {
      const id = `#skill-${key.toLowerCase()}`;
      return { root: find(id), name: find(`${id} .name`), cooldown: find(`${id} .cooldown`) };
    };
    this.skills = { A: slot('A'), E: slot('E'), R: slot('R') };
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
  }

  /** Noms des compétences, barre et rappel des commandes selon la classe du héros. */
  configure(cls: ClassDef): void {
    const name = (key: string) => cls.actives.find((a) => a.key === key)?.name ?? '';
    for (const key of SKILL_KEYS) this.skills[key].name.textContent = name(key);
    for (const [kit, { style }] of Object.entries(RESOURCE)) {
      if (style) this.rageBar.classList.toggle(style, kit === cls.kit);
    }
    this.rageLabel.textContent = RESOURCE[cls.kit].label;
    const keys: [string, string][] = [
      ['ZQSD', 'se déplacer'],
      ['Souris', 'viser'],
      ['Clic gauche', cls.kit === 'rodeur' ? 'tirer' : 'frapper'],
      ['Clic droit', name('Clic droit').toLowerCase()],
      ['Espace', 'esquiver'],
      ...SKILL_KEYS.map((key): [string, string] => [key, name(key).toLowerCase()]),
    ];
    this.controls.replaceChildren(...keys.flatMap(([key, label], i) => [i ? ' · ' : '', h('kbd', {}, key), ` ${label}`]));
  }

  update(world: World, events: readonly GameEvent[], dt: number): void {
    const player = world.player;
    const cfg = player.cfg;
    this.hpFill.style.width = `${(player.hp / cfg.maxHp) * 100}%`;
    this.dodgeCooldown.style.transform = `scaleX(${player.dodgeCooldown / cfg.dodge.cooldown})`;
    let views: SkillView[];
    let fill = 0;
    let ready = false;
    let label = RESOURCE[cfg.kit].label;
    if (cfg.kit === 'invocateur') {
      const s = cfg.summon;
      const count = world.summons.length;
      const none = count === 0;
      fill = count / Math.max(1, s.max);
      ready = world.soulInReach;
      label = `Âmes ${count} / ${s.max}`;
      views = [
        { cooldown: player.recallCooldown / s.recall.cooldown, locked: none },
        { cooldown: player.sacrificeCooldown / s.sacrifice.cooldown, locked: none },
        { cooldown: world.choir > 0 ? 0 : player.choirCooldown / s.choir.cooldown, locked: none && world.choir <= 0, active: world.choir > 0 },
      ];
    } else if (cfg.kit === 'lame') {
      // Charges du Pas de l'ombre, la suivante se remplit ; invisible, la barre le dit.
      const b = cfg.blade;
      const max = b.shadowDash.charges;
      const refill = player.dashCharges < max ? 1 - player.dashRecharge / b.shadowDash.cooldown : 0;
      fill = (player.dashCharges + refill) / max;
      ready = player.dashCharges > 0;
      label = player.hidden > 0 ? 'Invisible' : max > 1 ? `Ombre ${player.dashCharges} / ${max}` : 'Ombre';
      views = [
        { cooldown: player.deathMarkCooldown / b.deathMark.cooldown, locked: false },
        { cooldown: player.hidden > 0 ? 0 : player.smokeCooldown / b.smoke.cooldown, locked: false, active: player.hidden > 0 },
        { cooldown: player.danceCooldown / b.dance.cooldown, locked: false },
      ];
    } else if (cfg.kit === 'paladin') {
      // Vigueur de l'allié relevé ; la barre luit quand Relever a quelqu'un à relever.
      const p = cfg.paladin;
      const ally = world.summons.find((s) => s.holy);
      fill = ally?.vigor ?? 0;
      ready = world.graveInReach;
      label = ally ? `Allié relevé${world.summons.length > 1 ? ` ×${world.summons.length}` : ''}` : 'Aucun allié';
      views = [
        { cooldown: world.aura > 0 ? 0 : player.auraCooldown / p.aura.cooldown, locked: false, active: world.aura > 0 },
        { cooldown: player.hammerCooldown / p.hammer.cooldown, locked: world.hammerOut },
        { cooldown: player.raiseCooldown / p.raise.cooldown, locked: !world.graveInReach },
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
      fill = player.rage / cfg.rageMax;
      ready = player.canSmash;
      views = [
        { cooldown: 0, locked: !player.canSmash },
        { cooldown: player.bondCooldown / cfg.bond.cooldown, locked: player.rage < cfg.bond.rageCost },
        {
          cooldown: player.frenzy > 0 ? 0 : player.frenzyCooldown / cfg.frenzy.cooldown,
          locked: player.frenzy <= 0 && player.rage < cfg.frenzy.rageCost,
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

    const boss = world.enemies.find((e) => e.boss);
    this.boss.classList.toggle('visible', Boolean(boss));
    if (boss) this.bossFill.style.width = `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%`;
    // Izanami : la jauge de son regard, et l'alerte quand le héros la regarde.
    const izanami = boss instanceof Izanami ? boss : null;
    this.gaze.classList.toggle('visible', izanami !== null);
    if (izanami) {
      this.gazeFill.style.width = `${izanami.gaze * 100}%`;
      this.gaze.classList.toggle('watched', izanami.watched);
      this.gaze.classList.toggle('full', izanami.gaze > 0.75);
      const label = izanami.repelled ? 'Repoussée par la pêche !' : izanami.watched ? 'Elle te voit…' : 'Son regard';
      if (this.gazeLabel.textContent !== label) this.gazeLabel.textContent = label;
    }

    for (const event of events) {
      if (event.type === 'wave') {
        const level = world.cfg.difficulty?.level ?? 1;
        this.announce(`Niveau ${level} · Vague ${event.index + 1} / ${event.total}`, event.label, event.hint);
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
    this.hint.textContent = hint ?? '';
    this.hint.classList.toggle('visible', Boolean(hint));
  }

  /** Nouvelle descente : niveau du donjon et nom de son boss. */
  reset(level = 1, boss = 'Jorōgumo'): void {
    this.hint.classList.remove('visible');
    this.banner.classList.remove('visible');
    this.bannerTimer = 0;
    this.bossTitle = boss;
    this.bossName.textContent = `${boss} · niv. ${level}`;
  }
}
