import type { ClassDef } from '../game/loadout';
import type { GameEvent } from '../game/types';
import type { World } from '../game/world';
import { h } from '../ui/dom';

const BANNER_TIME = 2.6;
const SKILL_KEYS = ['A', 'E', 'R'] as const;

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
  /** Rage du Guerrier, ou âmes liées de l'Invocateur. */
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
  }

  /** Noms des compétences, barre et rappel des commandes selon la classe du héros. */
  configure(cls: ClassDef): void {
    const name = (key: string) => cls.actives.find((a) => a.key === key)?.name ?? '';
    for (const key of SKILL_KEYS) this.skills[key].name.textContent = name(key);
    this.rageBar.classList.toggle('souls', cls.kit === 'invocateur');
    this.rageLabel.textContent = cls.kit === 'invocateur' ? 'Âmes' : 'Rage';
    const keys: [string, string][] = [
      ['ZQSD', 'se déplacer'],
      ['Souris', 'viser'],
      ['Clic gauche', 'frapper'],
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
    if (cfg.kit === 'invocateur') {
      const s = cfg.summon;
      const count = world.summons.length;
      const none = count === 0;
      this.rageFill.style.width = `${(count / Math.max(1, s.max)) * 100}%`;
      this.rageBar.classList.toggle('ready', world.soulInReach);
      const label = `Âmes ${count} / ${s.max}`;
      if (this.rageLabel.textContent !== label) this.rageLabel.textContent = label;
      views = [
        { cooldown: player.recallCooldown / s.recall.cooldown, locked: none },
        { cooldown: player.sacrificeCooldown / s.sacrifice.cooldown, locked: none },
        { cooldown: world.choir > 0 ? 0 : player.choirCooldown / s.choir.cooldown, locked: none && world.choir <= 0, active: world.choir > 0 },
      ];
    } else {
      this.rageFill.style.width = `${(player.rage / cfg.rageMax) * 100}%`;
      this.rageBar.classList.toggle('ready', player.canSmash);
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

    for (const event of events) {
      if (event.type === 'wave') {
        const level = world.cfg.difficulty?.level ?? 1;
        this.announce(`Niveau ${level} · Vague ${event.index + 1} / ${event.total}`, event.label, event.hint);
      } else if (event.type === 'bossPhase') {
        this.bossName.textContent = `Jorōgumo · niv. ${world.cfg.difficulty?.level ?? 1} · ${event.label}`;
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

  reset(level = 1): void {
    this.hint.classList.remove('visible');
    this.banner.classList.remove('visible');
    this.bannerTimer = 0;
    this.bossName.textContent = `Jorōgumo · niv. ${level}`;
  }
}
