import type { GameEvent } from '../game/types';
import type { World } from '../game/world';

const BANNER_TIME = 2.6;

/** Interface de combat en HTML par-dessus le canvas : barres, compétences, annonces de vague et du boss. */
export class Hud {
  private readonly hpFill: HTMLElement;
  private readonly rageBar: HTMLElement;
  private readonly rageFill: HTMLElement;
  private readonly dodgeCooldown: HTMLElement;
  private readonly smashSkill: HTMLElement;
  private readonly bondSkill: HTMLElement;
  private readonly bondCooldown: HTMLElement;
  private readonly frenzySkill: HTMLElement;
  private readonly frenzyCooldown: HTMLElement;
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
    this.dodgeCooldown = find('#skill-dodge .cooldown');
    this.smashSkill = find('#skill-smash');
    this.bondSkill = find('#skill-bond');
    this.bondCooldown = find('#skill-bond .cooldown');
    this.frenzySkill = find('#skill-frenzy');
    this.frenzyCooldown = find('#skill-frenzy .cooldown');
    this.banner = find('#banner');
    this.bannerStep = find('#banner small');
    this.bannerLabel = find('#banner span');
    this.hint = find('#hint');
    this.boss = find('#boss');
    this.bossName = find('#boss .name');
    this.bossFill = find('#boss .fill');
  }

  update(world: World, events: readonly GameEvent[], dt: number): void {
    const player = world.player;
    const cfg = player.cfg;
    this.hpFill.style.width = `${(player.hp / cfg.maxHp) * 100}%`;
    this.rageFill.style.width = `${(player.rage / cfg.rageMax) * 100}%`;
    this.rageBar.classList.toggle('ready', player.canSmash);
    this.smashSkill.classList.toggle('locked', !player.canSmash);
    this.dodgeCooldown.style.transform = `scaleX(${player.dodgeCooldown / cfg.dodge.cooldown})`;
    this.bondSkill.classList.toggle('locked', player.rage < cfg.bond.rageCost);
    this.bondCooldown.style.transform = `scaleX(${player.bondCooldown / cfg.bond.cooldown})`;
    this.frenzySkill.classList.toggle('locked', player.frenzy <= 0 && player.rage < cfg.frenzy.rageCost);
    this.frenzySkill.classList.toggle('active', player.frenzy > 0);
    this.frenzyCooldown.style.transform = `scaleX(${player.frenzy > 0 ? 0 : player.frenzyCooldown / cfg.frenzy.cooldown})`;

    const boss = world.enemies.find((e) => e.boss);
    this.boss.classList.toggle('visible', Boolean(boss));
    if (boss) this.bossFill.style.width = `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%`;

    for (const event of events) {
      if (event.type === 'wave') {
        this.announce(`Vague ${event.index + 1} / ${event.total}`, event.label, event.hint);
      } else if (event.type === 'bossPhase') {
        this.bossName.textContent = `Jorōgumo · ${event.label}`;
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

  reset(): void {
    this.hint.classList.remove('visible');
    this.banner.classList.remove('visible');
    this.bannerTimer = 0;
    this.bossName.textContent = 'Jorōgumo';
  }
}
