import type { GameEvent } from '../game/types';
import type { World } from '../game/world';

const BANNER_TIME = 2.6;

/** Interface en HTML par-dessus le canvas : barres, compétences, annonces de vague et écran de fin. */
export class Hud {
  private readonly hpFill: HTMLElement;
  private readonly rageBar: HTMLElement;
  private readonly rageFill: HTMLElement;
  private readonly dodgeCooldown: HTMLElement;
  private readonly smashSkill: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly bannerStep: HTMLElement;
  private readonly bannerLabel: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly end: HTMLElement;
  private readonly endTitle: HTMLElement;
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
    this.banner = find('#banner');
    this.bannerStep = find('#banner small');
    this.bannerLabel = find('#banner span');
    this.hint = find('#hint');
    this.end = find('#end');
    this.endTitle = find('#end h1');
  }

  update(world: World, events: readonly GameEvent[], dt: number): void {
    const player = world.player;
    const cfg = player.cfg;
    this.hpFill.style.width = `${(player.hp / cfg.maxHp) * 100}%`;
    this.rageFill.style.width = `${(player.rage / cfg.rageMax) * 100}%`;
    this.rageBar.classList.toggle('ready', player.canSmash);
    this.smashSkill.classList.toggle('locked', !player.canSmash);
    this.dodgeCooldown.style.transform = `scaleX(${player.dodgeCooldown / cfg.dodge.cooldown})`;

    for (const event of events) {
      if (event.type === 'wave') {
        this.bannerStep.textContent = `Vague ${event.index + 1} / ${event.total}`;
        this.bannerLabel.textContent = event.label;
        this.banner.classList.add('visible');
        this.bannerTimer = BANNER_TIME;
        this.hint.textContent = event.hint ?? '';
        this.hint.classList.toggle('visible', Boolean(event.hint));
      } else if (event.type === 'end') {
        this.endTitle.textContent = event.outcome === 'victory' ? 'Les rizières sont apaisées' : 'Ton âme vacille…';
        this.end.classList.add('visible');
        this.hint.classList.remove('visible');
      }
    }

    this.bannerTimer -= dt;
    if (this.bannerTimer <= 0) this.banner.classList.remove('visible');
  }

  reset(): void {
    this.end.classList.remove('visible');
    this.hint.classList.remove('visible');
    this.banner.classList.remove('visible');
    this.bannerTimer = 0;
  }
}
